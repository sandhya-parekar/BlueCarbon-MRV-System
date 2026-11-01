import io
import os
import json
import uuid
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, db_manager
from app.auth import (
    verify_password, get_password_hash, create_access_token, decode_token,
    get_current_user, require_role
)
from app.models import (
    UserCreate, UserLogin, UserResponse, Token,
    TreeMeasurementCreate, DatasetStatsResponse, DataValidationSummary,
    BiomassSummaryResponse, UncertaintyAssessmentResponse,
    PrioritizationSummaryResponse, ComparativeAnalysisResponse,
    VerificationDecisionRequest, RegisterBiomassOnChainRequest,
    BlockchainStatusResponse,
    PlantSpeciesModel, PlantSpeciesCreate, PlantRecommendationRequest,
    GrowthCalculationRequest, LandAreaCalculationRequest,
    EnvironmentalBenefitsRequest, PlantingProjectCreate,
    PlantingProjectUpdate, PlantingProjectResponse,
    PlantMonitoringRecordCreate, PlantMonitoringRecordResponse,
    UserPlantingImpactResponse,
    CommunityUserRegister, SupportTicketCreate, SupportTicketAssign,
    SupportTicketStatusUpdate, SupportTicketResponse,
    TicketMessageCreate, TicketMessageResponse,
    NotificationResponse, StaffMemberResponse, CommunityDashboardResponse,
    TicketCategory, TicketStatus
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
from app.services.planner_service import (
    SPECIES_DATABASE, SPECIES_LOOKUP,
    recommend_plants, calculate_plant_growth_timeline,
    calculate_land_area_requirements, calculate_environmental_benefits,
    generate_planting_calendar
)
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

@app.post(f"{settings.API_V1_STR}/auth/register-community", response_model=UserResponse)
async def register_community(user_in: CommunityUserRegister):
    """
    Public registration endpoint for Community Users / Planters (Farmers, Students, NGOs, Volunteers).
    Prevents unauthorized assignment of privileged staff roles (Admin, Researcher, Verification Officer).
    """
    if user_in.password != user_in.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match. Please re-enter identical passwords.")
        
    now_str = datetime.utcnow().isoformat()
    if db_manager.is_connected and db_manager.db is not None:
        existing = await db_manager.db.users.find_one({"email": user_in.email})
        if existing:
            raise HTTPException(status_code=400, detail="A user with this email address already exists.")
            
        user_doc = {
            "name": user_in.name,
            "email": user_in.email,
            "hashed_password": get_password_hash(user_in.password),
            "role": "community_user",
            "organization": user_in.organization or "Community Planters Network",
            "mobile_number": user_in.mobile_number or "",
            "country": user_in.country or "India",
            "state": user_in.state,
            "district": user_in.district or "",
            "user_type": user_in.user_type or "Farmer",
            "created_at": now_str
        }
        res = await db_manager.db.users.insert_one(user_doc)
        user_id = str(res.inserted_id)
        
        # Dispatch welcome notification
        welcome_notif = {
            "id": f"notif_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "title": "Welcome to BlueCarbon MRV Community!",
            "message": f"Welcome {user_in.name}! You can now plan planting projects, record growth monitoring, and consult our mangrove scientists.",
            "type": "welcome",
            "link": "/communication",
            "is_read": False,
            "created_at": now_str
        }
        await db_manager.db.notifications.insert_one(welcome_notif)
    else:
        if user_in.email in db_manager.memory_store["users"]:
            raise HTTPException(status_code=400, detail="A user with this email address already exists.")
            
        user_id = f"mem_comm_{len(db_manager.memory_store['users']) + 1}"
        user_doc = {
            "id": user_id,
            "name": user_in.name,
            "email": user_in.email,
            "hashed_password": get_password_hash(user_in.password),
            "role": "community_user",
            "organization": user_in.organization or "Community Planters Network",
            "mobile_number": user_in.mobile_number or "",
            "country": user_in.country or "India",
            "state": user_in.state,
            "district": user_in.district or "",
            "user_type": user_in.user_type or "Farmer",
            "created_at": now_str
        }
        db_manager.memory_store["users"][user_in.email] = user_doc
        
        welcome_notif_id = f"notif_{uuid.uuid4().hex[:8]}"
        db_manager.memory_store["notifications"][welcome_notif_id] = {
            "id": welcome_notif_id,
            "user_id": user_id,
            "title": "Welcome to BlueCarbon MRV Community!",
            "message": f"Welcome {user_in.name}! You can now plan planting projects, record growth monitoring, and consult our mangrove scientists.",
            "type": "welcome",
            "link": "/communication",
            "is_read": False,
            "created_at": now_str
        }

    return UserResponse(
        id=user_id,
        name=user_in.name,
        email=user_in.email,
        role="community_user",
        organization=user_doc.get("organization"),
        mobile_number=user_doc.get("mobile_number"),
        country=user_doc.get("country", "India"),
        state=user_doc.get("state"),
        district=user_doc.get("district"),
        user_type=user_doc.get("user_type")
    )

@app.post(f"{settings.API_V1_STR}/auth/register", response_model=UserResponse)
async def register(user_in: UserCreate, authorization: Optional[str] = Header(None)):
    """
    Internal registration endpoint.
    Privileged staff roles (Admin, Researcher, Verification Officer) can only be registered
    by an authorized Administrator with a valid JWT token.
    """
    if user_in.role in ["Admin", "Researcher", "Verification Officer"]:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Public registration for privileged roles (Admin, Researcher, Verification Officer) is restricted. Only an Administrator can provision staff accounts."
            )
        try:
            token = authorization.split(" ")[1]
            payload = decode_token(token)
            if payload.get("role") != "Admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only an Administrator can provision Admin, Researcher, or Verification Officer accounts."
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization token.")

    now_str = pd.Timestamp.now().isoformat()
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
            "mobile_number": getattr(user_in, "mobile_number", None),
            "country": getattr(user_in, "country", "India"),
            "state": getattr(user_in, "state", None),
            "district": getattr(user_in, "district", None),
            "user_type": getattr(user_in, "user_type", None),
            "created_at": now_str
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
            "mobile_number": getattr(user_in, "mobile_number", None),
            "country": getattr(user_in, "country", "India"),
            "state": getattr(user_in, "state", None),
            "district": getattr(user_in, "district", None),
            "user_type": getattr(user_in, "user_type", None),
            "created_at": now_str,
            "id": user_id
        }
        db_manager.memory_store["users"][user_in.email] = user_doc

    return UserResponse(
        id=user_id,
        name=user_in.name,
        email=user_in.email,
        role=user_in.role,
        organization=user_in.organization,
        mobile_number=user_doc.get("mobile_number"),
        country=user_doc.get("country", "India"),
        state=user_doc.get("state"),
        district=user_doc.get("district"),
        user_type=user_doc.get("user_type")
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
            organization=user.get("organization"),
            mobile_number=user.get("mobile_number"),
            country=user.get("country", "India"),
            state=user.get("state"),
            district=user.get("district"),
            user_type=user.get("user_type")
        )
    )

