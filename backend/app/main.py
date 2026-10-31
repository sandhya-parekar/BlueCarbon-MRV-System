import io
import os
import json
import logging
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, db_manager
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_role
)
from app.models import (
    UserCreate, UserLogin, UserResponse, Token,
    TreeMeasurementCreate, DatasetStatsResponse, DataValidationSummary,
    BiomassSummaryResponse, UncertaintyAssessmentResponse,
    PrioritizationSummaryResponse, ComparativeAnalysisResponse,
    VerificationDecisionRequest, RegisterBiomassOnChainRequest,
    BlockchainStatusResponse
)
from app.services.biomass_service import (
    calculate_tree_agb_chave, vectorize_calculate_agb,
    aggregate_plot_biomass, compute_regional_and_type_summary
)
from app.services.uncertainty_service import (
    assess_uncertainty_all_plots, run_bootstrap_for_plot, run_wood_density_sensitivity
)
from app.services.prioritization_service import generate_verification_prioritization
from app.services.comparative_service import run_comparative_verification_analysis
from app.services.blockchain_service import blockchain_service
from app.services.report_service import generate_csv_report, generate_pdf_report
from app.seed_data import seed_initial_data

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("bluecarbon_mrv.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect DB and seed initial data
    await connect_to_mongo()
    await seed_initial_data()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="An Uncertainty-Aware Verification Prioritization Framework for Blockchain-Based Blue Carbon MRV Systems",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to fetch current trees DataFrame
async def get_trees_dataframe() -> pd.DataFrame:
    if db_manager.is_connected and db_manager.db is not None:
        cursor = db_manager.db.tree_measurements.find({})
        records = await cursor.to_list(length=10000)
    else:
        records = db_manager.memory_store["tree_measurements"]
        
    if not records:
        return pd.DataFrame()
    return pd.DataFrame(records)

# Helper to fetch current plots DataFrame
async def get_plots_dataframe() -> pd.DataFrame:
    if db_manager.is_connected and db_manager.db is not None:
        cursor = db_manager.db.plot_biomass.find({})
        records = await cursor.to_list(length=2000)
    else:
        records = list(db_manager.memory_store["plot_biomass"].values())
        
    if not records:
        return pd.DataFrame()
    return pd.DataFrame(records)


# ==============================================================================
# MODULE 1: AUTHENTICATION & USER MANAGEMENT
# ==============================================================================

@app.post(f"{settings.API_V1_STR}/auth/register", response_model=UserResponse)
async def register(user_in: UserCreate):
    if db_manager.is_connected and db_manager.db is not None:
        existing = await db_manager.db.users.find_one({"email": user_in.email})
        if existing:
            raise HTTPException(status_code=400, detail="A user with this email already exists.")
        
        user_doc = {
            "name": user_in.name,
            "email": user_in.email,
            "hashed_password": get_password_hash(user_in.password),
            "role": user_in.role,
            "organization": user_in.organization,
            "created_at": pd.Timestamp.now().isoformat()
        }
        res = await db_manager.db.users.insert_one(user_doc)
        user_id = str(res.inserted_id)
    else:
        if user_in.email in db_manager.memory_store["users"]:
            raise HTTPException(status_code=400, detail="A user with this email already exists.")
        user_id = f"mem_{len(db_manager.memory_store['users']) + 1}"
        user_doc = {
            "name": user_in.name,
            "email": user_in.email,
            "hashed_password": get_password_hash(user_in.password),
            "role": user_in.role,
            "organization": user_in.organization,
            "created_at": pd.Timestamp.now().isoformat(),
            "id": user_id
        }
        db_manager.memory_store["users"][user_in.email] = user_doc

    return UserResponse(
        id=user_id,
        name=user_in.name,
        email=user_in.email,
        role=user_in.role,
        organization=user_in.organization
    )

@app.post(f"{settings.API_V1_STR}/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = None
    if db_manager.is_connected and db_manager.db is not None:
        user = await db_manager.db.users.find_one({"email": login_data.email})
    else:
        user = db_manager.memory_store["users"].get(login_data.email)
        
    if not user or not verify_password(login_data.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    user_id = str(user.get("_id", user.get("id", user["email"])))
    token = create_access_token(data={"sub": user["email"], "role": user["role"], "id": user_id})
    
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            name=user["name"],
            email=user["email"],
            role=user["role"],
            organization=user.get("organization")
        )
    )

@app.get(f"{settings.API_V1_STR}/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        organization=current_user.get("organization")
    )


# ==============================================================================
# MODULE 2: ENVIRONMENTAL DATA MANAGEMENT
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/data/trees")
async def get_trees(
    plot_id: Optional[str] = None,
    species: Optional[str] = None,
    region: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500)
):
    df = await get_trees_dataframe()
    if df.empty:
        return {"total": 0, "trees": []}
        
    if plot_id:
        df = df[df['plot_id'].str.upper() == plot_id.upper()]
    if species:
        df = df[df['species'].str.lower() == species.lower()]
    if region:
        df = df[df['region'].str.lower() == region.lower()]
        
    total = len(df)
    page_df = df.iloc[skip : skip + limit]
    
    # Handle NaN values for JSON output
    clean_records = page_df.replace({np.nan: None}).to_dict(orient="records")
    for r in clean_records:
        if "_id" in r:
            r["_id"] = str(r["_id"])
            
    return {"total": total, "trees": clean_records}

