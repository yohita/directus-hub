#!/bin/bash

# DirectusCloud Start Script
# This script starts the DirectusCloud Express server

echo "════════════════════════════════════════════════════════════"
echo "  Starting DirectusCloud - Multi-Instance Hosting Platform"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if NODE_ENV is set, default to development
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=development
fi

echo "Mode: $NODE_ENV"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found. Please install Node.js"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start the server
if [ "$NODE_ENV" = "production" ]; then
    echo "Starting production server..."
    npm start
else
    echo "Starting development server with auto-reload..."
    echo "  - Server: http://localhost:${PORT:-3001}"
    echo "  - Dashboard: http://localhost:${PORT:-3001}/"
    echo "  - API: http://localhost:${PORT:-3001}/api"
    echo ""
    npm run dev
fi
