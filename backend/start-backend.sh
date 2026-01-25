#!/bin/bash
# Start backend server

echo "🚀 Starting ZK Persona Backend..."
echo "📝 Make sure you have:"
echo "   1. Created backend/.env file with OAuth credentials"
echo "   2. Installed dependencies: npm install"
echo ""

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "   Copy .env.example to .env and fill in your credentials"
    echo ""
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✅ Starting server on http://localhost:3001"
echo "   Health check: http://localhost:3001/health"
echo ""
npm run dev

