# Quality Dashboard with AI-Powered Project Insider Analysis

A comprehensive quality management dashboard with AI-powered analytics, featuring a sophisticated RAG (Retrieval-Augmented Generation) system for JIRA data analysis and project insights.

## 🎯 Overview

This application consists of three main components:
1. **Frontend**: React-based dashboard with Material-UI components
2. **Backend**: Node.js/Express API with MongoDB integration
3. **ML Models**: FastAPI service with AI/ML capabilities including RAG system

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   ML Models     │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (FastAPI)     │
│   Port: 3000    │    │   Port: 3008    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MongoDB       │    │   Ollama        │    │   ChromaDB      │
│   (Atlas)       │    │   (Llama2)      │    │   (Vector DB)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
acsqd/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API services
│   │   ├── routes/           # Routing configuration
│   │   └── styles/           # Styling and themes
│   ├── package.json
│   └── tsconfig.json
├── backend/                  # Node.js backend API
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── models/           # MongoDB models
│   │   ├── config/           # Configuration files
│   │   └── middleware/       # Express middleware
│   ├── package.json
│   └── tsconfig.json
├── ml_models/                # FastAPI ML service
│   ├── app/
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # ML services
│   │   ├── config/           # Configuration
│   │   └── utils/            # Utilities
│   ├── requirements.txt
│   └── main.py
├── start_services.sh         # Development startup script
├── stop_services.sh          # Development shutdown script
├── quick_start.sh            # Quick start script
└── README.md                 # This file
```

## 🚀 Quick Start (Development)

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Ollama** (for AI models)
- **MongoDB** (Atlas or local)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd acsqd

# Install dependencies for all services
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd ml_models && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cd ..
```

### 2. Environment Configuration

Create environment files for each service:

**Frontend (.env)**
```bash
REACT_APP_API_URL=http://localhost:3008
REACT_APP_ML_SERVICE_URL=http://localhost:8000
```

**Backend (.env)**
```bash
MONGO_URL=mongodb+srv://your-username:your-password@cluster.mongodb.net/quality_dashboard
JWT_SECRET=your_jwt_secret_here
ML_API_URL=http://localhost:8000
PORT=3008
```

**ML Models (.env)**
```bash
MONGO_URL=mongodb+srv://your-username:your-password@cluster.mongodb.net/quality_dashboard
OLLAMA_HOST=http://localhost:11434
DEBUG=true
PORT=8000
```

### 3. Start All Services

```bash
# Make scripts executable
chmod +x start_services.sh stop_services.sh quick_start.sh

# Start all services
./quick_start.sh
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3008
- **ML Models**: http://localhost:8000
- **Ollama**: http://localhost:11434

### 4. Access the Application

1. Open http://localhost:3000
2. Login with your credentials
3. Navigate to "Project Insider Analysis" for AI-powered insights

## 🏭 Production Deployment

#### Prerequisites
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+
- Python 3.8+
- PM2 (for process management)
- MongoDB Atlas account

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt install python3 python3-pip python3-venv -y



# Install PM2
sudo npm install -g pm2

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
```

#### 2. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/acsqd
sudo chown $USER:$USER /var/www/acsqd

# Clone application
cd /var/www/acsqd
git clone <repository-url> .

# Setup Frontend
cd frontend
npm install
npm run build

# Setup Backend
cd ../backend
npm install
npm run build

# Setup ML Models
cd ../ml_models
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 3. Environment Configuration

Create production environment files:

**Frontend (.env.production)**
```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ML_SERVICE_URL=https://ml.yourdomain.com
```

**Backend (.env.production)**
```bash
NODE_ENV=production
MONGO_URL=mongodb+srv://your-username:your-password@cluster.mongodb.net/quality_dashboard
JWT_SECRET=your_very_secure_jwt_secret
ML_API_URL=https://ml.yourdomain.com
PORT=3008
CORS_ORIGIN=https://yourdomain.com
```

**ML Models (.env.production)**
```bash
DEBUG=false
HOST=0.0.0.0
PORT=8000
MONGO_URL=mongodb+srv://your-username:your-password@cluster.mongodb.net/quality_dashboard
OLLAMA_HOST=http://localhost:11434
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
LOG_LEVEL=WARNING
```

