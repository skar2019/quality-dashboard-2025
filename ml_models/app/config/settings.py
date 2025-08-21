import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application settings
    app_name: str = "ML Models API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS settings - fully configurable via env (no hardcoded defaults)
    allowed_origins: str = ""
    
    # Model settings
    default_max_length: int = 130
    default_min_length: int = 30
    cache_dir: str = "./data/model_cache"
    
    # Summarization model settings
    summarization_model_name: str = "facebook/bart-large-cnn"
    summarization_max_input_length: int = 1024
    summarization_length_penalty: float = 2.0
    summarization_num_beams: int = 4
    summarization_early_stopping: bool = True
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "app.log"
    
    # Database/Storage settings (for future use)
    database_url: str = ""
    redis_url: str = ""
    
    # Security settings (for future use)
    secret_key: str = ""
    access_token_expire_minutes: int = 30
    
    # Rate limiting (for future use)
    rate_limit_per_minute: int = 60
    
    # Model loading settings
    download_retries: int = 3
    download_timeout: int = 300
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        protected_namespaces = ('settings_',)
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Convert allowed_origins string to list"""
        if not self.allowed_origins:
            # For development, allow all origins if none configured
            return ["*"]
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

# Global settings instance
settings = Settings() 