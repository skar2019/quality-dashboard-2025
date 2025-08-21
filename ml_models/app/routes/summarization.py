from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import SummarizationRequest, SummarizationResponse, ErrorResponse
from app.services.summarization import SummarizationService
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["summarization"])

# Initialize service
summarization_service = SummarizationService()

@router.post("/summarize", response_model=SummarizationResponse)
async def summarize_text(request: SummarizationRequest):
    """
    Generate a summary for the provided text using BART model.
    """
    try:
        logger.info(f"Processing summarization request for text length: {len(request.text)}")
        
        # Generate summary
        summary = summarization_service.summarize(
            text=request.text,
            max_length=request.max_length or settings.default_max_length,
            min_length=request.min_length or settings.default_min_length
        )
        
        logger.info(f"Successfully generated summary of length: {len(summary)}")
        
        return SummarizationResponse(
            summary=summary,
            original_length=len(request.text),
            summary_length=len(summary)
        )
        
    except Exception as e:
        logger.error(f"Error in summarization: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )

@router.get("/summarize/health")
async def health_check():
    """
    Health check endpoint for summarization service.
    """
    try:
        # Check if model is loaded
        summarization_service.load_model()
        return {"status": "healthy", "model_loaded": True}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unhealthy") 