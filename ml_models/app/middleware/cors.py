from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings

def setup_cors(app):
    """Setup CORS middleware"""
    # For development, allow all origins
    origins = ["*"] if not settings.allowed_origins_list else settings.allowed_origins_list
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,  # Set to False when using "*" for origins
        allow_methods=["*"],
        allow_headers=["*"],
    ) 