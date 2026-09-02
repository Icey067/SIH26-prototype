import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Samanvay-AI Indian Railways Engine"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    
    # Database URL
    DATABASE_URL: str = "sqlite:///./samanvay.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    DEFAULT_DIVISION: str = "Prayagraj (NCR)"
    DEFAULT_CORRIDOR: str = "Ghaziabad - Kanpur Main Line"

    # External Live APIs
    GEMINI_API_KEY: Union[str, None] = None
    GEMINI_MODEL: str = "gemini-1.5-pro"
    RAPIDAPI_KEY: Union[str, None] = None
    RAPIDAPI_HOST: str = "indian-railways-info.p.rapidapi.com"
    OPENWEATHER_API_KEY: Union[str, None] = None
    SUPABASE_URL: Union[str, None] = None
    SUPABASE_KEY: Union[str, None] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
