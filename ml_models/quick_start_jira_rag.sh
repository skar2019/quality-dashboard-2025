#!/bin/bash

# Quick Start Script for JIRA RAG System
# This script sets up and runs the complete JIRA RAG workflow

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 JIRA RAG System Quick Start${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_warning "Virtual environment not found. Creating one..."
    python3 -m venv venv
    print_status "Virtual environment created successfully"
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Install/upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install requirements
print_status "Installing/updating requirements..."
pip install -r requirements.txt

# Check if ChromaDB directory exists
if [ ! -d "chroma_db" ]; then
    print_status "Creating ChromaDB directory..."
    mkdir -p chroma_db
fi

# Make scripts executable
print_status "Making scripts executable..."
chmod +x embed_jira_task.py
chmod +x check_embeddings.py
chmod +x rag_chat.py
chmod +x run_jira_rag_system.py

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setup Complete! Choose an option:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}1.${NC} Run complete workflow (embed + verify + chat)"
echo -e "${GREEN}2.${NC} Run embedding only"
echo -e "${GREEN}3.${NC} Run verification only"
echo -e "${GREEN}4.${NC} Run interactive chat"
echo -e "${GREEN}5.${NC} Run specific query: 'Give me all High Priority Task'"
echo -e "${GREEN}6.${NC} Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        print_status "Running complete workflow..."
        python run_jira_rag_system.py --mode complete
        ;;
    2)
        print_status "Running embedding only..."
        python run_jira_rag_system.py --mode embed
        ;;
    3)
        print_status "Running verification only..."
        python run_jira_rag_system.py --mode verify
        ;;
    4)
        print_status "Starting interactive chat..."
        python run_jira_rag_system.py --mode chat --interactive
        ;;
    5)
        print_status "Running specific query..."
        python run_jira_rag_system.py --mode chat --query "Give me all High Priority Task"
        ;;
    6)
        print_status "Exiting..."
        exit 0
        ;;
    *)
        print_error "Invalid choice. Exiting..."
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ JIRA RAG System completed successfully!${NC}"
echo -e "${BLUE}Check the log files for detailed information:${NC}"
echo -e "  - embed_jira_task.log"
echo -e "  - check_embeddings.log"
echo -e "  - rag_chat.log"
echo -e "  - jira_rag_system.log" 