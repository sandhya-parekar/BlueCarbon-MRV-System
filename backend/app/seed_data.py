import os
import logging
import pandas as pd
from app.auth import get_password_hash
from app.database import db_manager
from app.services.biomass_service import vectorize_calculate_agb, aggregate_plot_biomass
from app.services.uncertainty_service import assess_uncertainty_all_plots
from app.services.prioritization_service import generate_verification_prioritization
from app.services.blockchain_service import blockchain_service
from app.services.planner_service import SPECIES_DATABASE, calculate_environmental_benefits

logger = logging.getLogger("bluecarbon_mrv.seed")

DEFAULT_USERS = [
    {
        "id": "admin_1",
        "name": "Dr. Sarah Jenkins (MRV Administrator)",
        "email": "admin@bluecarbon.org",
        "hashed_password": get_password_hash("Admin@123"),
        "role": "Admin",
        "organization": "Global Blue Carbon Consortium",
        "created_at": "2026-01-10T08:00:00Z"
    },
    {
        "id": "researcher_1",
        "name": "Prof. Arun Mukherjee (Mangrove Ecologist)",
        "email": "researcher@bluecarbon.org",
        "hashed_password": get_password_hash("Research@123"),
        "role": "Researcher",
        "organization": "Coastal Ecosystem Research Institute",
        "created_at": "2026-01-15T09:30:00Z"
    },
    {
        "id": "officer_1",
        "name": "Elena Rostova (Lead Verification Auditor)",
        "email": "officer@bluecarbon.org",
        "hashed_password": get_password_hash("Officer@123"),
        "role": "Verification Officer",
        "organization": "Independent Carbon Standard Registry",
        "created_at": "2026-02-01T10:00:00Z"
    },
    {
        "id": "community_1",
        "name": "Ramesh Patel (Coastal Mangrove Farmer)",
        "email": "community@bluecarbon.org",
        "hashed_password": get_password_hash("Community@123"),
        "role": "community_user",
        "organization": "Kutch Mangrove Planters Cooperative",
        "mobile_number": "+91 98250 12345",
        "country": "India",
        "state": "Gujarat",
        "district": "Kachchh",
        "user_type": "Farmer",
        "created_at": "2026-03-01T08:00:00Z"
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
            await db_manager.db.users.update_one(
                {"email": u["email"]},
                {"$set": u.copy()},
                upsert=True
            )
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
            
        # 5. Seed Plant Species & Initial Planting Projects
        logger.info("Seeding Plant Species reference database & sample Planting Projects...")
        await seed_planner_data()
            
        logger.info("Data seeding and calculations completed successfully.")

async def seed_planner_data():
    """Seeds plant species reference records and sample planting projects with monitoring records."""
    # 1. Species Reference Data
    if db_manager.is_connected and db_manager.db is not None:
        for sp in SPECIES_DATABASE:
            await db_manager.db.plant_species.update_one(
                {"id": sp["id"]},
                {"$set": sp.copy()},
                upsert=True
            )
    else:
        for sp in SPECIES_DATABASE:
            db_manager.memory_store["plant_species"][sp["id"]] = sp.copy()

    # 2. Get user ids to associate sample projects with
    users_list = []
    if db_manager.is_connected and db_manager.db is not None:
        cursor = db_manager.db.users.find({})
        users_list = await cursor.to_list(length=10)
    else:
        users_list = list(db_manager.memory_store["users"].values())

    admin_user = next((u for u in users_list if u.get("role") == "Admin"), users_list[0] if users_list else None)
    researcher_user = next((u for u in users_list if u.get("role") == "Researcher"), admin_user)
    officer_user = next((u for u in users_list if u.get("role") == "Verification Officer"), admin_user)
    community_user = next((u for u in users_list if u.get("role") in ["community_user", "Community User"]), admin_user)

    admin_id = str(admin_user.get("_id", admin_user.get("id", "admin_1"))) if admin_user else "admin_1"
    admin_name = admin_user.get("name", "Dr. Sarah Jenkins") if admin_user else "Dr. Sarah Jenkins"
    admin_email = admin_user.get("email", "admin@bluecarbon.org") if admin_user else "admin@bluecarbon.org"

    researcher_id = str(researcher_user.get("_id", researcher_user.get("id", "researcher_1"))) if researcher_user else "researcher_1"
    researcher_name = researcher_user.get("name", "Prof. Arun Mukherjee") if researcher_user else "Prof. Arun Mukherjee"
    researcher_email = researcher_user.get("email", "researcher@bluecarbon.org") if researcher_user else "researcher@bluecarbon.org"

    officer_id = str(officer_user.get("_id", officer_user.get("id", "officer_1"))) if officer_user else "officer_1"
    officer_name = officer_user.get("name", "Elena Rostova") if officer_user else "Elena Rostova"
    officer_email = officer_user.get("email", "officer@bluecarbon.org") if officer_user else "officer@bluecarbon.org"

    community_id = str(community_user.get("_id", community_user.get("id", "community_1"))) if community_user else "community_1"
    community_name = community_user.get("name", "Ramesh Patel") if community_user else "Ramesh Patel"
    community_email = community_user.get("email", "community@bluecarbon.org") if community_user else "community@bluecarbon.org"

    # Sample projects
    sample_projects = [
        {
            "id": "proj_sundarbans_01",
            "project_name": "Sundarbans Mudflat Mangrove Restoration",
            "country": "India",
            "state": "West Bengal",
            "district": "South 24 Parganas",
            "location_name": "Gosaba Island, Lower Sundarbans Delta",
            "species_id": "rhizophora_mucronata",
            "species_name": "Asiatic Mangrove / Loop-Root Mangrove",
            "scientific_name": "Rhizophora mucronata",
            "number_of_plants": 1200,
            "land_area": 5400.0,
            "area_unit": "sq_meters",
            "planting_date": "2024-07-15",
            "status": "Growing",
            "description": "Community-driven intertidal mudflat afforestation to establish a living green storm-surge barrier and sequester blue carbon.",
            "soil_type": "Saline Marine Mud/Clay",
            "water_condition": "Regular Tidal Inundation",
            "photos": [
                "https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80"
            ],
            "user_id": admin_id,
            "user_name": admin_name,
            "user_email": admin_email,
            "estimated_biomass_kg": 18240.0,
            "estimated_carbon_kg": 12850.0,
            "estimated_co2e_kg": 47116.0,
            "current_survival_pct": 91.6,
            "total_monitoring_logs": 3,
            "latest_height_cm": 135.0,
            "created_at": "2024-07-10T10:00:00Z",
            "updated_at": "2026-03-15T14:30:00Z"
        },
        {
            "id": "proj_pichavaram_02",
            "project_name": "Pichavaram Estuarine Rhizophora Expansion",
            "country": "India",
            "state": "Tamil Nadu",
            "district": "Cuddalore",
            "location_name": "Pichavaram Mangrove Forest Border",
            "species_id": "avicennia_marina",
            "species_name": "Grey Mangrove / White Mangrove",
            "scientific_name": "Avicennia marina",
            "number_of_plants": 800,
            "land_area": 5000.0,
            "area_unit": "sq_meters",
            "planting_date": "2025-08-10",
            "status": "Monitoring",
            "description": "Restoration of degraded hypersaline aquaculture fringe flats with high-salinity tolerant Grey Mangrove.",
            "soil_type": "Saline Marine Mud/Clay",
            "water_condition": "Regular Tidal Inundation",
            "photos": [
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
            ],
            "user_id": admin_id,
            "user_name": admin_name,
            "user_email": admin_email,
            "estimated_biomass_kg": 5400.0,
            "estimated_carbon_kg": 3618.0,
            "estimated_co2e_kg": 13266.0,
            "current_survival_pct": 88.5,
            "total_monitoring_logs": 2,
            "latest_height_cm": 82.0,
            "created_at": "2025-08-01T09:00:00Z",
            "updated_at": "2026-02-20T11:00:00Z"
        },
        {
            "id": "proj_bhitarkanika_03",
            "project_name": "Bhitarkanika High Tide Cyclone Buffer",
            "country": "India",
            "state": "Odisha",
            "district": "Kendrapara",
            "location_name": "Dhamra River Estuary Basin",
            "species_id": "sonneratia_apetala",
            "species_name": "Mangrove Apple / Keora",
            "scientific_name": "Sonneratia apetala",
            "number_of_plants": 1500,
            "land_area": 11250.0,
            "area_unit": "sq_meters",
            "planting_date": "2026-06-20",
            "status": "Planted",
            "description": "Rapid colonization of newly formed estuarine sandbars using fast-growing Sonneratia pioneer seedlings.",
            "soil_type": "Silty Alluvial",
            "water_condition": "Regular Tidal Inundation",
            "photos": [
                "https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=600&q=80"
            ],
            "user_id": researcher_id,
            "user_name": researcher_name,
            "user_email": researcher_email,
            "estimated_biomass_kg": 3750.0,
            "estimated_carbon_kg": 2380.0,
            "estimated_co2e_kg": 8726.0,
            "current_survival_pct": 94.7,
            "total_monitoring_logs": 1,
            "latest_height_cm": 42.0,
            "created_at": "2026-06-15T08:30:00Z",
            "updated_at": "2026-07-25T16:00:00Z"
        },
        {
            "id": "proj_sundari_04",
            "project_name": "Sundari Ecological Enrichment Project",
            "country": "India",
            "state": "West Bengal",
            "district": "South 24 Parganas",
            "location_name": "Kultali Riverine Buffer",
            "species_id": "heritiera_fomes",
            "species_name": "Sundari Tree",
            "scientific_name": "Heritiera fomes",
            "number_of_plants": 400,
            "land_area": 4000.0,
            "area_unit": "sq_meters",
            "planting_date": "2026-11-15",
            "status": "Planning",
            "description": "Conservation replanting of endangered climax Sundari trees in lower salinity upper estuarine channel fringes.",
            "soil_type": "Silty Alluvial",
            "water_condition": "Brackish/Tidal Surge",
            "photos": [],
            "user_id": admin_id,
            "user_name": admin_name,
            "user_email": admin_email,
            "estimated_biomass_kg": 1600.0,
            "estimated_carbon_kg": 1120.0,
            "estimated_co2e_kg": 4106.0,
            "current_survival_pct": 100.0,
            "total_monitoring_logs": 0,
            "latest_height_cm": 35.0,
            "created_at": "2026-10-05T12:00:00Z",
            "updated_at": "2026-10-20T10:00:00Z"
        }
    ]

    sample_monitoring = [
        # Monitoring for Sundarbans Project
        {
            "id": "mon_sb_01",
            "project_id": "proj_sundarbans_01",
            "user_id": admin_id,
            "monitoring_date": "2024-10-20",
            "plant_height_cm": 62.0,
            "surviving_plants": 1160,
            "dead_plants": 40,
            "survival_percentage": 96.67,
            "health_condition": "Excellent",
            "soil_condition": "Moist Saline Mud",
            "water_condition": "Optimal Tidal Inundation",
            "photo_url": "https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=600&q=80",
            "observations": "Initial establishment successful; primary roots anchored well. Minimal crab damage noted on lower stem.",
            "recommended_actions": ["Maintain tidal flushing channel", "Inspect for barnacle settlement on hypocotyl"],
            "recorded_by": admin_email,
            "created_at": "2024-10-20T11:00:00Z"
        },
        {
            "id": "mon_sb_02",
            "project_id": "proj_sundarbans_01",
            "user_id": admin_id,
            "monitoring_date": "2025-05-18",
            "plant_height_cm": 95.0,
            "surviving_plants": 1120,
            "dead_plants": 40,
            "survival_percentage": 93.33,
            "health_condition": "Good",
            "soil_condition": "Firming Silt",
            "water_condition": "Regular Tidal Inundation",
            "photo_url": "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80",
            "observations": "Active branch flushing; aerial stilt root precursors emerging above substrate level.",
            "recommended_actions": ["Clear drifting plastic rubbish from stilt roots", "Continue monthly visual health check"],
            "recorded_by": admin_email,
            "created_at": "2025-05-18T10:30:00Z"
        },
        {
            "id": "mon_sb_03",
            "project_id": "proj_sundarbans_01",
            "user_id": admin_id,
            "monitoring_date": "2026-03-15",
            "plant_height_cm": 135.0,
            "surviving_plants": 1100,
            "dead_plants": 20,
            "survival_percentage": 91.67,
            "health_condition": "Excellent",
            "soil_condition": "Consolidated Mangrove Peat Mud",
            "water_condition": "Daily Semi-Diurnal Flushing",
            "photo_url": "https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=600&q=80",
            "observations": "Robust stilt arch formation. Mudskippers and juvenile crabs extensively colonizing the root zone.",
            "recommended_actions": ["Infill planting not required as survival exceeds 90%", "Plan biomass measurement survey next quarter"],
            "recorded_by": admin_email,
            "created_at": "2026-03-15T14:30:00Z"
        },
        # Monitoring for Pichavaram Project
        {
            "id": "mon_pv_01",
            "project_id": "proj_pichavaram_02",
            "user_id": admin_id,
            "monitoring_date": "2025-11-12",
            "plant_height_cm": 55.0,
            "surviving_plants": 740,
            "dead_plants": 60,
            "survival_percentage": 92.5,
            "health_condition": "Good",
            "soil_condition": "Saline Clay",
            "water_condition": "High Salinity Tidal",
            "photo_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
            "observations": "Cryptoviviparous seeds shed coats cleanly. Healthy salt excretion crystals on underside of leaves.",
            "recommended_actions": ["Flush canals with fresh brackish surge", "Clear algal mats"],
            "recorded_by": admin_email,
            "created_at": "2025-11-12T09:15:00Z"
        },
        {
            "id": "mon_pv_02",
            "project_id": "proj_pichavaram_02",
            "user_id": admin_id,
            "monitoring_date": "2026-02-20",
            "plant_height_cm": 82.0,
            "surviving_plants": 708,
            "dead_plants": 32,
            "survival_percentage": 88.5,
            "health_condition": "Good",
            "soil_condition": "Consolidated Saline Clay",
            "water_condition": "Normal Tidal Inundation",
            "photo_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
            "observations": "Pneumatophore pencil roots beginning to poke through surface mud around main stem base.",
            "recommended_actions": ["Avoid sediment piling over breathing roots", "Continue quarterly monitoring"],
            "recorded_by": admin_email,
            "created_at": "2026-02-20T11:00:00Z"
        },
        # Monitoring for Bhitarkanika Project
        {
            "id": "mon_bk_01",
            "project_id": "proj_bhitarkanika_03",
            "user_id": researcher_id,
            "monitoring_date": "2026-07-25",
            "plant_height_cm": 42.0,
            "surviving_plants": 1420,
            "dead_plants": 80,
            "survival_percentage": 94.67,
            "health_condition": "Excellent",
            "soil_condition": "Fresh Silt Alluvium",
            "water_condition": "Monsoon Freshwater Flush",
            "photo_url": "https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=600&q=80",
            "observations": "Rapid pioneer root establishment in soft new river silt. Exceptional seedling vigor.",
            "recommended_actions": ["Monitor for strong tidal bore shearing during August king tides"],
            "recorded_by": researcher_email,
            "created_at": "2026-07-25T16:00:00Z"
        },
        # Monitoring for Community Project (Kutch)
        {
            "id": "mon_kc_01",
            "project_id": "proj_kutch_04",
            "user_id": community_id,
            "monitoring_date": "2026-03-01",
            "plant_height_cm": 75.0,
            "surviving_plants": 1660,
            "dead_plants": 140,
            "survival_percentage": 92.22,
            "health_condition": "Excellent",
            "soil_condition": "Consolidated Marine Mud",
            "water_condition": "Daily Tidal Surge",
            "photo_url": "https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=600&q=80",
            "observations": "Dense radial pneumatophore pencil roots spreading well. Zero cattle grazing damage after cooperative fence repair.",
            "recommended_actions": ["Keep tidal inflow channels clear of silt", "Plan Year 2 biomass measurement"],
            "recorded_by": community_email,
            "created_at": "2026-03-01T14:00:00Z"
        }
    ]

    # Sample Support Tickets
    sample_tickets = [
        {
            "id": "tkt_101",
            "ticket_number": "TKT-0101",
            "user_id": community_id,
            "user_name": community_name,
            "user_email": community_email,
            "subject": "Barnacle Encrustation on Young Avicennia Saplings",
            "category": "Plant diseases",
            "description": "We noticed small white barnacles forming on the lower hypocotyl stems of 6-month-old Avicennia saplings after high spring tides. Is this harmful to respiration and how should our cooperative safely remove them?",
            "location": "Mandvi Creek, Kachchh, Gujarat",
            "attachment_url": "https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=600&q=80",
            "status": "In Progress",
            "priority": "Normal",
            "assigned_to_id": researcher_id,
            "assigned_to_name": researcher_name,
            "assigned_to_role": "Researcher",
            "planting_details": {"species": "Avicennia marina", "age": "6 months"},
            "created_at": "2026-03-02T09:30:00Z",
            "updated_at": "2026-03-03T11:45:00Z",
            "resolved_at": None,
            "closed_at": None,
            "reopened_count": 0,
            "latest_reply_at": "2026-03-03T11:45:00Z",
            "unread_for_user": False,
            "unread_for_staff": True,
            "messages_count": 3
        },
        {
            "id": "tkt_102",
            "ticket_number": "TKT-0102",
            "user_id": community_id,
            "user_name": community_name,
            "user_email": community_email,
            "subject": "Request Planting Assistance: Mudflat Spacing & Silt Canal Layout",
            "category": "Planting assistance",
            "description": "We have 1.5 hectares of intertidal mudflat along Mandvi creek. We want to plant 3,000 Rhizophora and Avicennia trees. How should we space the tidal canals to avoid hypersaline ponding?",
            "location": "Mandvi Coastal Belt, Gujarat",
            "attachment_url": None,
            "status": "Assigned",
            "priority": "High",
            "assigned_to_id": researcher_id,
            "assigned_to_name": researcher_name,
            "assigned_to_role": "Researcher",
            "planting_details": {
                "species": "Avicennia marina & Rhizophora mucronata",
                "land_area": 15000,
                "plants": 3000,
                "soil": "Saline Marine Mud",
                "water": "Regular Tidal Inundation"
            },
            "created_at": "2026-03-05T14:15:00Z",
            "updated_at": "2026-03-05T14:30:00Z",
            "resolved_at": None,
            "closed_at": None,
            "reopened_count": 0,
            "latest_reply_at": "2026-03-05T14:15:00Z",
            "unread_for_user": False,
            "unread_for_staff": True,
            "messages_count": 1
        },
        {
            "id": "tkt_103",
            "ticket_number": "TKT-0103",
            "user_id": community_id,
            "user_name": community_name,
            "user_email": community_email,
            "subject": "Verification Audit Inquiry: Photographic Evidence Requirements for Carbon Credits",
            "category": "Technical assistance",
            "description": "Our cooperative completed Year 1 monitoring. What photographic and geo-tagged proof is required before a verification officer audits our plot for the blockchain registry?",
            "location": "Kachchh Intertidal Zone",
            "attachment_url": None,
            "status": "Waiting for User",
            "priority": "Normal",
            "assigned_to_id": officer_id,
            "assigned_to_name": officer_name,
            "assigned_to_role": "Verification Officer",
            "planting_details": None,
            "created_at": "2026-03-04T10:00:00Z",
            "updated_at": "2026-03-04T16:20:00Z",
            "resolved_at": None,
            "closed_at": None,
            "reopened_count": 0,
            "latest_reply_at": "2026-03-04T16:20:00Z",
            "unread_for_user": True,
            "unread_for_staff": False,
            "messages_count": 2
        }
    ]

    # Sample Ticket Messages
    sample_messages = [
        # Messages for Ticket 101
        {
            "id": "msg_101_1",
            "ticket_id": "tkt_101",
            "sender_id": community_id,
            "sender_name": community_name,
            "sender_email": community_email,
            "sender_role": "Community User",
            "message": "We noticed small white barnacles forming on the lower hypocotyl stems of 6-month-old Avicennia saplings after high spring tides. Is this harmful to respiration and how should our cooperative safely remove them?",
            "attachment_url": "https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=600&q=80",
            "created_at": "2026-03-02T09:30:00Z"
        },
        {
            "id": "msg_101_2",
            "ticket_id": "tkt_101",
            "sender_id": researcher_id,
            "sender_name": researcher_name,
            "sender_email": researcher_email,
            "sender_role": "Researcher",
            "message": "Hello Ramesh. Barnacles (Balanus spp.) can block lenticels (gas-exchange pores) on green bark if they become dense. During low spring tide, use a smooth wooden scraper or coconut husk to gently scrape them off without cutting into the green cambium tissue. Do NOT use chemical biocides as they harm juvenile mud crabs.",
            "attachment_url": None,
            "created_at": "2026-03-02T15:00:00Z"
        },
        {
            "id": "msg_101_3",
            "ticket_id": "tkt_101",
            "sender_id": community_id,
            "sender_name": community_name,
            "sender_email": community_email,
            "sender_role": "Community User",
            "message": "Thank you Prof. Mukherjee! Our cooperative volunteers used wooden spatulas on 300 saplings today. The bark is undamaged and breathing pores are clear.",
            "attachment_url": None,
            "created_at": "2026-03-03T11:45:00Z"
        },
        # Messages for Ticket 102
        {
            "id": "msg_102_1",
            "ticket_id": "tkt_102",
            "sender_id": community_id,
            "sender_name": community_name,
            "sender_email": community_email,
            "sender_role": "Community User",
            "message": "We have 1.5 hectares of intertidal mudflat along Mandvi creek. We want to plant 3,000 Rhizophora and Avicennia trees. How should we space the tidal canals to avoid hypersaline ponding?",
            "attachment_url": None,
            "created_at": "2026-03-05T14:15:00Z"
        },
        # Messages for Ticket 103
        {
            "id": "msg_103_1",
            "ticket_id": "tkt_103",
            "sender_id": community_id,
            "sender_name": community_name,
            "sender_email": community_email,
            "sender_role": "Community User",
            "message": "Our cooperative completed Year 1 monitoring. What photographic and geo-tagged proof is required before a verification officer audits our plot for the blockchain registry?",
            "attachment_url": None,
            "created_at": "2026-03-04T10:00:00Z"
        },
        {
            "id": "msg_103_2",
            "ticket_id": "tkt_103",
            "sender_id": officer_id,
            "sender_name": officer_name,
            "sender_email": officer_email,
            "sender_role": "Verification Officer",
            "message": "Hello Ramesh. For verification prioritization and blockchain anchoring, please upload: 1) Four cardinal photo directions (N, S, E, W) taken from the center GPS marker; 2) Stem diameter measurements of 20 randomly tagged saplings; and 3) A brief water salinity log.",
            "attachment_url": None,
            "created_at": "2026-03-04T16:20:00Z"
        }
    ]

    # Sample Notifications
    sample_notifications = [
        {
            "id": "notif_01",
            "user_id": community_id,
            "title": "Expert Reply on Ticket #103",
            "message": "Verification Officer Elena Rostova replied to: 'Verification Audit Inquiry: Photographic Evidence Requirements'.",
            "category": "ticket_reply",
            "related_id": "tkt_103",
            "is_read": False,
            "created_at": "2026-03-04T16:20:00Z"
        },
        {
            "id": "notif_02",
            "user_id": community_id,
            "title": "Ticket Assigned to Specialist",
            "message": "Your request #102 'Mudflat Spacing & Silt Canal Layout' was assigned to Prof. Arun Mukherjee.",
            "category": "ticket_assigned",
            "related_id": "tkt_102",
            "is_read": True,
            "created_at": "2026-03-05T14:30:00Z"
        },
        {
            "id": "notif_03",
            "user_id": researcher_id,
            "title": "New Community Assistance Request",
            "message": "Ramesh Patel requested planting advice for 3,000 mangrove saplings in Mandvi.",
            "category": "ticket_created",
            "related_id": "tkt_102",
            "is_read": False,
            "created_at": "2026-03-05T14:15:00Z"
        },
        {
            "id": "notif_04",
            "user_id": officer_id,
            "title": "Audit Evidence Inquiry",
            "message": "Ticket #103 regarding carbon credit evidence is waiting for community reply.",
            "category": "status_changed",
            "related_id": "tkt_103",
            "is_read": True,
            "created_at": "2026-03-04T16:20:00Z"
        },
        {
            "id": "notif_05",
            "user_id": admin_id,
            "title": "System Communication Summary",
            "message": "3 active community assistance tickets open in Communication Centre.",
            "category": "system",
            "related_id": None,
            "is_read": False,
            "created_at": "2026-03-05T15:00:00Z"
        }
    ]

    # Add community project to sample_projects
    sample_projects.append({
        "id": "proj_kutch_04",
        "project_name": "Kutch Creek Avicennia Coastal Shield",
        "country": "India",
        "state": "Gujarat",
        "district": "Kachchh",
        "location_name": "Mandvi Tidal Creek Mudflat",
        "species_id": "avicennia_marina",
        "species_name": "Grey Mangrove / White Mangrove",
        "scientific_name": "Avicennia marina",
        "number_of_plants": 1800,
        "land_area": 11250.0,
        "area_unit": "sq_meters",
        "planting_date": "2025-09-01",
        "status": "Growing",
        "description": "Farmer-led community mangrove belt to protect coastal grazing lands from salt intrusion and store blue carbon.",
        "soil_type": "Saline Marine Mud/Clay",
        "water_condition": "Regular Tidal Inundation",
        "photos": [
            "https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=600&q=80"
        ],
        "user_id": community_id,
        "user_name": community_name,
        "user_email": community_email,
        "estimated_biomass_kg": 12150.0,
        "estimated_carbon_kg": 8140.0,
        "estimated_co2e_kg": 29846.0,
        "current_survival_pct": 92.2,
        "total_monitoring_logs": 2,
        "latest_height_cm": 75.0,
        "created_at": "2025-08-20T10:00:00Z",
        "updated_at": "2026-03-01T14:00:00Z"
    })

    # Save all to MongoDB or Memory Store
    if db_manager.is_connected and db_manager.db is not None:
        for prj in sample_projects:
            await db_manager.db.planting_projects.update_one(
                {"id": prj["id"]},
                {"$set": prj.copy()},
                upsert=True
            )
        for mon in sample_monitoring:
            await db_manager.db.plant_monitoring.update_one(
                {"id": mon["id"]},
                {"$set": mon.copy()},
                upsert=True
            )
        for tkt in sample_tickets:
            await db_manager.db.support_tickets.update_one(
                {"id": tkt["id"]},
                {"$set": tkt.copy()},
                upsert=True
            )
        for msg in sample_messages:
            await db_manager.db.ticket_messages.update_one(
                {"id": msg["id"]},
                {"$set": msg.copy()},
                upsert=True
            )
        for ntf in sample_notifications:
            await db_manager.db.notifications.update_one(
                {"id": ntf["id"]},
                {"$set": ntf.copy()},
                upsert=True
            )
        logger.info(f"Seeded {len(sample_projects)} planting projects, {len(sample_monitoring)} monitoring records, {len(sample_tickets)} tickets, {len(sample_messages)} messages, and {len(sample_notifications)} notifications into MongoDB.")
    else:
        for prj in sample_projects:
            db_manager.memory_store["planting_projects"][prj["id"]] = prj.copy()
        for mon in sample_monitoring:
            db_manager.memory_store["plant_monitoring"][mon["id"]] = mon.copy()
        for tkt in sample_tickets:
            db_manager.memory_store["support_tickets"][tkt["id"]] = tkt.copy()
        for msg in sample_messages:
            db_manager.memory_store["ticket_messages"][msg["id"]] = msg.copy()
        for ntf in sample_notifications:
            db_manager.memory_store["notifications"][ntf["id"]] = ntf.copy()
        logger.info(f"Seeded {len(sample_projects)} planting projects, {len(sample_monitoring)} monitoring records, {len(sample_tickets)} tickets, {len(sample_messages)} messages, and {len(sample_notifications)} notifications into Memory Store.")
