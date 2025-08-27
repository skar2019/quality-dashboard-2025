# PM2 Guide for ACSQD Project

This guide explains how to use PM2 (Process Manager 2) to manage all services for the ACSQD (Advanced Code Quality and Software Development) project.

## 📋 Prerequisites

1. **Node.js and npm** installed
2. **PM2** installed globally
3. **Python 3.x** (for ML models)
4. **MongoDB** running
5. **Ollama** installed and running

## 🚀 Installation

### 1. Install PM2 Globally

```bash
npm install -g pm2
```

### 2. Install Project Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# ML Models dependencies
cd ../ml_models
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Mongo Client Server dependencies
cd ../mongo-client/server
npm install

# Mongo Client Frontend dependencies
cd ../client
npm install
```

## ⚙️ PM2 Configuration

### Current Ecosystem Configuration

The project uses `ecosystem.config.js` with 6 services:

```javascript
module.exports = {
  apps: [
    {
      name: 'acsqd-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3008,
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0',
        ML_API_URL: 'http://localhost:8000',
        CORS_ORIGIN: 'http://localhost:3000'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3008,
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0',
        ML_API_URL: 'http://10.42.68.175:8000',
        CORS_ORIGIN: 'http://10.42.68.175:3000'
      },
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs'],
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'acsqd-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        REACT_APP_API_URL: 'http://localhost:3008'
      },
      env_production: {
        NODE_ENV: 'production',
        REACT_APP_API_URL: 'http://10.42.68.175:3008'
      },
      watch: ['src'],
      ignore_watch: ['node_modules', 'build'],
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'acsqd-ollama',
      cwd: '.',
      script: 'ollama',
      args: 'serve',
      instances: 1,
      exec_mode: 'fork',
      env: {
        OLLAMA_HOST: '0.0.0.0:11434'
      },
      env_production: {
        OLLAMA_HOST: '0.0.0.0:11434'
      },
      watch: false,
      log_file: './logs/ollama.log',
      out_file: './logs/ollama-out.log',
      error_file: './logs/ollama-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'acsqd-ml-models',
      cwd: './ml_models',
      script: 'sh',
      args: '-c "source venv/bin/activate && python main.py"',
      instances: 1,
      exec_mode: 'fork',
      depends_on: ['acsqd-ollama'],
      env: {
        PYTHONPATH: './ml_models',
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0',
        OLLAMA_HOST: 'http://localhost:11434'
      },
      env_production: {
        PYTHONPATH: './ml_models',
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0',
        OLLAMA_HOST: 'http://10.42.68.175:11434'
      },
      watch: ['*.py'],
      ignore_watch: ['venv', '__pycache__'],
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'mongo-client-server',
      cwd: './mongo-client/server',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0'
      },
      watch: ['*.js'],
      ignore_watch: ['node_modules', 'logs'],
      log_file: './logs/mongo-client-server.log',
      out_file: './logs/mongo-client-server-out.log',
      error_file: './logs/mongo-client-server-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'mongo-client-frontend',
      cwd: './mongo-client/client',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3010,
        REACT_APP_API_URL: 'http://localhost:5001'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010,
        REACT_APP_API_URL: 'http://10.42.68.175:5001'
      },
      watch: ['src'],
      ignore_watch: ['node_modules', 'build'],
      log_file: './logs/mongo-client-frontend.log',
      out_file: './logs/mongo-client-frontend-out.log',
      error_file: './logs/mongo-client-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

## 🎯 Service Overview

| Service | Port | Description | Dependencies |
|---------|------|-------------|--------------|
| `acsqd-backend` | 3008 | Main backend API | MongoDB |
| `acsqd-frontend` | 3000 | Main React frontend (dev) | Backend API |
| `acsqd-frontend-prod` | 3000 | Main React frontend (prod) | Backend API |
| `acsqd-ollama` | 11434 | Ollama LLM service | None |
| `acsqd-ml-models` | 8000 | Python ML models API | Ollama, MongoDB |
| `mongo-client-server` | 5001 | MongoDB client backend | MongoDB |
| `mongo-client-frontend` | 3010 | MongoDB client frontend (dev) | Mongo client server |
| `mongo-client-frontend-prod` | 3010 | MongoDB client frontend (prod) | Mongo client server |

## 🚀 Basic PM2 Commands

