from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from app.config.settings import settings
from app.middleware.cors import setup_cors
from app.routes import summarization, health, chatbot, summary_report
from app.utils.logger import setup_logging
import logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="ML Models API for various AI/ML services",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Setup middleware
setup_cors(app)

# Include routers
app.include_router(health.router)
app.include_router(summarization.router)
app.include_router(chatbot.router)
app.include_router(summary_report.router)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTP exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting {settings.app_name} on {settings.host}:{settings.port}")
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    ) 