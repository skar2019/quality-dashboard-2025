# ML Models API Service

A production-ready FastAPI service for various AI/ML models with **fully dynamic configuration** and extensible architecture.

## 🚀 Key Features

- **🔧 Fully Dynamic Configuration**: Everything configurable via environment variables
- **📈 Extensible Architecture**: Easy to add new ML models and features
- **🏭 Production Ready**: Proper error handling, logging, and configuration
- **📚 API Documentation**: Automatic OpenAPI/Swagger documentation
- **💚 Health Checks**: Built-in health monitoring endpoints
- **🌐 CORS Support**: Configurable CORS for frontend integration
- **📊 Logging**: Comprehensive logging with configurable levels

## Project Structure

```
ml_models/
├── app/
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py          # Dynamic configuration management
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── cors.py              # CORS middleware
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py           # Pydantic schemas
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py            # Health check routes
│   │   └── summarization.py     # Summarization routes
│   ├── services/
│   │   ├── __init__.py
│   │   └── summarization.py     # Summarization service
│   └── utils/
│       ├── __init__.py
│       └── logger.py            # Logging utilities
├── data/
│   └── model_cache/             # Model cache directory
├── main.py                      # Application entry point
├── requirements.txt             # Python dependencies
├── .env.example                 # Configuration template
└── README.md                    # This file
```

## 🔧 Dynamic Configuration

**Everything is configurable via environment variables!** No hardcoded values.

### Quick Start (No .env needed)
```bash
cd ml_models
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Custom Configuration
Create `.env` file from template:
```bash
cp .env.example .env
# Edit .env with your settings
```

## 📋 Configuration Options

### Application Settings
- `APP_NAME`: Application name
- `APP_VERSION`: Application version  
- `DEBUG`: Debug mode (true/false)

### Server Settings
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)

### CORS Settings
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins

### Model Settings
- `DEFAULT_MAX_LENGTH`: Default summary max length
- `DEFAULT_MIN_LENGTH`: Default summary min length
- `MODEL_CACHE_DIR`: Model cache directory

### Summarization Model Settings
- `SUMMARIZATION_MODEL_NAME`: HuggingFace model name
- `SUMMARIZATION_MAX_INPUT_LENGTH`: Max input token length
- `SUMMARIZATION_LENGTH_PENALTY`: Generation length penalty
- `SUMMARIZATION_NUM_BEAMS`: Number of beams for generation
- `SUMMARIZATION_EARLY_STOPPING`: Early stopping flag

### Logging Settings
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)
- `LOG_FILE`: Log file path

## 🎯 Configuration Examples

### Development Setup
```bash
DEBUG=true
PORT=8001
LOG_LEVEL=DEBUG
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Production Setup
```bash
DEBUG=false
PORT=8000
LOG_LEVEL=WARNING
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### Custom Model Configuration
```bash
SUMMARIZATION_MODEL_NAME=facebook/bart-base-cnn
SUMMARIZATION_MAX_INPUT_LENGTH=512
DEFAULT_MAX_LENGTH=100
MODEL_CACHE_DIR=/path/to/your/model/cache
```

## 🚀 Running the Service

### Development
```bash
uvicorn main:app --reload --port 8000
```

### Production
```bash
python main.py
```

### With Custom Environment
```bash
PORT=8001 DEBUG=true uvicorn main:app --reload
```

The service will start on http://localhost:8000 (or your configured port)

## 📚 API Endpoints

### Health Check
- `GET /health` - Service health status
- `GET /` - API information

### Text Summarization
- `POST /api/summarize` - Generate text summary
- `GET /api/summarize/health` - Summarization service health

### Documentation
- `GET /docs` - Swagger UI documentation
- `GET /redoc` - ReDoc documentation

## 🔄 Adding New Features

### 1. Add a New Service
Create a new service in `app/services/`:
```python
# app/services/new_feature.py
from app.config.settings import settings

class NewFeatureService:
    def __init__(self):
        self.model_name = settings.new_feature_model_name  # Add to settings
        # Initialize your model/service
        pass
    
    def process(self, input_data):
        # Your processing logic
        return result
```

### 2. Add Configuration
Add new settings to `app/config/settings.py`:
```python
# Add to Settings class
new_feature_model_name: str = "default-model-name"
new_feature_param: int = 100
```

### 3. Add Schemas
Add request/response models in `app/models/schemas.py`:
```python
class NewFeatureRequest(BaseModel):
    input: str = Field(..., description="Input data")

class NewFeatureResponse(BaseModel):
    result: str = Field(..., description="Processing result")
```

### 4. Add Routes
Create a new route file in `app/routes/`:
```python
# app/routes/new_feature.py
from fastapi import APIRouter
from app.models.schemas import NewFeatureRequest, NewFeatureResponse
from app.services.new_feature import NewFeatureService

router = APIRouter(prefix="/api", tags=["new-feature"])
service = NewFeatureService()

@router.post("/new-feature", response_model=NewFeatureResponse)
async def process_new_feature(request: NewFeatureRequest):
    result = service.process(request.input)
    return NewFeatureResponse(result=result)
```

### 5. Register Routes
Add the new router to `main.py`:
```python
from app.routes import new_feature

app.include_router(new_feature.router)
```

## 📊 Model Details

### Text Summarization
- **Model**: Configurable via `SUMMARIZATION_MODEL_NAME`
- **Type**: Sequence-to-sequence model fine-tuned for summarization
- **Max input length**: Configurable via `SUMMARIZATION_MAX_INPUT_LENGTH`
- **Default output length**: Configurable via `DEFAULT_MAX_LENGTH`/`DEFAULT_MIN_LENGTH`

## 🔍 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | "ML Models API" | Application name |
| `APP_VERSION` | "1.0.0" | Application version |
| `DEBUG` | false | Debug mode |
| `HOST` | "0.0.0.0" | Server host |
| `PORT` | 8000 | Server port |
| `ALLOWED_ORIGINS` | localhost URLs | CORS allowed origins |
| `DEFAULT_MAX_LENGTH` | 130 | Default summary max length |
| `DEFAULT_MIN_LENGTH` | 30 | Default summary min length |
| `MODEL_CACHE_DIR` | "./data/model_cache" | Model cache directory |
| `SUMMARIZATION_MODEL_NAME` | "facebook/bart-large-cnn" | HuggingFace model name |
| `SUMMARIZATION_MAX_INPUT_LENGTH` | 1024 | Max input token length |
| `SUMMARIZATION_LENGTH_PENALTY` | 2.0 | Generation length penalty |
| `SUMMARIZATION_NUM_BEAMS` | 4 | Number of beams for generation |
| `SUMMARIZATION_EARLY_STOPPING` | true | Early stopping flag |
| `LOG_LEVEL` | "INFO" | Logging level |
| `LOG_FILE` | "app.log" | Log file path | 