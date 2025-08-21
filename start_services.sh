#!/bin/bash

echo "🚀 Starting Project Insider Analysis Services..."

# Check if Ollama is installed and running
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama not found. Please install Ollama first:"
    echo "   curl -fsSL https://ollama.ai/install.sh | sh"
    exit 1
fi

# Check if llama2 model is available
if ! ollama list | grep -q "llama2"; then
    echo "📥 Downloading llama2 model (this may take a while)..."
    ollama pull llama2
fi

# Start Ollama in background if not already running
if ! pgrep -x "ollama" > /dev/null; then
    echo "🔄 Starting Ollama service..."
    ollama serve &
    sleep 5
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Start ML Models Service
echo "🤖 Starting ML Models Service..."
cd ml_models

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/lib/python*/site-packages/fastapi" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Set environment variables
export MONGO_URL="mongodb://localhost:27017/quality_dashboard"
export OLLAMA_HOST="http://localhost:11434"

# Start ML models service in background
if ! check_port 8000; then
    python main.py &
    echo "✅ ML Models Service started on http://localhost:8000"
else
    echo "⚠️  Port 8000 is already in use. ML Models Service may already be running."
fi

cd ..

# Start Backend
echo "🔧 Starting Backend..."
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Set environment variables
export MONGO_URL="mongodb://localhost:27017/quality_dashboard"
export JWT_SECRET="your_jwt_secret_here"
export ML_API_URL="http://localhost:8000"

# Start backend in background
if ! check_port 3008; then
    npm run dev &
    echo "✅ Backend started on http://localhost:3008"
else
    echo "⚠️  Port 3008 is already in use. Backend may already be running."
fi

cd ..

# Start Frontend
echo "🎨 Starting Frontend..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Set environment variables
export REACT_APP_API_URL="http://localhost:3008"

# Start frontend in background
if ! check_port 3000; then
    npm start &
    echo "✅ Frontend started on http://localhost:3000"
else
    echo "⚠️  Port 3000 is already in use. Frontend may already be running."
fi

cd ..

echo ""
echo "🎉 All services started!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3008"
echo "🤖 ML Models: http://localhost:8000"
echo "🦙 Ollama: http://localhost:11434"
echo ""
echo "💡 To access Project Insider Analysis:"
echo "   1. Open http://localhost:3000"
echo "   2. Login to the application"
echo "   3. Click on 'Project Insider Analysis' in the left menu"
echo ""
echo "🛑 To stop all services, run: ./stop_services.sh"
echo "" 