@app.post(f"{settings.API_V1_STR}/data/trees")
async def add_tree_measurement(
    tree: TreeMeasurementCreate,
    current_user: dict = Depends(require_role(["Admin", "Researcher"]))
):
    # Calculate AGB using Chave et al. (2014)
    agb_val = calculate_tree_agb_chave(tree.wood_density_g_cm3, tree.dbh_cm, tree.height_m)
    tree_dict = tree.model_dump()
    tree_dict["agb_kg"] = round(agb_val, 2)
    tree_dict["measurement_quality_flag"] = "VALID"
    tree_dict["created_at"] = pd.Timestamp.now().isoformat()
    tree_dict["recorded_by"] = current_user["email"]
    
    if db_manager.is_connected and db_manager.db is not None:
        res = await db_manager.db.tree_measurements.insert_one(tree_dict)
        tree_dict["_id"] = str(res.inserted_id)
    else:
        tree_dict["_id"] = f"mem_tree_{len(db_manager.memory_store['tree_measurements']) + 1}"
        db_manager.memory_store["tree_measurements"].append(tree_dict)
        
    return {"message": "Tree measurement added successfully", "tree": tree_dict}

@app.post(f"{settings.API_V1_STR}/data/upload-csv")
async def upload_csv_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["Admin", "Researcher"]))
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Verify mandatory columns
        required_cols = {"tree_id", "plot_id", "species", "dbh_cm", "height_m", "wood_density_g_cm3"}
        missing_cols = required_cols - set(df.columns)
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Missing required columns in CSV: {list(missing_cols)}")
            
        # Defaults for optional columns
        if 'region' not in df.columns:
            df['region'] = 'Sundarbans Delta'
        if 'plot_type' not in df.columns:
            df['plot_type'] = 'Fringe'
        if 'latitude' not in df.columns:
            df['latitude'] = 21.94
        if 'longitude' not in df.columns:
            df['longitude'] = 88.89
        if 'measurement_quality_flag' not in df.columns:
            df['measurement_quality_flag'] = 'VALID'
            
        # Clean and calculate AGB
        df = vectorize_calculate_agb(df)
        records = df.replace({np.nan: None}).to_dict(orient="records")
        
        if db_manager.is_connected and db_manager.db is not None:
            await db_manager.db.tree_measurements.delete_many({})
            await db_manager.db.tree_measurements.insert_many(records)
        else:
            db_manager.memory_store["tree_measurements"] = records
            
        # Re-compute plot biomass & uncertainty
        uncertainty_df = assess_uncertainty_all_plots(df, n_bootstraps=2000)
        prioritized_df = generate_verification_prioritization(uncertainty_df, df)
        plot_stats = aggregate_plot_biomass(df)
        merged = prioritized_df.merge(
            plot_stats[['plot_id', 'latitude', 'longitude', 'mean_dbh_cm', 'mean_height_m', 'mean_wood_density', 'agb_density_mg_ha']],
            on='plot_id',
            how='left'
        )
        plot_records = merged.replace({np.nan: None}).to_dict(orient="records")
        
        if db_manager.is_connected and db_manager.db is not None:
            await db_manager.db.plot_biomass.delete_many({})
            await db_manager.db.plot_biomass.insert_many(plot_records)
        else:
            db_manager.memory_store["plot_biomass"] = {r["plot_id"]: r for r in plot_records}
            
        return {
            "message": f"Successfully parsed and ingested {len(records)} tree records across {len(plot_records)} plots.",
            "total_trees": len(records),
            "total_plots": len(plot_records)
        }
    except Exception as e:
        logger.exception("CSV upload failed")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")