### Start Services

```bash
# Start all services in development mode (default)
pm2 start ecosystem.config.js

# Start all services in development mode (explicit)
pm2 start ecosystem.config.js --env development

# Start all services in production mode
pm2 start ecosystem.config.js --env production

# Start production frontend services (build + serve static files)
pm2 start ecosystem.config.js --only acsqd-frontend-prod
pm2 start ecosystem.config.js --only mongo-client-frontend-prod

# Start specific service in development mode
pm2 start ecosystem.config.js --only acsqd-backend --env development
pm2 start ecosystem.config.js --only acsqd-frontend --env development
pm2 start ecosystem.config.js --only acsqd-ollama --env development
pm2 start ecosystem.config.js --only acsqd-ml-models --env development
pm2 start ecosystem.config.js --only mongo-client-server --env development
pm2 start ecosystem.config.js --only mongo-client-frontend --env development

# Start specific service in production mode
pm2 start ecosystem.config.js --only acsqd-backend --env production
pm2 start ecosystem.config.js --only acsqd-frontend --env production
pm2 start ecosystem.config.js --only acsqd-ollama --env production
pm2 start ecosystem.config.js --only acsqd-ml-models --env production
pm2 start ecosystem.config.js --only mongo-client-server --env production
pm2 start ecosystem.config.js --only mongo-client-frontend --env production

# Start Ollama service (required for ML models)
pm2 start ecosystem.config.js --only acsqd-ollama

# Start Ollama in production mode
pm2 start ecosystem.config.js --only acsqd-ollama --env production
```

### Monitor Services

```bash
# View all processes
pm2 list

# Monitor processes in real-time
pm2 monit

# View logs
pm2 logs

# View logs for specific service
pm2 logs acsqd-backend
pm2 logs acsqd-frontend
pm2 logs acsqd-ml-models
pm2 logs acsqd-ollama
pm2 logs mongo-client-server
pm2 logs mongo-client-frontend

# View logs with timestamps
pm2 logs --timestamp
```

### Manage Services

```bash
# Stop all services
pm2 stop all

# Stop specific service
pm2 stop acsqd-backend
pm2 stop acsqd-frontend
pm2 stop acsqd-ml-models
pm2 stop acsqd-ollama
pm2 stop mongo-client-server
pm2 stop mongo-client-frontend

# Restart all services
pm2 restart all

# Restart specific service
pm2 restart acsqd-backend
pm2 restart acsqd-frontend
pm2 restart acsqd-ml-models
pm2 restart acsqd-ollama
pm2 restart mongo-client-server
pm2 restart mongo-client-frontend

# Delete all services
pm2 delete all

# Delete specific service
pm2 delete acsqd-backend
pm2 delete acsqd-frontend
pm2 delete acsqd-ollama
pm2 delete acsqd-ml-models
pm2 delete mongo-client-server
pm2 delete mongo-client-frontend
```

### Reload and Scale

```bash
# Reload all services (zero-downtime restart)
pm2 reload all

# Reload specific service
pm2 reload acsqd-backend

# Scale backend to multiple instances
pm2 scale acsqd-backend 3
```

## 🔧 Advanced Configuration

### Environment Variables

The ecosystem configuration includes all necessary environment variables for both development and production environments. Key variables include:

- **MongoDB Connection**: Uses MongoDB Atlas cluster
- **API URLs**: Configured for local development and production IPs
- **CORS Origins**: Properly configured for frontend-backend communication
- **Ollama Host**: Configured for local and production environments

### Production Setup

```bash
# Build frontend for production
cd frontend
npm run build

# Build mongo-client frontend for production
cd ../mongo-client/client
npm run build

# Start in production mode
pm2 start ecosystem.config.js --env production
```

## 📊 Monitoring and Logging

### PM2 Dashboard

```bash
# Install PM2 Plus for advanced monitoring
pm2 install pm2-server-monit

# View detailed metrics
pm2 show acsqd-backend
```

### Log Management

```bash
# Clear all logs
pm2 flush

# Clear specific service logs
pm2 flush acsqd-backend

# Rotate logs
pm2 install pm2-logrotate
```

## 🔄 Startup Scripts

### Save PM2 Configuration

```bash
# Save current PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Follow the instructions provided by pm2 startup
# Then save the configuration again
pm2 save
```

