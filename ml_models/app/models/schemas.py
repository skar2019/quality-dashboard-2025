from pydantic import BaseModel, Field
from typing import Optional

class SummarizationRequest(BaseModel):
    text: str = Field(..., description="Text to summarize", min_length=1)
    max_length: Optional[int] = Field(130, description="Maximum length of summary", ge=10, le=500)
    min_length: Optional[int] = Field(30, description="Minimum length of summary", ge=5, le=200)

class SummarizationResponse(BaseModel):
    summary: str = Field(..., description="Generated summary")
    original_length: int = Field(..., description="Length of original text")
    summary_length: int = Field(..., description="Length of generated summary")

class HealthResponse(BaseModel):
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    models_loaded: list = Field(..., description="List of loaded models")

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information") 