#!/bin/bash

echo "🍃 MongoDB Client Application Setup"
echo "=================================="

# Check if .env exists in server directory
if [ ! -f "server/.env" ]; then
    echo "❌ .env file not found in server directory!"
    echo "📝 Please create server/.env file with your MongoDB connection details:"
    echo "   MONGO_URL=your_mongodb_connection_string"
    echo "   PORT=5000"
    echo "   NODE_ENV=development"
    exit 1
else
    echo "✅ .env file found"
fi

# Install dependencies first
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Now test MongoDB connection after dependencies are installed
echo "🔌 Testing MongoDB connection..."
cd server
if node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
    try {
        const client = new MongoClient(process.env.MONGO_URL);
        await client.connect();
        console.log('✅ MongoDB connection test successful!');
        await client.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ MongoDB connection test failed:', error.message);
        process.exit(1);
    }
}

testConnection();
"; then
    echo "✅ MongoDB connection verified!"
else
    echo "❌ MongoDB connection failed. Please check your .env file and network access."
    exit 1
fi

cd ..

echo "🚀 Starting MongoDB Client Application..."
echo "🌐 Frontend will be available at: http://localhost:3010"
echo "🔗 Backend API will be available at: http://localhost:5000/api"
echo "📊 MongoDB Database: quality_dashboard"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

# Start the application
npm run dev
