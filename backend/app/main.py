from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
import app.models # Register all SQLAlchemy models
from app.api.v1.api_router import api_router

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Standardized CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health"])
def root():
    return {
        "system": "Samanvay-AI Indian Railways Engine",
        "status": "OPERATIONAL",
        "division": settings.DEFAULT_DIVISION,
        "corridor": settings.DEFAULT_CORRIDOR,
        "docs": "/docs"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "database": "connected"}
