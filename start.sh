#!/bin/bash

# MORTH React Dashboard - Quick Start Script

echo "🚀 Starting MORTH Road Safety Dashboard (React Version)"
echo "📍 Location: /home/akash/morth-dash/morth-react"
echo ""

# Navigate to project directory
cd /home/akash/morth-dash/morth-react

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Start the development server
echo "🌐 Starting development server..."
echo "📱 Your app will be available at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
