#!/bin/bash

echo "🚀 Starting ACSQD Services with PM2..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   You can start MongoDB with: brew services start mongodb-community"
    exit 1
fi

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "🦙 Starting Ollama..."
    ollama serve &
    sleep 5
fi

# Create logs directories if they don't exist
mkdir -p backend/logs
mkdir -p frontend/logs
mkdir -p ml_models/logs

# Start services with PM2
echo "📦 Starting services..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo "✅ All services started!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3008"
echo "🤖 ML Models: http://localhost:8000"
echo ""
echo "💡 Useful commands:"
echo "   pm2 list          - View all processes"
echo "   pm2 monit         - Monitor processes"
echo "   pm2 logs          - View logs"
echo "   pm2 stop all      - Stop all services"
echo "   pm2 restart all   - Restart all services"
echo ""
echo "🛑 To stop all services, run: ./pm2-stop.sh"
