import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "BlueCarbon MRV System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "bluecarbon_mrv")
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "bluecarbon-mrv-secret-key-2026-mca-research-token-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Blockchain
    BLOCKCHAIN_PROVIDER_URL: str = os.getenv("BLOCKCHAIN_PROVIDER_URL", "http://127.0.0.1:7545")
    CONTRACT_ADDRESS: str = os.getenv("CONTRACT_ADDRESS", "")
    FORCE_SIMULATED_LEDGER: bool = os.getenv("FORCE_SIMULATED_LEDGER", "false").lower() == "true"
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
