import os
import logging
import pandas as pd
from app.auth import get_password_hash
from app.database import db_manager
from app.services.biomass_service import vectorize_calculate_agb, aggregate_plot_biomass
from app.services.uncertainty_service import assess_uncertainty_all_plots
from app.services.prioritization_service import generate_verification_prioritization
from app.services.blockchain_service import blockchain_service

logger = logging.getLogger("bluecarbon_mrv.seed")

DEFAULT_USERS = [
    {
        "name": "Dr. Sarah Jenkins (MRV Administrator)",
        "email": "admin@bluecarbon.org",
        "hashed_password": get_password_hash("Admin@123"),
        "role": "Admin",
        "organization": "Global Blue Carbon Consortium",
        "created_at": "2026-01-10T08:00:00Z"
    },
    {
        "name": "Prof. Arun Mukherjee (Mangrove Ecologist)",
        "email": "researcher@bluecarbon.org",
        "hashed_password": get_password_hash("Research@123"),
        "role": "Researcher",
        "organization": "Coastal Ecosystem Research Institute",
        "created_at": "2026-01-15T09:30:00Z"
    },
    {
        "name": "Elena Rostova (Lead Verification Auditor)",
        "email": "officer@bluecarbon.org",
        "hashed_password": get_password_hash("Officer@123"),
        "role": "Verification Officer",
        "organization": "Independent Carbon Standard Registry",
        "created_at": "2026-02-01T10:00:00Z"
    }
]

async def seed_initial_data():
    """
    Populates MongoDB and memory store with users, tree records, computed AGB,
    uncertainty bounds, priority rankings, and initial blockchain transactions.
    """
    logger.info("Initializing system data and user accounts...")
    
    # 1. Seed Users
    if db_manager.is_connected and db_manager.db is not None:
        for u in DEFAULT_USERS:
            existing = await db_manager.db.users.find_one({"email": u["email"]})
            if not existing:
                await db_manager.db.users.insert_one(u.copy())
    else:
        for u in DEFAULT_USERS:
            db_manager.memory_store["users"][u["email"]] = u.copy()
            
    # 2. Check if Tree Measurements exist
    dataset_csv = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "dataset",
        "mangrove_field_measurements_118plots.csv"
    )
    
    if not os.path.exists(dataset_csv):
        from dataset.generate_dataset import generate_mangrove_dataset
        generate_mangrove_dataset(dataset_csv)
        
    df = pd.read_csv(dataset_csv)
    
    # Check count in DB
    existing_trees_count = 0
    if db_manager.is_connected and db_manager.db is not None:
        existing_trees_count = await db_manager.db.tree_measurements.count_documents({})
        
    if existing_trees_count == 0 or not db_manager.is_connected:
        # Vectorize AGB calculation using Chave et al. (2014)
        df = vectorize_calculate_agb(df)
        records = df.to_dict(orient="records")
        
        if db_manager.is_connected and db_manager.db is not None:
            await db_manager.db.tree_measurements.delete_many({})
            await db_manager.db.tree_measurements.insert_many(records)
            logger.info(f"Loaded {len(records)} mangrove tree records into MongoDB.")
        else:
            db_manager.memory_store["tree_measurements"] = records
            logger.info(f"Loaded {len(records)} mangrove tree records into memory store.")
            
        # 3. Compute Plot-level biomass, uncertainty, and prioritization
        logger.info("Computing initial plot biomass and bootstrap uncertainty (2000 runs)...")
        uncertainty_df = assess_uncertainty_all_plots(df, n_bootstraps=2000)
        prioritized_df = generate_verification_prioritization(uncertainty_df, df)
        
        # Merge with plot coordinates
        plot_stats = aggregate_plot_biomass(df)
        merged = prioritized_df.merge(
            plot_stats[['plot_id', 'latitude', 'longitude', 'mean_dbh_cm', 'mean_height_m', 'mean_wood_density', 'agb_density_mg_ha']],
            on='plot_id',
            how='left'
        )
        
        plot_records = merged.to_dict(orient="records")
        
        if db_manager.is_connected and db_manager.db is not None:
            await db_manager.db.plot_biomass.delete_many({})
            await db_manager.db.plot_biomass.insert_many(plot_records)
        else:
            for pr in plot_records:
                db_manager.memory_store["plot_biomass"][pr["plot_id"]] = pr
                
        # 4. Register initial High Priority plots to Blockchain Registry
        logger.info("Anchoring initial baseline records to Blockchain Registry...")
        high_priority_plots = [p for p in plot_records if p.get("priority_level") == "High Priority"][:15]
        for hp in high_priority_plots:
            await blockchain_service.register_biomass_record(
                plot_id=hp["plot_id"],
                estimated_agb_kg=hp["estimated_agb_kg"],
                lower_ci_kg=hp["lower_ci_95_kg"],
                upper_ci_kg=hp["upper_ci_95_kg"],
                relative_uncertainty_pct=hp["relative_uncertainty_pct"],
                composite_priority_score=hp["composite_priority_score"],
                priority_level=hp["priority_level"],
                raw_evidence_str=f"{hp['region']}-{hp['plot_type']}-trees:{hp['tree_count']}"
            )
            
        logger.info("Data seeding and calculations completed successfully.")
