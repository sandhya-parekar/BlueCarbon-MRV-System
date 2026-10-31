import json
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from app.config import settings

logger = logging.getLogger("bluecarbon_mrv.database")

class DatabaseManager:
    client: AsyncIOMotorClient = None
    db = None
    sync_client: MongoClient = None
    sync_db = None
    is_connected: bool = False
    
    # In-memory store fallback if MongoDB is unreachable
    memory_store: dict = {
        "users": {},
        "tree_measurements": [],
        "plot_biomass": {},
        "verification_tasks": {},
        "blockchain_registry": []
    }

db_manager = DatabaseManager()

async def connect_to_mongo():
    try:
        db_manager.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=2000
        )
        db_manager.db = db_manager.client[settings.DATABASE_NAME]
        
        # Test connection ping
        await db_manager.client.admin.command('ping')
        db_manager.is_connected = True
        logger.info(f"Connected to MongoDB successfully at {settings.MONGODB_URL}, DB: {settings.DATABASE_NAME}")
        
        # Sync client for batch pandas/numpy operations
        db_manager.sync_client = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
        db_manager.sync_db = db_manager.sync_client[settings.DATABASE_NAME]
        
        # Create indexes
        await db_manager.db.users.create_index("email", unique=True)
        await db_manager.db.tree_measurements.create_index([("plot_id", 1), ("tree_id", 1)])
        await db_manager.db.plot_biomass.create_index("plot_id", unique=True)
        await db_manager.db.blockchain_registry.create_index("plot_id")
        
    except Exception as e:
        db_manager.is_connected = False
        logger.warning(f"MongoDB connection failed: {e}. Falling back to internal memory-backed store.")

async def close_mongo_connection():
    if db_manager.client:
        db_manager.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    return db_manager.db