@app.get(f"{settings.API_V1_STR}/data/stats", response_model=DatasetStatsResponse)
async def get_dataset_stats():
    df = await get_trees_dataframe()
    if df.empty:
        return DatasetStatsResponse(
            total_trees=0, total_plots=0, species_distribution={}, regional_distribution={},
            plot_type_distribution={}, mean_dbh_cm=0.0, mean_height_m=0.0,
            mean_wood_density=0.0, data_quality_issues_detected=0
        )
        
    species_dist = df['species'].value_counts().to_dict()
    reg_dist = df['region'].value_counts().to_dict() if 'region' in df.columns else {}
    type_dist = df['plot_type'].value_counts().to_dict() if 'plot_type' in df.columns else {}
    
    dq_issues = int(
        df[['dbh_cm', 'height_m', 'wood_density_g_cm3']].isna().sum().sum() +
        (df.get('measurement_quality_flag', pd.Series()) != 'VALID').sum()
    )
    
    return DatasetStatsResponse(
        total_trees=len(df),
        total_plots=int(df['plot_id'].nunique()),
        species_distribution=species_dist,
        regional_distribution=reg_dist,
        plot_type_distribution=type_dist,
        mean_dbh_cm=round(float(df['dbh_cm'].dropna().mean()), 2),
        mean_height_m=round(float(df['height_m'].dropna().mean()), 2),
        mean_wood_density=round(float(df['wood_density_g_cm3'].dropna().mean()), 3),
        data_quality_issues_detected=dq_issues
    )

@app.post(f"{settings.API_V1_STR}/data/clean-and-validate", response_model=DataValidationSummary)
async def clean_and_validate_dataset(
    current_user: dict = Depends(require_role(["Admin", "Researcher"]))
):
    df = await get_trees_dataframe()
    if df.empty:
        raise HTTPException(status_code=400, detail="No dataset loaded to validate.")
        
    initial_rows = len(df)
    missing_cnt = int(df[['dbh_cm', 'height_m', 'wood_density_g_cm3']].isna().sum().sum())
    duplicate_cnt = int(df.duplicated(subset=['tree_id']).sum())
    
    # Impute missing with species mean or median
    species_means = df.groupby('species')[['dbh_cm', 'height_m', 'wood_density_g_cm3']].transform('median')
    df['dbh_cm'] = df['dbh_cm'].fillna(species_means['dbh_cm']).fillna(20.0)
    df['height_m'] = df['height_m'].fillna(species_means['height_m']).fillna(10.0)
    df['wood_density_g_cm3'] = df['wood_density_g_cm3'].fillna(species_means['wood_density_g_cm3']).fillna(0.70)
    
    # Drop duplicates
    cleaned_df = df.drop_duplicates(subset=['tree_id']).copy()
    cleaned_df['measurement_quality_flag'] = 'VALID'
    cleaned_df = vectorize_calculate_agb(cleaned_df)
    
    records = cleaned_df.replace({np.nan: None}).to_dict(orient="records")
    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.tree_measurements.delete_many({})
        await db_manager.db.tree_measurements.insert_many(records)
    else:
        db_manager.memory_store["tree_measurements"] = records
        
    return DataValidationSummary(
        total_rows=initial_rows,
        valid_rows=len(cleaned_df),
        missing_values_count=missing_cnt,
        duplicate_rows_count=duplicate_cnt,
        outliers_detected=int((cleaned_df['dbh_cm'] > 60).sum()),
        status="Cleaned and Imputed",
        cleaned_rows=len(cleaned_df)
    )

@app.post(f"{settings.API_V1_STR}/data/reset-sample")
async def reset_sample_dataset(
    current_user: dict = Depends(require_role(["Admin"]))
):
    await seed_initial_data()
    return {"message": "Sample dataset of 118 plots successfully re-generated and initialized."}


