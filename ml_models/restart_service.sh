#!/bin/bash

echo "🔄 Restarting ML Models Service..."

# Kill existing process
echo "Stopping existing ML models service..."
pkill -f "python main.py" || true
sleep 2

# Set environment variables
export MONGO_URL="mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0"
export OLLAMA_HOST="http://localhost:11434"

# Activate virtual environment
source venv/bin/activate

# Start the service
echo "Starting ML models service..."
python main.py &

echo "✅ ML Models Service restarted!"
echo "📊 Service should be available at: http://localhost:8000"
echo "🔍 Check logs with: tail -f app.log" 