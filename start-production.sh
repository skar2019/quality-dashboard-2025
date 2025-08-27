#!/bin/bash

echo "🚀 Starting ACSQD Services in Production Mode..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Stop any existing services
echo "🛑 Stopping existing services..."
pm2 stop all
pm2 delete all

# Start backend services in production mode
echo "🔧 Starting backend services..."
pm2 start ecosystem.config.js --only acsqd-backend --env production
pm2 start ecosystem.config.js --only acsqd-ollama --env production
pm2 start ecosystem.config.js --only acsqd-ml-models --env production
pm2 start ecosystem.config.js --only mongo-client-server --env production

# Build and start frontend services in production mode
echo "📦 Building and starting frontend services..."
pm2 start ecosystem.config.js --only acsqd-frontend-prod
pm2 start ecosystem.config.js --only mongo-client-frontend-prod

# Save PM2 configuration
pm2 save

echo "✅ All production services started!"
echo ""
echo "📱 Main Frontend: http://10.42.68.175:3000"
echo "🔧 Main Backend: http://10.42.68.175:3008"
echo "🤖 ML Models: http://10.42.68.175:8000"
echo "🦙 Ollama: http://10.42.68.175:11434"
echo "📊 Mongo Client Frontend: http://10.42.68.175:3010"
echo "🔌 Mongo Client Backend: http://10.42.68.175:5001"
echo ""
echo "💡 Useful commands:"
echo "   pm2 list          - View all processes"
echo "   pm2 monit         - Monitor processes"
echo "   pm2 logs          - View logs"
echo "   pm2 stop all      - Stop all services"
echo "   pm2 restart all   - Restart all services"