# ==============================================================================
# MODULE 3: ABOVEGROUND BIOMASS ESTIMATION
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/biomass/summary", response_model=BiomassSummaryResponse)
async def get_biomass_summary():
    plots_df = await get_plots_dataframe()
    trees_df = await get_trees_dataframe()
    
    if plots_df.empty:
        return BiomassSummaryResponse(
            total_plots=0, total_trees=0, grand_total_agb_kg=0.0,
            grand_total_agb_tonnes=0.0, mean_plot_agb_kg=0.0, median_plot_agb_kg=0.0,
            regional_breakdown=[], plot_type_breakdown=[]
        )
        
    grand_total_kg = float(plots_df['estimated_agb_kg'].sum())
    reg_summary, type_summary = compute_regional_and_type_summary(plots_df.rename(columns={'estimated_agb_kg': 'total_agb_kg'}))
    
    return BiomassSummaryResponse(
        total_plots=len(plots_df),
        total_trees=len(trees_df),
        grand_total_agb_kg=round(grand_total_kg, 2),
        grand_total_agb_tonnes=round(grand_total_kg / 1000.0, 2),
        mean_plot_agb_kg=round(float(plots_df['estimated_agb_kg'].mean()), 2),
        median_plot_agb_kg=round(float(plots_df['estimated_agb_kg'].median()), 2),
        allometric_equation="Chave et al. (2014): AGB = 0.0673 * (rho * D^2 * H)^0.976",
        regional_breakdown=reg_summary,
        plot_type_breakdown=type_summary
    )

@app.get(f"{settings.API_V1_STR}/biomass/plots")
async def get_plot_biomass_list(
    region: Optional[str] = None,
    plot_type: Optional[str] = None,
    priority: Optional[str] = None,
    sort_by: str = "priority_rank",
    ascending: bool = True
):
    plots_df = await get_plots_dataframe()
    if plots_df.empty:
        return []
        
    if region:
        plots_df = plots_df[plots_df['region'].str.lower() == region.lower()]
    if plot_type:
        plots_df = plots_df[plots_df['plot_type'].str.lower() == plot_type.lower()]
    if priority:
        plots_df = plots_df[plots_df['priority_level'].str.lower() == priority.lower()]
        
    if sort_by in plots_df.columns:
        plots_df = plots_df.sort_values(by=sort_by, ascending=ascending)
        
    clean_records = plots_df.replace({np.nan: None}).to_dict(orient="records")
    for r in clean_records:
        if "_id" in r:
            r["_id"] = str(r["_id"])
            
    return clean_records

@app.get(f"{settings.API_V1_STR}/biomass/plots/{{plot_id}}")
async def get_single_plot_biomass(plot_id: str):
    plots_df = await get_plots_dataframe()
    trees_df = await get_trees_dataframe()
    
    plot_record = plots_df[plots_df['plot_id'].str.upper() == plot_id.upper()]
    if plot_record.empty:
        raise HTTPException(status_code=404, detail=f"Plot '{plot_id}' not found.")
        
    plot_data = plot_record.iloc[0].replace({np.nan: None}).to_dict()
    if "_id" in plot_data:
        plot_data["_id"] = str(plot_data["_id"])
        
    # Get associated trees
    trees = trees_df[trees_df['plot_id'].str.upper() == plot_id.upper()].replace({np.nan: None}).to_dict(orient="records")
    for t in trees:
        if "_id" in t:
            t["_id"] = str(t["_id"])
            
    plot_data["trees"] = trees
    return plot_data


# ==============================================================================
# MODULE 4: UNCERTAINTY ASSESSMENT
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/uncertainty/summary", response_model=UncertaintyAssessmentResponse)
async def get_uncertainty_summary():
    plots_df = await get_plots_dataframe()
    if plots_df.empty:
        return UncertaintyAssessmentResponse(
            overall_mean_relative_uncertainty_pct=0.0,
            overall_median_relative_uncertainty_pct=0.0,
            min_uncertainty_pct=0.0,
            max_uncertainty_pct=0.0,
            plots_analyzed=0,
            plots=[]
        )
        
    clean_plots = plots_df.replace({np.nan: None}).to_dict(orient="records")
    for p in clean_plots:
        if "_id" in p:
            p["_id"] = str(p["_id"])
            
    return UncertaintyAssessmentResponse(
        overall_mean_relative_uncertainty_pct=round(float(plots_df['relative_uncertainty_pct'].mean()), 2),
        overall_median_relative_uncertainty_pct=round(float(plots_df['relative_uncertainty_pct'].median()), 2),
        min_uncertainty_pct=round(float(plots_df['relative_uncertainty_pct'].min()), 2),
        max_uncertainty_pct=round(float(plots_df['relative_uncertainty_pct'].max()), 2),
        plots_analyzed=len(plots_df),
        plots=clean_plots
    )