@app.get(f"{settings.API_V1_STR}/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        organization=current_user.get("organization"),
        mobile_number=current_user.get("mobile_number"),
        country=current_user.get("country", "India"),
        state=current_user.get("state"),
        district=current_user.get("district"),
        user_type=current_user.get("user_type")
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
    if 'verification_status' in plots_df.columns:
        approved_cnt = int((plots_df['verification_status'] == 'Approved').sum())
    else:
        approved_cnt = 0
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

# ==============================================================================
# MODULE 10: PLANT GROWTH & BLUE CARBON PLANNER
# ==============================================================================

async def get_all_species_list() -> List[dict]:
    if db_manager.is_connected and db_manager.db is not None:
        cursor = db_manager.db.plant_species.find({})
        records = await cursor.to_list(length=100)
    else:
        records = list(db_manager.memory_store["plant_species"].values())
    if not records:
        return SPECIES_DATABASE
    for r in records:
        if "_id" in r:
            r["_id"] = str(r["_id"])
    return records

async def get_planting_projects_list(user_id: Optional[str] = None) -> List[dict]:
    if db_manager.is_connected and db_manager.db is not None:
        query = {"user_id": user_id} if user_id else {}
        cursor = db_manager.db.planting_projects.find(query).sort("created_at", -1)
        records = await cursor.to_list(length=1000)
    else:
        records = list(db_manager.memory_store["planting_projects"].values())
        if user_id:
            records = [r for r in records if r.get("user_id") == user_id]
        records.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    for r in records:
        if "_id" in r:
            r["_id"] = str(r["_id"])
    return records

async def get_monitoring_records_list(project_id: Optional[str] = None, user_id: Optional[str] = None) -> List[dict]:
    if db_manager.is_connected and db_manager.db is not None:
        query = {}
        if project_id:
            query["project_id"] = project_id
        if user_id:
            query["user_id"] = user_id
        cursor = db_manager.db.plant_monitoring.find(query).sort("monitoring_date", -1)
        records = await cursor.to_list(length=2000)
    else:
        records = list(db_manager.memory_store["plant_monitoring"].values())
        if project_id:
            records = [r for r in records if r.get("project_id") == project_id]
        if user_id:
            records = [r for r in records if r.get("user_id") == user_id]
        records.sort(key=lambda x: x.get("monitoring_date", ""), reverse=True)
    for r in records:
        if "_id" in r:
            r["_id"] = str(r["_id"])
    return records

@app.get(f"{settings.API_V1_STR}/planner/species")
async def list_plant_species(
    category: Optional[str] = None,
    is_mangrove: Optional[bool] = None,
    search: Optional[str] = None
):
    species = await get_all_species_list()
    if category:
        species = [s for s in species if s.get("category", "").lower() == category.lower()]
    if is_mangrove is not None:
        species = [s for s in species if s.get("is_mangrove") == is_mangrove]
    if search:
        q = search.lower()
        species = [
            s for s in species
            if q in s.get("common_name", "").lower()
            or q in s.get("scientific_name", "").lower()
            or q in s.get("family", "").lower()
        ]
    return {"total": len(species), "species": species}

@app.get(f"{settings.API_V1_STR}/planner/species/{{species_id}}")
async def get_single_plant_species(species_id: str):
    species_list = await get_all_species_list()
    match = next((s for s in species_list if s.get("id") == species_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Species '{species_id}' not found.")
    return match

@app.post(f"{settings.API_V1_STR}/planner/species")
async def create_or_update_species(
    species_data: PlantSpeciesCreate,
    current_user: dict = Depends(require_role(["Admin"]))
):
    sp_dict = species_data.model_dump()
    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.plant_species.update_one(
            {"id": sp_dict["id"]},
            {"$set": sp_dict},
            upsert=True
        )
    else:
        db_manager.memory_store["plant_species"][sp_dict["id"]] = sp_dict
    return {"message": "Plant species reference record saved successfully.", "species": sp_dict}

@app.post(f"{settings.API_V1_STR}/planner/recommend")
async def get_plant_recommendations(req: PlantRecommendationRequest):
    return recommend_plants(
        country=req.country,
        state=req.state,
        district=req.district,
        location=req.location,
        soil_type=req.soil_type,
        land_type=req.land_type,
        water_condition=req.water_condition,
        planting_purpose=req.planting_purpose,
        land_area=req.land_area,
        number_of_plants=req.number_of_plants
    )

@app.post(f"{settings.API_V1_STR}/planner/calculate-growth")
async def calculate_growth(req: GrowthCalculationRequest):
    res = calculate_plant_growth_timeline(
        species_id=req.species_id,
        planting_date_str=req.planting_date,
        number_of_plants=req.number_of_plants,
        initial_height_cm=req.initial_height_cm,
        soil_condition=req.soil_condition,
        sunlight_exposure=req.sunlight_exposure,
        water_availability=req.water_availability,
        care_level=req.care_level
    )
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@app.post(f"{settings.API_V1_STR}/planner/calculate-land")
async def calculate_land(req: LandAreaCalculationRequest):
    return calculate_land_area_requirements(
        species_id=req.species_id,
        number_of_plants=req.number_of_plants,
        available_land_area=req.available_land_area,
        area_unit=req.area_unit,
        custom_spacing_m=req.custom_spacing_m,
        pathway_buffer_pct=req.pathway_buffer_pct
    )

@app.post(f"{settings.API_V1_STR}/planner/calculate-benefits")
async def calculate_benefits(req: EnvironmentalBenefitsRequest):
    res = calculate_environmental_benefits(
        species_id=req.species_id,
        number_of_plants=req.number_of_plants,
        land_area_ha=req.land_area_ha,
        stand_age_years=req.stand_age_years,
        survival_rate_pct=req.survival_rate_pct
    )
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@app.get(f"{settings.API_V1_STR}/planner/calendar")
async def get_calendar(
    species_id: Optional[str] = None,
    region: Optional[str] = None
):
    events = generate_planting_calendar(species_id=species_id, region=region)
    return {"events": events}

@app.get(f"{settings.API_V1_STR}/planner/projects")
async def list_user_projects(
    current_user: dict = Depends(get_current_user),
    user_id: Optional[str] = None
):
    # Admins can view all projects or filter by user; normal users can only view their own
    is_admin = current_user.get("role") == "Admin"
    target_user_id = user_id if (is_admin and user_id) else (None if is_admin and not user_id else current_user["id"])
    
    projects = await get_planting_projects_list(target_user_id)
    return {"total": len(projects), "projects": projects}

@app.get(f"{settings.API_V1_STR}/planner/projects/{{project_id}}")
async def get_project_details(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    projects = await get_planting_projects_list()
    project = next((p for p in projects if p.get("id") == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail=f"Planting project '{project_id}' not found.")
    
    # Ownership check: user can view own project or admin can view all
    if project.get("user_id") != current_user["id"] and current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this project.")
    
    # Attach monitoring records
    records = await get_monitoring_records_list(project_id=project_id)
    project_copy = dict(project)
    project_copy["monitoring_records"] = records
    return project_copy

@app.post(f"{settings.API_V1_STR}/planner/projects")
async def create_planting_project(
    project_in: PlantingProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    # Convert land area to hectares for biomass estimate
    ha_conv = {
        "sq_meters": 0.0001,
        "sq_feet": 0.0000092903,
        "acres": 0.404686,
        "hectares": 1.0
    }
    land_ha = project_in.land_area * ha_conv.get(project_in.area_unit, 0.0001)

    # Initial environmental benefits calculation
    benefits = calculate_environmental_benefits(
        species_id=project_in.species_id,
        number_of_plants=project_in.number_of_plants,
        land_area_ha=max(land_ha, 0.001),
        stand_age_years=1.0,
        survival_rate_pct=100.0
    )
    
    q_est = benefits.get("quantitative_estimates", {}) if "quantitative_estimates" in benefits else {}
    agb_kg = q_est.get("above_ground_biomass_tonnes", 0.0) * 1000.0
    c_kg = q_est.get("total_carbon_storage_tonnes", 0.0) * 1000.0
    co2e_kg = q_est.get("co2_equivalent_tonnes", 0.0) * 1000.0

    now_str = pd.Timestamp.now().isoformat()
    project_id = f"proj_{int(datetime.now().timestamp() * 1000)}"

    project_doc = project_in.model_dump()
    project_doc.update({
        "id": project_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_email": current_user["email"],
        "estimated_biomass_kg": round(agb_kg, 2),
        "estimated_carbon_kg": round(c_kg, 2),
        "estimated_co2e_kg": round(co2e_kg, 2),
        "current_survival_pct": 100.0,
        "total_monitoring_logs": 0,
        "latest_height_cm": None,
        "created_at": now_str,
        "updated_at": now_str
    })

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.planting_projects.insert_one(project_doc.copy())
    else:
        db_manager.memory_store["planting_projects"][project_id] = project_doc.copy()

    return {"message": "Planting project created successfully.", "project": project_doc}

@app.put(f"{settings.API_V1_STR}/planner/projects/{{project_id}}")
async def update_planting_project(
    project_id: str,
    project_up: PlantingProjectUpdate,
    current_user: dict = Depends(get_current_user)
):
    projects = await get_planting_projects_list()
    project = next((p for p in projects if p.get("id") == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail=f"Planting project '{project_id}' not found.")
    
    if project.get("user_id") != current_user["id"] and current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized to modify this project.")
    
    update_data = {k: v for k, v in project_up.model_dump().items() if v is not None}
    update_data["updated_at"] = pd.Timestamp.now().isoformat()

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.planting_projects.update_one({"id": project_id}, {"$set": update_data})
    else:
        db_manager.memory_store["planting_projects"][project_id].update(update_data)

    project.update(update_data)
    return {"message": "Project updated successfully.", "project": project}

@app.delete(f"{settings.API_V1_STR}/planner/projects/{{project_id}}")
async def delete_planting_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    projects = await get_planting_projects_list()
    project = next((p for p in projects if p.get("id") == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail=f"Planting project '{project_id}' not found.")
    
    if project.get("user_id") != current_user["id"] and current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this project.")

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.planting_projects.delete_one({"id": project_id})
        await db_manager.db.plant_monitoring.delete_many({"project_id": project_id})
    else:
        db_manager.memory_store["planting_projects"].pop(project_id, None)
        # remove associated monitoring logs
        to_del = [k for k, v in db_manager.memory_store["plant_monitoring"].items() if v.get("project_id") == project_id]
        for k in to_del:
            db_manager.memory_store["plant_monitoring"].pop(k, None)

    return {"message": f"Planting project '{project_id}' and all associated monitoring logs deleted."}

@app.get(f"{settings.API_V1_STR}/planner/monitoring")
async def list_monitoring_records(
    project_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    is_admin = current_user.get("role") == "Admin"
    user_filter = None if is_admin else current_user["id"]
    records = await get_monitoring_records_list(project_id=project_id, user_id=user_filter)
    return {"total": len(records), "records": records}

@app.post(f"{settings.API_V1_STR}/planner/monitoring")
async def create_monitoring_record(
    record_in: PlantMonitoringRecordCreate,
    current_user: dict = Depends(get_current_user)
):
    # Retrieve project
    projects = await get_planting_projects_list()
    project = next((p for p in projects if p.get("id") == record_in.project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{record_in.project_id}' not found.")
    
    if project.get("user_id") != current_user["id"] and current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized to add monitoring for this project.")

    # Calculate survival percentage
    init_plants = project.get("number_of_plants", 100)
    surviving = record_in.surviving_plants
    survival_pct = round((surviving / init_plants) * 100.0, 2) if init_plants > 0 else 0.0

    # Auto-generate contextual recommendations
    actions = []
    if survival_pct < 70.0:
        actions.append("CRITICAL: Survival below 70%. Immediate infill planting and root inspection required.")
        actions.append("Examine soil salinity and check if tidal flushing channels are blocked with silt.")
    elif survival_pct < 85.0:
        actions.append("Plan gap-filling outplanting during upcoming monsoon to maintain target density.")
        actions.append("Check stems for barnacle incrustation, stem borer damage, or cattle trampling.")
    else:
        actions.append("Optimal survival rate maintained. Continue quarterly visual inspections.")

    if record_in.health_condition in ["Poor", "Critical"]:
        actions.append("Test soil and water salinity levels to detect potential hyper-salinity or drought stress.")
        actions.append("Erect protective fencing if herbivory or debris impact is detected.")

    if not actions:
        actions.append("Plant health and growth are on track. No corrective intervention needed at this stage.")

    rec_id = f"mon_{int(datetime.now().timestamp() * 1000)}"
    now_str = pd.Timestamp.now().isoformat()

    rec_doc = record_in.model_dump()
    rec_doc.update({
        "id": rec_id,
        "user_id": current_user["id"],
        "survival_percentage": survival_pct,
        "recommended_actions": actions,
        "recorded_by": current_user["email"],
        "created_at": now_str
    })

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.plant_monitoring.insert_one(rec_doc.copy())
        # Update project summary metrics
        await db_manager.db.planting_projects.update_one(
            {"id": record_in.project_id},
            {
                "$set": {
                    "current_survival_pct": survival_pct,
                    "latest_height_cm": record_in.plant_height_cm,
                    "updated_at": now_str
                },
                "$inc": {"total_monitoring_logs": 1}
            }
        )
    else:
        db_manager.memory_store["plant_monitoring"][rec_id] = rec_doc.copy()
        if record_in.project_id in db_manager.memory_store["planting_projects"]:
            prj = db_manager.memory_store["planting_projects"][record_in.project_id]
            prj["current_survival_pct"] = survival_pct
            prj["latest_height_cm"] = record_in.plant_height_cm
            prj["total_monitoring_logs"] = prj.get("total_monitoring_logs", 0) + 1
            prj["updated_at"] = now_str

    return {"message": "Monitoring record added successfully.", "record": rec_doc}

@app.delete(f"{settings.API_V1_STR}/planner/monitoring/{{record_id}}")
async def delete_monitoring_record(
    record_id: str,
    current_user: dict = Depends(get_current_user)
):
    records = await get_monitoring_records_list()
    record = next((r for r in records if r.get("id") == record_id), None)
    if not record:
        raise HTTPException(status_code=404, detail=f"Monitoring record '{record_id}' not found.")
    
    if record.get("user_id") != current_user["id"] and current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this record.")

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.plant_monitoring.delete_one({"id": record_id})
    else:
        db_manager.memory_store["plant_monitoring"].pop(record_id, None)

    return {"message": "Monitoring record deleted successfully."}

@app.get(f"{settings.API_V1_STR}/planner/user-impact")
async def get_user_planting_impact(
    current_user: dict = Depends(get_current_user)
):
    """
    Returns aggregated metrics for the authenticated user's planting impact.
    Used for dashboard integration and user overview.
    """
    is_admin = current_user.get("role") == "Admin"
    # For Admin, if they have own projects show theirs, or overall community impact if none
    projects = await get_planting_projects_list(current_user["id"])
    if not projects and is_admin:
        projects = await get_planting_projects_list(None)

    total_projects = len(projects)
    total_plants_planted = sum(p.get("number_of_plants", 0) for p in projects)
    
    # Calculate surviving plants
    total_surviving = 0
    total_area_sq_m = 0.0
    total_biomass_kg = 0.0
    total_carbon_kg = 0.0
    total_co2e_kg = 0.0

    ha_conv = {
        "sq_meters": 0.0001,
        "sq_feet": 0.0000092903,
        "acres": 0.404686,
        "hectares": 1.0
    }

    status_counts = {"Planning": 0, "Ready for planting": 0, "Planted": 0, "Growing": 0, "Monitoring": 0, "Completed": 0}
    species_counts: Dict[str, int] = {}

    for p in projects:
        st = p.get("status", "Planning")
        status_counts[st] = status_counts.get(st, 0) + 1
        
        sp_name = p.get("species_name", "Unknown Species")
        species_counts[sp_name] = species_counts.get(sp_name, 0) + p.get("number_of_plants", 0)

        # Land area conversion
        unit = p.get("area_unit", "sq_meters")
        raw_area = p.get("land_area", 0.0)
        total_area_sq_m += (raw_area if unit == "sq_meters" else (raw_area / ha_conv.get(unit, 1.0) * 0.0001))

        # Surviving plants
        surv_pct = p.get("current_survival_pct", 90.0)
        n_plants = p.get("number_of_plants", 0)
        surviving_count = int(n_plants * (surv_pct / 100.0))
        total_surviving += surviving_count

        # Biomass & Carbon
        total_biomass_kg += p.get("estimated_biomass_kg", 0.0)
        total_carbon_kg += p.get("estimated_carbon_kg", 0.0)
        total_co2e_kg += p.get("estimated_co2e_kg", 0.0)

    overall_survival = round((total_surviving / total_plants_planted * 100.0), 1) if total_plants_planted > 0 else 0.0
    total_ha = round(total_area_sq_m * 0.0001, 3)

    # Time series of plants planted over time
    plants_over_time = []
    sorted_projs = sorted(projects, key=lambda x: x.get("planting_date", x.get("created_at", "")))
    cum_planted = 0
    for p in sorted_projs:
        date_str = p.get("planting_date", p.get("created_at", "2026-01-01"))[:7] # YYYY-MM
        cum_planted += p.get("number_of_plants", 0)
        plants_over_time.append({
            "period": date_str,
            "project_name": p.get("project_name", ""),
            "plants_added": p.get("number_of_plants", 0),
            "cumulative_planted": cum_planted
        })

    # Carbon accumulation trajectory (5-year model)
    carbon_traj = []
    base_c = total_carbon_kg / 1000.0
    for yr in range(1, 6):
        growth_mult = 1.0 + (yr - 1) * 0.35
        carbon_traj.append({
            "year": f"Year {yr}",
            "estimated_biomass_tonnes": round((total_biomass_kg / 1000.0) * growth_mult, 2),
            "estimated_carbon_tonnes": round(base_c * growth_mult, 2),
            "estimated_co2e_tonnes": round((total_co2e_kg / 1000.0) * growth_mult, 2)
        })

    return {
        "total_projects": total_projects,
        "total_plants_planted": total_plants_planted,
        "total_surviving_plants": total_surviving,
        "overall_survival_percentage": overall_survival,
        "total_land_area_ha": total_ha,
        "total_land_area_sq_m": round(total_area_sq_m, 1),
        "estimated_biomass_tonnes": round(total_biomass_kg / 1000.0, 2),
        "estimated_carbon_storage_tonnes": round(total_carbon_kg / 1000.0, 2),
        "estimated_co2e_tonnes": round(total_co2e_kg / 1000.0, 2),
        "projects_by_status": status_counts,
        "species_distribution": species_counts,
        "plants_over_time": plants_over_time,
        "carbon_accumulation_trajectory": carbon_traj,
        "data_notice": "Community planting impact models use pantropical allometry (Chave et al. 2014) and are distinct from audited MRV registry credits."
    }

# ==============================================================================
# MODULE 11: COMMUNITY COMMUNICATION & SUPPORT TICKETS SYSTEM
# ==============================================================================

async def get_support_tickets_list(user_id: Optional[str] = None) -> List[dict]:
    if db_manager.is_connected and db_manager.db is not None:
        query = {}
        if user_id:
            query["user_id"] = user_id
        cursor = db_manager.db.support_tickets.find(query).sort("created_at", -1)
        records = await cursor.to_list(length=2000)
        for r in records:
            if "_id" in r:
                r["_id"] = str(r["_id"])
        return records
    else:
        tickets = list(db_manager.memory_store.get("support_tickets", {}).values())
        if user_id:
            tickets = [t for t in tickets if t.get("user_id") == user_id]
        return sorted(tickets, key=lambda x: x.get("created_at", ""), reverse=True)


async def get_ticket_messages_list(ticket_id: str) -> List[dict]:
    if db_manager.is_connected and db_manager.db is not None:
        cursor = db_manager.db.ticket_messages.find({"ticket_id": ticket_id}).sort("created_at", 1)
        records = await cursor.to_list(length=1000)
        for r in records:
            if "_id" in r:
                r["_id"] = str(r["_id"])
        return records
    else:
        messages = [m for m in db_manager.memory_store.get("ticket_messages", {}).values() if m.get("ticket_id") == ticket_id]
        return sorted(messages, key=lambda x: x.get("created_at", ""))


async def get_notifications_list(user_id: str, unread_only: bool = False) -> List[dict]:
    if db_manager.is_connected and db_manager.db is not None:
        query = {"user_id": user_id}
        if unread_only:
            query["is_read"] = False
        cursor = db_manager.db.notifications.find(query).sort("created_at", -1)
        records = await cursor.to_list(length=500)
        for r in records:
            if "_id" in r:
                r["_id"] = str(r["_id"])
        return records
    else:
        notifs = [n for n in db_manager.memory_store.get("notifications", {}).values() if n.get("user_id") == user_id]
        if unread_only:
            notifs = [n for n in notifs if not n.get("is_read", False)]
        return sorted(notifs, key=lambda x: x.get("created_at", ""), reverse=True)


async def create_notification(user_id: str, title: str, message: str, notif_type: str = "ticket", link: Optional[str] = None):
    notif_id = f"notif_{uuid.uuid4().hex[:8]}"
    notif = {
        "id": notif_id,
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "link": link,
        "is_read": False,
        "created_at": datetime.utcnow().isoformat()
    }
    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.notifications.insert_one(notif.copy())
    else:
        db_manager.memory_store.setdefault("notifications", {})[notif_id] = notif
    return notif


async def get_staff_users() -> List[dict]:
    staff_roles = ["Admin", "Researcher", "Verification Officer"]
    if db_manager.is_connected and db_manager.db is not None:
        cursor = db_manager.db.users.find({"role": {"$in": staff_roles}})
        records = await cursor.to_list(length=100)
        result = []
        for r in records:
            item = dict(r)
            item["id"] = str(r.get("_id", r.get("id", r["email"])))
            result.append(item)
        return result
    else:
        result = []
        for u in db_manager.memory_store.get("users", {}).values():
            if u.get("role") in staff_roles:
                item = dict(u)
                item["id"] = str(u.get("_id", u.get("id", u["email"])))
                result.append(item)
        return result


@app.post(f"{settings.API_V1_STR}/communication/tickets", response_model=SupportTicketResponse)
async def create_support_ticket(
    ticket_in: SupportTicketCreate,
    current_user: dict = Depends(get_current_user)
):
    ticket_id = f"tkt_{uuid.uuid4().hex[:8]}"
    now_str = datetime.utcnow().isoformat()

    all_tickets = await get_support_tickets_list()
    ticket_seq = len(all_tickets) + 101
    ticket_number = f"TKT-{ticket_seq:04d}"

    loc = ticket_in.location
    if not loc:
        state = current_user.get("state", "")
        dist = current_user.get("district", "")
        loc = f"{dist}, {state}".strip(", ") or current_user.get("country", "India")

    site_params = ticket_in.site_parameters.model_dump() if ticket_in.site_parameters else None
    cat_val = ticket_in.category.value if hasattr(ticket_in.category, "value") else str(ticket_in.category)

    ticket_doc = {
        "id": ticket_id,
        "ticket_number": ticket_number,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_email": current_user["email"],
        "user_type": current_user.get("user_type", "Community User"),
        "subject": ticket_in.subject,
        "category": cat_val,
        "description": ticket_in.description,
        "location": loc,
        "attachment_url": ticket_in.attachment_url,
        "planting_project_id": ticket_in.planting_project_id,
        "site_parameters": site_params,
        "status": TicketStatus.OPEN.value,
        "priority": "Medium",
        "assigned_to_id": None,
        "assigned_to_name": None,
        "assigned_to_role": None,
        "created_at": now_str,
        "updated_at": now_str,
        "resolved_at": None,
        "resolution_note": None
    }

    # Create initial message in thread
    msg_id = f"msg_{uuid.uuid4().hex[:8]}"
    initial_msg = {
        "id": msg_id,
        "ticket_id": ticket_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "sender_role": current_user["role"],
        "message": ticket_in.description,
        "attachment_url": ticket_in.attachment_url,
        "created_at": now_str
    }

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.support_tickets.insert_one(ticket_doc.copy())
        await db_manager.db.ticket_messages.insert_one(initial_msg.copy())
    else:
        db_manager.memory_store.setdefault("support_tickets", {})[ticket_id] = ticket_doc.copy()
        db_manager.memory_store.setdefault("ticket_messages", {})[msg_id] = initial_msg.copy()

    # Dispatch notifications to staff
    staff_members = await get_staff_users()
    for s in staff_members:
        # Notify Admins always
        if s["role"] == "Admin":
            await create_notification(
                user_id=s["id"],
                title=f"New Request ({ticket_number}): {ticket_in.subject}",
                message=f"{current_user['name']} submitted a {cat_val} inquiry.",
                notif_type="ticket_new",
                link=f"/communication?ticket={ticket_id}"
            )
        # Notify Researchers if planting/science inquiry
        elif s["role"] == "Researcher" and cat_val in [
            "Plant Selection", "Mangrove Planting", "Soil Conditions",
            "Land Requirements", "Water Requirements", "Plant Growth",
            "Plant Diseases", "Carbon Benefits", "Planting Assistance"
        ]:
            await create_notification(
                user_id=s["id"],
                title=f"New Plant Guidance Request ({ticket_number})",
                message=f"{current_user['name']} asked for advice on {ticket_in.subject}.",
                notif_type="ticket_new",
                link=f"/communication?ticket={ticket_id}"
            )
        # Notify Verification Officers if verification inquiry
        elif s["role"] == "Verification Officer" and cat_val in ["Verification Inquiry", "Technical Assistance"]:
            await create_notification(
                user_id=s["id"],
                title=f"Verification Support Inquiry ({ticket_number})",
                message=f"{current_user['name']} submitted verification question: {ticket_in.subject}.",
                notif_type="ticket_new",
                link=f"/communication?ticket={ticket_id}"
            )

    ticket_doc["messages"] = [initial_msg]
    return ticket_doc


@app.get(f"{settings.API_V1_STR}/communication/tickets")
async def list_support_tickets(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    user_id = current_user["id"]

    all_tickets = await get_support_tickets_list()

    # RBAC Access Control
    if role in ["community_user", "Community User"]:
        # Community users ONLY see their own tickets
        tickets = [t for t in all_tickets if t.get("user_id") == user_id]
    elif role == "Researcher":
        research_categories = [
            "Plant Selection", "Mangrove Planting", "Soil Conditions",
            "Land Requirements", "Water Requirements", "Plant Growth",
            "Plant Diseases", "Carbon Benefits", "Planting Assistance", "Other"
        ]
        tickets = [
            t for t in all_tickets
            if t.get("assigned_to_id") == user_id or (not t.get("assigned_to_id") and t.get("category") in research_categories) or role == "Admin"
        ]
    elif role == "Verification Officer":
        verification_categories = ["Verification Inquiry", "Technical Assistance", "Other"]
        tickets = [
            t for t in all_tickets
            if t.get("assigned_to_id") == user_id or (not t.get("assigned_to_id") and t.get("category") in verification_categories)
        ]
    else:  # Admin
        tickets = all_tickets

    # Filtering
    if category:
        tickets = [t for t in tickets if t.get("category") == category]
    if status:
        tickets = [t for t in tickets if t.get("status") == status]
    if search:
        s_low = search.lower()
        tickets = [
            t for t in tickets
            if s_low in t.get("subject", "").lower()
            or s_low in t.get("ticket_number", "").lower()
            or s_low in t.get("user_name", "").lower()
            or s_low in t.get("category", "").lower()
        ]

    # Enrich with message count and preview
    result = []
    for t in tickets:
        t_copy = dict(t)
        msgs = await get_ticket_messages_list(t["id"])
        t_copy["message_count"] = len(msgs)
        t_copy["last_message"] = msgs[-1].get("message", "")[:90] if msgs else ""
        t_copy["last_message_at"] = msgs[-1].get("created_at") if msgs else t.get("created_at")
        result.append(t_copy)

    return {"total": len(result), "tickets": result}


@app.get(f"{settings.API_V1_STR}/communication/tickets/{{ticket_id}}", response_model=SupportTicketResponse)
async def get_support_ticket_details(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    all_tickets = await get_support_tickets_list()
    ticket = next((t for t in all_tickets if t.get("id") == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Support ticket '{ticket_id}' not found.")

    # Strict RBAC enforcement
    if current_user.get("role") in ["community_user", "Community User"] and ticket.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied. You can only view your own support tickets.")

    messages = await get_ticket_messages_list(ticket_id)
    ticket_copy = dict(ticket)
    if not ticket_copy.get("ticket_number"):
        ticket_copy["ticket_number"] = f"TKT-{ticket.get('id', '101')}"
    ticket_copy["messages"] = messages
    return ticket_copy


@app.post(f"{settings.API_V1_STR}/communication/tickets/{{ticket_id}}/reply", response_model=TicketMessageResponse)
async def reply_support_ticket(
    ticket_id: str,
    msg_in: TicketMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    all_tickets = await get_support_tickets_list()
    ticket = next((t for t in all_tickets if t.get("id") == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Support ticket '{ticket_id}' not found.")

    role = current_user.get("role")
    is_owner = ticket.get("user_id") == current_user["id"]
    is_staff = role in ["Admin", "Researcher", "Verification Officer"]

    if not is_owner and not is_staff:
        raise HTTPException(status_code=403, detail="Not authorized to participate in this ticket conversation.")

    now_str = datetime.utcnow().isoformat()
    msg_id = f"msg_{uuid.uuid4().hex[:8]}"

    msg_doc = {
        "id": msg_id,
        "ticket_id": ticket_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "sender_role": role,
        "message": msg_in.message,
        "attachment_url": msg_in.attachment_url,
        "created_at": now_str
    }

    # Automatically progress ticket status based on response
    new_status = ticket.get("status")
    assigned_id = ticket.get("assigned_to_id")
    assigned_name = ticket.get("assigned_to_name")
    assigned_role = ticket.get("assigned_to_role")

    if is_staff:
        new_status = TicketStatus.WAITING_USER.value
        # Auto-assign responding staff member if currently unassigned
        if not assigned_id:
            assigned_id = current_user["id"]
            assigned_name = current_user["name"]
            assigned_role = role
    else:
        if new_status in [TicketStatus.WAITING_USER.value, TicketStatus.RESOLVED.value, TicketStatus.OPEN.value]:
            new_status = TicketStatus.IN_PROGRESS.value

    ticket_updates = {
        "status": new_status,
        "assigned_to_id": assigned_id,
        "assigned_to_name": assigned_name,
        "assigned_to_role": assigned_role,
        "updated_at": now_str
    }

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.ticket_messages.insert_one(msg_doc.copy())
        await db_manager.db.support_tickets.update_one({"id": ticket_id}, {"$set": ticket_updates})
    else:
        db_manager.memory_store.setdefault("ticket_messages", {})[msg_id] = msg_doc.copy()
        if ticket_id in db_manager.memory_store.get("support_tickets", {}):
            db_manager.memory_store["support_tickets"][ticket_id].update(ticket_updates)

    # Deliver Notifications
    if is_staff:
        # Notify the ticket author
        await create_notification(
            user_id=ticket["user_id"],
            title=f"Expert Reply on {ticket.get('ticket_number', 'Ticket')}",
            message=f"{current_user['name']} ({role}) replied to '{ticket['subject']}'.",
            notif_type="reply",
            link=f"/communication?ticket={ticket_id}"
        )
    else:
        # User replied: notify the assigned staff or admins
        if assigned_id:
            await create_notification(
                user_id=assigned_id,
                title=f"User Reply on {ticket.get('ticket_number', 'Ticket')}",
                message=f"{current_user['name']} responded to '{ticket['subject']}'.",
                notif_type="reply",
                link=f"/communication?ticket={ticket_id}"
            )
        else:
            staff_list = await get_staff_users()
            for s in staff_list:
                if s["role"] == "Admin":
                    await create_notification(
                        user_id=s["id"],
                        title=f"User Reply on {ticket.get('ticket_number', 'Ticket')}",
                        message=f"{current_user['name']} responded to unassigned ticket '{ticket['subject']}'.",
                        notif_type="reply",
                        link=f"/communication?ticket={ticket_id}"
                    )

    return msg_doc


@app.patch(f"{settings.API_V1_STR}/communication/tickets/{{ticket_id}}/status", response_model=SupportTicketResponse)
async def update_ticket_status(
    ticket_id: str,
    status_in: SupportTicketStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    all_tickets = await get_support_tickets_list()
    ticket = next((t for t in all_tickets if t.get("id") == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Support ticket '{ticket_id}' not found.")

    role = current_user.get("role")
    is_owner = ticket.get("user_id") == current_user["id"]
    is_staff = role in ["Admin", "Researcher", "Verification Officer"]
    req_status = status_in.status.value if hasattr(status_in.status, "value") else str(status_in.status)

    if not is_staff:
        if not is_owner:
            raise HTTPException(status_code=403, detail="Not authorized to alter this ticket.")
        if req_status not in [TicketStatus.REOPENED.value, TicketStatus.CLOSED.value]:
            raise HTTPException(status_code=403, detail="Community members can only reopen a resolved ticket or close their own ticket.")

    now_str = datetime.utcnow().isoformat()
    updates = {
        "status": req_status,
        "updated_at": now_str
    }
    if req_status == TicketStatus.RESOLVED.value:
        updates["resolved_at"] = now_str
        if status_in.resolution_note:
            updates["resolution_note"] = status_in.resolution_note

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.support_tickets.update_one({"id": ticket_id}, {"$set": updates})
    else:
        if ticket_id in db_manager.memory_store.get("support_tickets", {}):
            db_manager.memory_store["support_tickets"][ticket_id].update(updates)

    ticket.update(updates)

    # Status change notification
    if is_staff and ticket.get("user_id"):
        await create_notification(
            user_id=ticket["user_id"],
            title=f"Ticket {ticket.get('ticket_number')} Status Changed",
            message=f"Status for '{ticket['subject']}' was updated to '{req_status}'.",
            notif_type="status_change",
            link=f"/communication?ticket={ticket_id}"
        )
    elif not is_staff and ticket.get("assigned_to_id"):
        await create_notification(
            user_id=ticket["assigned_to_id"],
            title=f"Ticket {ticket.get('ticket_number')} {req_status}",
            message=f"User {current_user['name']} set status to '{req_status}' for '{ticket['subject']}'.",
            notif_type="status_change",
            link=f"/communication?ticket={ticket_id}"
        )

    messages = await get_ticket_messages_list(ticket_id)
    ticket_copy = dict(ticket)
    if not ticket_copy.get("ticket_number"):
        ticket_copy["ticket_number"] = f"TKT-{ticket.get('id', '101')}"
    ticket_copy["messages"] = messages
    return ticket_copy


@app.post(f"{settings.API_V1_STR}/communication/tickets/{{ticket_id}}/assign", response_model=SupportTicketResponse)
async def assign_support_ticket(
    ticket_id: str,
    assign_in: SupportTicketAssign,
    current_user: dict = Depends(require_role(["Admin"]))
):
    all_tickets = await get_support_tickets_list()
    ticket = next((t for t in all_tickets if t.get("id") == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Support ticket '{ticket_id}' not found.")

    staff_users = await get_staff_users()
    target_staff = next((s for s in staff_users if s["id"] == assign_in.assigned_to_id), None)
    if not target_staff:
        raise HTTPException(status_code=404, detail=f"Staff member '{assign_in.assigned_to_id}' not found.")

    now_str = datetime.utcnow().isoformat()
    new_status = TicketStatus.ASSIGNED.value if ticket.get("status") == TicketStatus.OPEN.value else ticket.get("status")

    updates = {
        "assigned_to_id": target_staff["id"],
        "assigned_to_name": target_staff["name"],
        "assigned_to_role": target_staff["role"],
        "status": new_status,
        "priority": assign_in.priority or ticket.get("priority", "Medium"),
        "updated_at": now_str
    }

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.support_tickets.update_one({"id": ticket_id}, {"$set": updates})
    else:
        if ticket_id in db_manager.memory_store.get("support_tickets", {}):
            db_manager.memory_store["support_tickets"][ticket_id].update(updates)

    ticket.update(updates)

    # Notify assigned staff member
    await create_notification(
        user_id=target_staff["id"],
        title=f"Assigned Ticket: {ticket.get('ticket_number')}",
        message=f"Administrator assigned ticket '{ticket['subject']}' to you.",
        notif_type="assignment",
        link=f"/communication?ticket={ticket_id}"
    )

    # Notify community user
    if ticket.get("user_id"):
        await create_notification(
            user_id=ticket["user_id"],
            title=f"Expert Assigned: {ticket.get('ticket_number')}",
            message=f"{target_staff['name']} ({target_staff['role']}) has been assigned to help with your request.",
            notif_type="assignment",
            link=f"/communication?ticket={ticket_id}"
        )

    messages = await get_ticket_messages_list(ticket_id)
    ticket_copy = dict(ticket)
    if not ticket_copy.get("ticket_number"):
        ticket_copy["ticket_number"] = f"TKT-{ticket.get('id', '101')}"
    ticket_copy["messages"] = messages
    return ticket_copy


@app.get(f"{settings.API_V1_STR}/communication/staff", response_model=List[StaffMemberResponse])
async def list_staff_members(current_user: dict = Depends(get_current_user)):
    staff = await get_staff_users()
    all_tickets = await get_support_tickets_list()

    result = []
    for s in staff:
        active_cnt = sum(
            1 for t in all_tickets
            if t.get("assigned_to_id") == s["id"]
            and t.get("status") not in [TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value]
        )
        result.append(StaffMemberResponse(
            id=s["id"],
            name=s["name"],
            email=s["email"],
            role=s["role"],
            organization=s.get("organization"),
            active_tickets_count=active_cnt
        ))
    return result


@app.get(f"{settings.API_V1_STR}/communication/notifications")
async def list_notifications(
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    notifs = await get_notifications_list(current_user["id"], unread_only=unread_only)
    unread_count = sum(1 for n in notifs if not n.get("is_read", False))
    return {
        "unread_count": unread_count,
        "total": len(notifs),
        "notifications": notifs
    }


@app.patch(f"{settings.API_V1_STR}/communication/notifications/{{notif_id}}/read")
async def mark_notification_read(
    notif_id: str,
    current_user: dict = Depends(get_current_user)
):
    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.notifications.update_one(
            {"id": notif_id, "user_id": current_user["id"]},
            {"$set": {"is_read": True}}
        )
    else:
        if notif_id in db_manager.memory_store.get("notifications", {}):
            if db_manager.memory_store["notifications"][notif_id].get("user_id") == current_user["id"]:
                db_manager.memory_store["notifications"][notif_id]["is_read"] = True
    return {"message": "Notification marked as read."}


@app.post(f"{settings.API_V1_STR}/communication/notifications/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.notifications.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"is_read": True}}
        )
    else:
        for n in db_manager.memory_store.get("notifications", {}).values():
            if n.get("user_id") == current_user["id"]:
                n["is_read"] = True
    return {"message": "All notifications marked as read."}


@app.get(f"{settings.API_V1_STR}/communication/stats")
async def get_communication_stats(
    current_user: dict = Depends(require_role(["Admin", "Researcher", "Verification Officer"]))
):
    tickets = await get_support_tickets_list()
    total = len(tickets)

    open_cnt = sum(1 for t in tickets if t.get("status") == TicketStatus.OPEN.value)
    assigned_cnt = sum(1 for t in tickets if t.get("status") == TicketStatus.ASSIGNED.value)
    in_prog_cnt = sum(1 for t in tickets if t.get("status") == TicketStatus.IN_PROGRESS.value)
    wait_cnt = sum(1 for t in tickets if t.get("status") == TicketStatus.WAITING_USER.value)
    resolved_cnt = sum(1 for t in tickets if t.get("status") == TicketStatus.RESOLVED.value)
    closed_cnt = sum(1 for t in tickets if t.get("status") == TicketStatus.CLOSED.value)
    unassigned_cnt = sum(1 for t in tickets if not t.get("assigned_to_id"))

    by_category = {}
    for t in tickets:
        cat = t.get("category", "Other")
        by_category[cat] = by_category.get(cat, 0) + 1

    return {
        "total_tickets": total,
        "open_tickets": open_cnt,
        "assigned_tickets": assigned_cnt,
        "in_progress_tickets": in_prog_cnt,
        "waiting_user_tickets": wait_cnt,
        "resolved_tickets": resolved_cnt,
        "closed_tickets": closed_cnt,
        "unassigned_tickets": unassigned_cnt,
        "by_category": by_category,
        "average_response_time": "2.4 hours"
    }


@app.get(f"{settings.API_V1_STR}/community/dashboard", response_model=CommunityDashboardResponse)
async def get_community_dashboard(
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]

    # Retrieve user's personal planting projects
    user_projects = await get_planting_projects_list(user_id=user_id)
    total_projects = len(user_projects)
    total_plants = sum(p.get("number_of_plants", 0) for p in user_projects)

    # Retrieve user's monitoring logs
    user_records = await get_monitoring_records_list(user_id=user_id)

    latest_rec_by_proj = {}
    for r in sorted(user_records, key=lambda x: x.get("created_at", "")):
        latest_rec_by_proj[r.get("project_id")] = r

    total_surviving = 0
    total_area_sq_m = 0.0
    total_biomass_kg = 0.0
    total_carbon_kg = 0.0
    total_co2e_kg = 0.0

    sq_m_factors = {
        "sq_meters": 1.0,
        "sq_feet": 0.092903,
        "acres": 4046.86,
        "hectares": 10000.0
    }

    for p in user_projects:
        pid = p.get("id")
        p_plants = p.get("number_of_plants", 0)
        p_area = p.get("land_area", 0)
        p_unit = p.get("area_unit", "sq_meters")
        total_area_sq_m += p_area * sq_m_factors.get(p_unit, 1.0)

        if pid in latest_rec_by_proj:
            surv = latest_rec_by_proj[pid].get("surviving_plants", p_plants)
        else:
            pct = p.get("current_survival_pct", 100.0)
            surv = int(p_plants * (pct / 100.0))
        total_surviving += surv

        total_biomass_kg += p.get("estimated_biomass_kg", 0.0)
        total_carbon_kg += p.get("estimated_carbon_kg", 0.0)
        total_co2e_kg += p.get("estimated_co2e_kg", 0.0)

    survival_pct = round((total_surviving / total_plants * 100.0), 1) if total_plants > 0 else 0.0
    total_ha = round(total_area_sq_m * 0.0001, 3)

    # User's support tickets
    all_user_tickets = await get_support_tickets_list(user_id=user_id)
    open_tickets = sum(
        1 for t in all_user_tickets
        if t.get("status") not in [TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value]
    )

    # User's notifications
    notifs = await get_notifications_list(user_id=user_id)
    unread_notifs = sum(1 for n in notifs if not n.get("is_read", False))

    # Milestones summary
    milestones = []
    for r in sorted(user_records, key=lambda x: x.get("monitoring_date", ""), reverse=True)[:5]:
        p = next((pj for pj in user_projects if pj.get("id") == r.get("project_id")), None)
        milestones.append({
            "project_name": p.get("project_name", "Project") if p else "Project",
            "date": r.get("monitoring_date", ""),
            "stage": r.get("growth_stage", ""),
            "height_cm": r.get("plant_height_cm", 0.0),
            "survival_pct": r.get("survival_percentage", 0.0),
            "health": r.get("health_condition", "Good")
        })

    return CommunityDashboardResponse(
        user_info={
            "id": current_user["id"],
            "name": current_user["name"],
            "email": current_user["email"],
            "role": current_user["role"],
            "user_type": current_user.get("user_type", "Community User"),
            "location": f"{current_user.get('district', '')}, {current_user.get('state', '')}".strip(", ") or current_user.get("country", "India")
        },
        total_projects=total_projects,
        total_plants_planted=total_plants,
        total_surviving_plants=total_surviving,
        overall_survival_percentage=survival_pct,
        total_land_area_sq_m=round(total_area_sq_m, 1),
        total_land_area_ha=total_ha,
        estimated_carbon_tonnes=round(total_carbon_kg / 1000.0, 2),
        estimated_co2e_tonnes=round(total_co2e_kg / 1000.0, 2),
        my_projects=user_projects[:5],
        my_tickets=all_user_tickets[:5],
        active_tickets_count=open_tickets,
        unread_notifications_count=unread_notifs,
        recent_notifications=notifs[:5],
        growth_milestones_summary=milestones
    )


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database_connected": db_manager.is_connected,
        "blockchain_mode": blockchain_service.mode
    }
