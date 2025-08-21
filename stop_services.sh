#!/bin/bash

echo "🛑 Stopping Project Insider Analysis Services..."

# Function to kill process by port
kill_by_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "🔄 Stopping service on port $port (PID: $pid)"
        kill $pid
        sleep 2
    else
        echo "ℹ️  No service running on port $port"
    fi
}

# Stop services by port
kill_by_port 3000  # Frontend
kill_by_port 3008  # Backend
kill_by_port 8000  # ML Models

# Stop Ollama
if pgrep -x "ollama" > /dev/null; then
    echo "🦙 Stopping Ollama..."
    pkill -f ollama
    sleep 2
fi

echo "✅ All services stopped!"
echo ""
echo "💡 To start services again, run: ./start_services.sh" 