@app.get(f"{settings.API_V1_STR}/uncertainty/plot/{{plot_id}}")
async def get_plot_uncertainty_details(plot_id: str):
    trees_df = await get_trees_dataframe()
    plot_trees = trees_df[trees_df['plot_id'].str.upper() == plot_id.upper()]
    if plot_trees.empty:
        raise HTTPException(status_code=404, detail=f"Plot '{plot_id}' not found.")
        
    tree_agbs = plot_trees['agb_kg'].dropna().values
    point_est = float(np.sum(tree_agbs))
    
    # 2000 runs bootstrap
    boot_stats = run_bootstrap_for_plot(tree_agbs, n_bootstraps=2000, seed=42)
    # Generate distribution sample for charting (100 bins)
    rng = np.random.default_rng(42)
    n_trees = len(tree_agbs)
    resamples = rng.integers(0, n_trees, size=(2000, n_trees))
    sums = np.sum(tree_agbs[resamples], axis=1)
    
    hist_counts, bin_edges = np.histogram(sums, bins=30)
    distribution_curve = [
        {"bin_center": round(float((bin_edges[i] + bin_edges[i+1]) / 2), 1), "frequency": int(hist_counts[i])}
        for i in range(len(hist_counts))
    ]
    
    sensitivity = run_wood_density_sensitivity(plot_trees)
    
    return {
        "plot_id": plot_id.upper(),
        "tree_count": len(plot_trees),
        "point_estimate_agb_kg": round(point_est, 2),
        "bootstrap_mean_agb_kg": boot_stats["bootstrap_mean_agb_kg"],
        "lower_ci_95_kg": boot_stats["lower_ci_95_kg"],
        "upper_ci_95_kg": boot_stats["upper_ci_95_kg"],
        "relative_uncertainty_pct": boot_stats["relative_uncertainty_pct"],
        "distribution_curve": distribution_curve,
        "sensitivity_scenarios": sensitivity
    }


# ==============================================================================
# MODULE 5: VERIFICATION PRIORITIZATION ENGINE
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/prioritization/summary", response_model=PrioritizationSummaryResponse)
async def get_prioritization_summary():
    plots_df = await get_plots_dataframe()
    if plots_df.empty:
        return PrioritizationSummaryResponse(
            total_plots=0, high_priority_count=0, medium_priority_count=0,
            low_priority_count=0, mean_priority_score=0.0, plots=[]
        )
        
    high_cnt = int((plots_df['priority_level'] == 'High Priority').sum())
    med_cnt = int((plots_df['priority_level'] == 'Medium Priority').sum())
    low_cnt = int((plots_df['priority_level'] == 'Low Priority').sum())
    
    clean_plots = plots_df.replace({np.nan: None}).to_dict(orient="records")
    for p in clean_plots:
        if "_id" in p:
            p["_id"] = str(p["_id"])
        if not p.get("verification_status"):
            p["verification_status"] = "Pending"
            
    return PrioritizationSummaryResponse(
        total_plots=len(plots_df),
        high_priority_count=high_cnt,
        medium_priority_count=med_cnt,
        low_priority_count=low_cnt,
        mean_priority_score=round(float(plots_df['composite_priority_score'].mean()), 2),
        plots=clean_plots
    )

@app.post(f"{settings.API_V1_STR}/prioritization/recalculate")
async def recalculate_prioritization_weights(
    w_uncertainty: float = Query(0.3333, ge=0.0, le=1.0),
    w_data_quality: float = Query(0.3333, ge=0.0, le=1.0),
    w_biomass_impact: float = Query(0.3333, ge=0.0, le=1.0),
    current_user: dict = Depends(require_role(["Admin", "Researcher"]))
):
    trees_df = await get_trees_dataframe()
    plots_df = await get_plots_dataframe()
    if plots_df.empty or trees_df.empty:
        raise HTTPException(status_code=400, detail="Plots or trees data empty.")
        
    prioritized_df = generate_verification_prioritization(
        plots_df,
        trees_df,
        weight_uncertainty=w_uncertainty,
        weight_data_quality=w_data_quality,
        weight_biomass_impact=w_biomass_impact
    )
    
    plot_records = prioritized_df.replace({np.nan: None}).to_dict(orient="records")
    if db_manager.is_connected and db_manager.db is not None:
        for pr in plot_records:
            pid = pr["plot_id"]
            await db_manager.db.plot_biomass.update_one({"plot_id": pid}, {"$set": pr})
    else:
        for pr in plot_records:
            db_manager.memory_store["plot_biomass"][pr["plot_id"]] = pr
            
    return {
        "message": "Verification prioritization scores recalculated with updated indicator weights.",
        "weights": {
            "w_uncertainty": w_uncertainty,
            "w_data_quality": w_data_quality,
            "w_biomass_impact": w_biomass_impact
        },
        "plots": plot_records
    }


