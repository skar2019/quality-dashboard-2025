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
echo ""
echo "💡 To start services again, run: ./pm2-start.sh"
