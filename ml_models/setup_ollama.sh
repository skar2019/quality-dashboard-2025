#!/bin/bash

echo "Setting up Ollama for Project Insider Analysis..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama not found. Installing Ollama..."
    
    # Install Ollama (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "Please install Ollama manually from https://ollama.ai"
        exit 1
    fi
else
    echo "Ollama is already installed."
fi

# Start Ollama service
echo "Starting Ollama service..."
ollama serve &

# Wait for Ollama to start
sleep 5

# Pull the llama2 model
echo "Downloading llama2 model (this may take a while)..."
ollama pull llama2

# Test the model
echo "Testing llama2 model..."
ollama run llama2 "Hello, this is a test message."

echo "Ollama setup complete!"
echo "You can now start the ML models service with: python main.py" 