# ==============================================================================
# MODULE 6: COMPARATIVE VERIFICATION ANALYSIS
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/comparative/analysis", response_model=ComparativeAnalysisResponse)
async def get_comparative_analysis(
    budget: int = Query(24, ge=5, le=118),
    simulations: int = Query(10000, ge=1000, le=50000)
):
    plots_df = await get_plots_dataframe()
    if plots_df.empty:
        raise HTTPException(status_code=400, detail="Plots dataset empty.")
        
    res = run_comparative_verification_analysis(
        plots_df,
        budget_plots=budget,
        n_simulations=simulations,
        seed=42
    )
    return ComparativeAnalysisResponse(**res)


# ==============================================================================
# MODULE 7: BLOCKCHAIN-BASED REGISTRY
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/blockchain/status", response_model=BlockchainStatusResponse)
async def get_blockchain_status():
    status_info = await blockchain_service.get_status()
    return BlockchainStatusResponse(**status_info)

@app.get(f"{settings.API_V1_STR}/blockchain/records")
async def get_blockchain_records():
    return await blockchain_service.get_all_records()

@app.get(f"{settings.API_V1_STR}/blockchain/history/{{plot_id}}")
async def get_plot_blockchain_history(plot_id: str):
    return await blockchain_service.get_plot_history(plot_id.upper())

@app.post(f"{settings.API_V1_STR}/blockchain/register")
async def register_plot_on_blockchain(
    req: RegisterBiomassOnChainRequest,
    current_user: dict = Depends(require_role(["Admin", "Researcher", "Verification Officer"]))
):
    plots_df = await get_plots_dataframe()
    plot_record = plots_df[plots_df['plot_id'].str.upper() == req.plot_id.upper()]
    if plot_record.empty:
        raise HTTPException(status_code=404, detail=f"Plot '{req.plot_id}' not found.")
        
    p = plot_record.iloc[0]
    rec = await blockchain_service.register_biomass_record(
        plot_id=p["plot_id"],
        estimated_agb_kg=float(p["estimated_agb_kg"]),
        lower_ci_kg=float(p["lower_ci_95_kg"]),
        upper_ci_kg=float(p["upper_ci_95_kg"]),
        relative_uncertainty_pct=float(p["relative_uncertainty_pct"]),
        composite_priority_score=float(p["composite_priority_score"]),
        priority_level=str(p["priority_level"]),
        raw_evidence_str=f"{req.notes or 'Standard Ingestion'}:{p['region']}"
    )
    return {"message": "Plot successfully anchored to blockchain registry.", "record": rec}


# ==============================================================================
# MODULE 8: VERIFICATION MANAGEMENT
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/verification/tasks")
async def get_verification_tasks(
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None
):
    plots_df = await get_plots_dataframe()
    if plots_df.empty:
        return []
        
    if status_filter:
        plots_df = plots_df[plots_df.get('verification_status', 'Pending').str.lower() == status_filter.lower()]
    if priority_filter:
        plots_df = plots_df[plots_df['priority_level'].str.lower() == priority_filter.lower()]
        
    plots_df = plots_df.sort_values(by='composite_priority_score', ascending=False)
    clean_records = plots_df.replace({np.nan: None}).to_dict(orient="records")
    for r in clean_records:
        if "_id" in r:
            r["_id"] = str(r["_id"])
    return clean_records

@app.post(f"{settings.API_V1_STR}/verification/decision")
async def submit_verification_decision(
    decision: VerificationDecisionRequest,
    current_user: dict = Depends(require_role(["Admin", "Verification Officer"]))
):
    valid_statuses = {"Approved", "Rejected", "Additional Measurements Requested"}
    if decision.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    plots_df = await get_plots_dataframe()
    plot_record = plots_df[plots_df['plot_id'].str.upper() == decision.plot_id.upper()]
    if plot_record.empty:
        raise HTTPException(status_code=404, detail=f"Plot '{decision.plot_id}' not found.")
        
    update_log = await blockchain_service.update_verification_status(
        plot_id=decision.plot_id.upper(),
        status=decision.status,
        comments=decision.comments,
        officer_email=current_user["email"]
    )
    
    return {
        "message": f"Verification decision '{decision.status}' committed and immutably signed on blockchain.",
        "audit_receipt": update_log
    }