### Custom Startup Script

Create `pm2-start.sh`:

```bash
#!/bin/bash

echo "🚀 Starting ACSQD Services with PM2..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Check if MongoDB is running (optional for Atlas)
echo "📊 Using MongoDB Atlas - no local MongoDB required"

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "🦙 Starting Ollama..."
    ollama serve &
    sleep 5
fi

# Start services with PM2
echo "📦 Starting services..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo "✅ All services started!"
echo ""
echo "📱 Main Frontend: http://localhost:3000"
echo "🔧 Main Backend: http://localhost:3008"
echo "🤖 ML Models: http://localhost:8000"
echo "🦙 Ollama: http://localhost:11434"
echo "📊 Mongo Client Frontend: http://localhost:3010"
echo "🔌 Mongo Client Backend: http://localhost:5001"
echo ""
echo "💡 Useful commands:"
echo "   pm2 list          - View all processes"
echo "   pm2 monit         - Monitor processes"
echo "   pm2 logs          - View logs"
echo "   pm2 stop all      - Stop all services"
echo "   pm2 restart all   - Restart all services"
```

Make it executable:
```bash
chmod +x pm2-start.sh
```

## 🛑 Stopping Services

### Stop All Services

```bash
# Stop all PM2 processes
pm2 stop all

# Delete all PM2 processes
pm2 delete all

# Stop Ollama
pkill -f ollama
```

### Custom Stop Script

Create `pm2-stop.sh`:

```bash
#!/bin/bash

echo "🛑 Stopping ACSQD Services..."

# Stop all PM2 processes
pm2 stop all
pm2 delete all

# Stop Ollama
if pgrep -x "ollama" > /dev/null; then
    echo "🦙 Stopping Ollama..."
    pkill -f ollama
fi

echo "✅ All services stopped!"
```

Make it executable:
```bash
chmod +x pm2-stop.sh
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3008
   lsof -i :3000
   lsof -i :8000
   lsof -i :5001
   lsof -i :3010
   lsof -i :11434
   
   # Kill the process
   kill -9 <PID>
   ```

2. **PM2 Process Not Starting**
   ```bash
   # Check PM2 logs
   pm2 logs
   
   # Check specific service
   pm2 logs acsqd-backend
   
   # Restart the service
   pm2 restart acsqd-backend
   ```

3. **Environment Variables Not Loading**
   ```bash
   # Check environment variables
   pm2 env acsqd-backend
   
   # Restart with environment
   pm2 restart acsqd-backend --update-env
   ```

4. **Memory Issues**
   ```bash
   # Monitor memory usage
   pm2 monit
   
   # Restart if needed
   pm2 restart all
   ```

5. **ML Models Service Issues**
   ```bash
   # Check if virtual environment is activated
   pm2 logs acsqd-ml-models
   
   # Ensure Ollama is running first
   pm2 restart acsqd-ollama
   pm2 restart acsqd-ml-models
   ```

### Useful Commands

```bash
# View PM2 status
pm2 status

# View detailed process info
pm2 show acsqd-backend

# View PM2 configuration
pm2 describe acsqd-backend

# Update PM2
pm2 update

# Install PM2 plugins
pm2 install pm2-logrotate
pm2 install pm2-server-monit
```

## 📝 Summary

This guide provides comprehensive instructions for using PM2 to manage all 6 ACSQD project services. The key benefits of using PM2 include:

- **Process Management**: Automatic restart on crashes
- **Load Balancing**: Multiple instances for better performance
- **Monitoring**: Real-time monitoring and logging
- **Zero Downtime**: Reload without stopping services
- **Startup Scripts**: Automatic startup on system boot
- **Service Dependencies**: Proper startup order (Ollama before ML models)

### Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │ Mongo Client    │    │   Ollama        │
│   (Port 3000)   │    │ Frontend        │    │   (Port 11434)  │
│                 │    │ (Port 3010)     │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Backend       │    │ Mongo Client    │    │   ML Models     │
│   (Port 3008)   │    │ Backend         │    │   (Port 8000)   │
│                 │    │ (Port 5001)     │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │     MongoDB Atlas       │
                    │   (Cloud Database)      │
                    └─────────────────────────┘
```

For more information, visit the [PM2 documentation](https://pm2.keymetrics.io/docs/).
