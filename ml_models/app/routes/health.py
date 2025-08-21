from fastapi import APIRouter
from app.models.schemas import HealthResponse
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    General health check endpoint.
    """
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        models_loaded=["summarization"]  # Add more models as they're implemented
    )

@router.get("/")
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    } 