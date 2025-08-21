#!/bin/bash

# Quick Start Script for Quality Dashboard with AI Chatbot
# This script sets up all environment variables and starts all services

echo "🚀 Starting Quality Dashboard with AI Chatbot..."

# Set environment variables
export MONGO_URL="mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0"
export OLLAMA_HOST="http://localhost:11434"
export JWT_SECRET="your_jwt_secret_here"
export ML_API_URL="http://localhost:8000"
export REACT_APP_API_URL="http://localhost:3008"

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use. Killing existing process..."
        lsof -ti:$1 | xargs kill -9
        sleep 2
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    echo "⏳ Waiting for $service_name to be ready..."
    for i in {1..30}; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        sleep 2
    done
    echo "❌ $service_name failed to start"
    return 1
}

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
check_port 8000
check_port 3008
check_port 3000

# Start Ollama (if not already running)
echo "🤖 Starting Ollama..."
if ! pgrep -x "ollama" > /dev/null; then
    ollama serve &
    sleep 5
    echo "📥 Pulling llama2 model..."
    ollama pull llama2
else
    echo "✅ Ollama is already running"
fi

# Start ML Models Service
echo "🧠 Starting ML Models Service..."
cd /opt/homebrew/var/www/acsqd/ml_models
source venv/bin/activate
python main.py &
ML_PID=$!

# Wait for ML service
wait_for_service "http://localhost:8000/health" "ML Models Service"

# Start Backend
echo "🔧 Starting Backend..."
cd /opt/homebrew/var/www/acsqd/backend
npm run dev &
BACKEND_PID=$!

# Wait for backend
wait_for_service "http://localhost:3008/api/health" "Backend"

# Start Frontend
echo "🎨 Starting Frontend..."
cd /opt/homebrew/var/www/acsqd/frontend
npm start &
FRONTEND_PID=$!

# Wait for frontend
wait_for_service "http://localhost:3000" "Frontend"

echo ""
echo "🎉 All services are running!"
echo ""
echo "📱 Access your application:"
echo "   Frontend Dashboard: http://localhost:3000"
echo "   Backend API: http://localhost:3008"
echo "   ML Models API: http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo ""
echo "🤖 To test the chatbot:"
echo "   Navigate to the left sidebar and click 'Project Insider Analysis'"
echo ""
echo "🛑 To stop all services, run: ./stop_services.sh"
echo ""

# Keep script running and handle cleanup
trap "echo '🛑 Stopping all services...'; kill $ML_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait for user to stop
echo "Press Ctrl+C to stop all services"
wait 