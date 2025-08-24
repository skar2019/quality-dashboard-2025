#!/bin/bash

echo "🍃 MongoDB Client Application - Dependency Installation"
echo "====================================================="

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "❌ .env file not found in server directory!"
    echo "📝 Please create server/.env file with your MongoDB connection details:"
    echo "   MONGO_URL=your_mongodb_connection_string"
    echo "   PORT=5001"
    echo "   NODE_ENV=development"
    exit 1
else
    echo "✅ .env file found"
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server && npm install && cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "🚀 To start the application, run:"
echo "   npm run dev"
echo ""
echo "🌐 Frontend will be available at: http://localhost:3010"
echo "🔗 Backend API will be available at: http://localhost:5001/api"
echo ""
echo "🔌 To test MongoDB connection first, run:"
echo "   cd server && node -e \"const { MongoClient } = require('mongodb'); require('dotenv').config(); async function test() { try { const client = new MongoClient(process.env.MONGO_URL); await client.connect(); console.log('✅ MongoDB connection successful!'); await client.close(); } catch (error) { console.error('❌ MongoDB connection failed:', error.message); } } test();\""
echo ""