# ==============================================================================
# MODULE 9: ANALYTICS & REPORTS
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/analytics/dashboard")
async def get_analytics_dashboard():
    plots_df = await get_plots_dataframe()
    trees_df = await get_trees_dataframe()
    
    if plots_df.empty:
        return {}
        
    total_plots = len(plots_df)
    total_trees = len(trees_df)
    total_agb_kg = float(plots_df['estimated_agb_kg'].sum())
    mean_agb_kg = float(plots_df['estimated_agb_kg'].mean())
    
    high_cnt = int((plots_df['priority_level'] == 'High Priority').sum())
    med_cnt = int((plots_df['priority_level'] == 'Medium Priority').sum())
    low_cnt = int((plots_df['priority_level'] == 'Low Priority').sum())
    
    mean_unc = float(plots_df['relative_uncertainty_pct'].mean())
    
    # Verification status counts
    approved_cnt = int((plots_df.get('verification_status', 'Pending') == 'Approved').sum())
    completion_pct = round((approved_cnt / total_plots * 100.0) if total_plots > 0 else 0.0, 1)
    
    reg_summary, type_summary = compute_regional_and_type_summary(plots_df.rename(columns={'estimated_agb_kg': 'total_agb_kg'}))
    bc_status = await blockchain_service.get_status()
    
    return {
        "kpi": {
            "total_plots": total_plots,
            "total_trees": total_trees,
            "total_agb_tonnes": round(total_agb_kg / 1000.0, 2),
            "average_agb_kg": round(mean_agb_kg, 2),
            "high_priority_plots": high_cnt,
            "medium_priority_plots": med_cnt,
            "low_priority_plots": low_cnt,
            "average_relative_uncertainty_pct": round(mean_unc, 2),
            "verification_completion_pct": completion_pct,
            "blockchain_transactions_count": bc_status["total_transactions_recorded"],
            "blockchain_mode": bc_status["mode"]
        },
        "regional_biomass": reg_summary,
        "plot_type_biomass": type_summary,
        "priority_distribution": [
            {"name": "High Priority", "count": high_cnt, "color": "#ef4444"},
            {"name": "Medium Priority", "count": med_cnt, "color": "#f59e0b"},
            {"name": "Low Priority", "count": low_cnt, "color": "#10b981"}
        ]
    }

@app.get(f"{settings.API_V1_STR}/reports/csv")
async def export_csv_report():
    plots_df = await get_plots_dataframe()
    clean_plots = plots_df.replace({np.nan: None}).to_dict(orient="records")
    csv_str = generate_csv_report(clean_plots)
    
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=BlueCarbon_MRV_Prioritization_Report.csv"}
    )

@app.get(f"{settings.API_V1_STR}/reports/pdf")
async def export_pdf_report(current_user: dict = Depends(get_current_user)):
    plots_df = await get_plots_dataframe()
    clean_plots = plots_df.replace({np.nan: None}).to_dict(orient="records")
    
    summary_data = {
        "total_plots": len(plots_df),
        "high_priority_count": int((plots_df['priority_level'] == 'High Priority').sum()),
        "medium_priority_count": int((plots_df['priority_level'] == 'Medium Priority').sum()),
        "low_priority_count": int((plots_df['priority_level'] == 'Low Priority').sum()),
        "mean_priority_score": float(plots_df['composite_priority_score'].mean()),
        "mean_uncertainty_pct": float(plots_df['relative_uncertainty_pct'].mean()),
        "total_biomass_tonnes": float(plots_df['estimated_agb_kg'].sum()) / 1000.0
    }
    
    pdf_bytes = generate_pdf_report(
        summary_data=summary_data,
        plots_data=clean_plots,
        officer_name=current_user.get("name", "Authorized Officer")
    )
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=BlueCarbon_MRV_Prioritization_Audit_Report.pdf"}
    )

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database_connected": db_manager.is_connected,
        "blockchain_mode": blockchain_service.mode
    }