#### 4. PM2 Configuration

Create `ecosystem.config.js` in the root directory:

```javascript
module.exports = {
  apps: [
    {
      name: 'acsqd-backend',
      cwd: '/var/www/acsqd/backend',
      script: 'dist/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3008
      },
      env_file: '.env.production'
    },
    {
      name: 'acsqd-ml-models',
      cwd: '/var/www/acsqd/ml_models',
      script: 'main.py',
      interpreter: '/var/www/acsqd/ml_models/venv/bin/python',
      instances: 1,
      env: {
        PYTHONPATH: '/var/www/acsqd/ml_models'
      },
      env_file: '.env.production'
    }
  ]
};
```

#### 5. Start Services

```bash
# Start PM2 processes
cd /var/www/acsqd
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

# Start Ollama
ollama serve &
ollama pull llama2
```



## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `ML_API_URL` | ML Models service URL | http://localhost:8000 |
| `OLLAMA_HOST` | Ollama service URL | http://localhost:11434 |
| `DEBUG` | Debug mode | false |
| `PORT` | Service port | 3008 (backend), 8000 (ml) |

### MongoDB Setup

1. Create MongoDB Atlas cluster
2. Create database: `quality_dashboard`
3. Create collections: `users`, `projects`, `jira_master_reports`, `jira_master_data`
4. Configure network access and authentication

### Ollama Setup

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull required model
ollama pull llama2
```

## 📊 Features

### Frontend Modules
- **Executive Overview**: High-level project metrics
- **Quality Intelligence**: Quality metrics and analytics
- **Historical Learning**: Historical data analysis
- **Regional Analysis**: Geographic project insights
- **Sprint Performance**: Agile sprint metrics
- **Document Intelligence**: Document analysis
- **Predictive Quality**: AI-powered quality predictions
- **Project Insider Analysis**: AI chatbot for project insights
- **Text Summarization**: AI-powered text summarization
- **JIRA Report Import**: Import and process JIRA data
- **Data Viewer**: Interactive data exploration

### Backend APIs
- **User Management**: Authentication and authorization
- **Project Management**: CRUD operations for projects
- **JIRA Integration**: Import and process JIRA data
- **Chatbot Proxy**: AI chatbot integration
- **Data Analytics**: Analytics and reporting endpoints

### ML Models Service
- **Text Summarization**: AI-powered text summarization
- **RAG System**: Retrieval-Augmented Generation for JIRA data
- **Chatbot Service**: AI-powered project analysis chatbot
- **Embedding Generation**: Vector embeddings for semantic search

## 🔍 API Documentation

- **Backend API**: http://localhost:3008/api
- **ML Models API**: http://localhost:8000/docs
- **Ollama API**: http://localhost:11434

## 🚨 Troubleshooting

### Common Issues

1. **Ollama not running**
   ```bash
   # Check Ollama status
   ollama list
   
   # Start Ollama
   ollama serve
   ```

2. **MongoDB connection issues**
   ```bash
   # Test connection
   mongosh "your-mongodb-connection-string"
   ```

3. **Port conflicts**
   ```bash
   # Check port usage
   lsof -i :3000
   lsof -i :3008
   lsof -i :8000
   ```

4. **ML Models service issues**
   ```bash
   # Check logs
   tail -f ml_models/app.log
   
   # Restart service
   ./ml_models/restart_service.sh
   ```

### Performance Optimization

- **Large datasets**: Use streaming for JIRA imports
- **Memory issues**: Adjust batch sizes in ML processing
- **Response time**: Optimize Ollama parameters
- **Database**: Use MongoDB indexes for better performance

## 🔮 Future Enhancements

- **Real-time Analytics**: WebSocket-based real-time updates
- **Advanced AI Models**: Support for additional LLM models
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Machine learning for predictive analytics
- **Integration APIs**: Third-party tool integrations
- **Multi-tenancy**: Multi-tenant architecture support

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

For internal development:
1. Create feature branch
2. Implement changes
3. Test thoroughly
4. Submit pull request
5. Code review and merge

## 📞 Support

For technical support and questions:
- **Email**: support@yourcompany.com
- **Documentation**: Internal wiki
- **Issues**: Internal issue tracking system 