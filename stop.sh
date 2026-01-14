#!/bin/bash

# DirectusCloud Stop Script
# This script stops all DirectusCloud processes

echo "════════════════════════════════════════════════════════════"
echo "  Stopping DirectusCloud"
echo "════════════════════════════════════════════════════════════"
echo ""

# Stop the main server (app/server.js)
echo "Stopping DirectusCloud server..."
pkill -f "node.*app/server.js" 2>/dev/null && echo "✓ Server stopped" || echo "- Server was not running"

# Stop any node processes with --watch flag (development mode)
echo "Stopping development server..."
pkill -f "node --watch" 2>/dev/null && echo "✓ Development server stopped" || echo "- Development server was not running"

# Stop any PM2 processes (Directus instances)
if command -v npx &> /dev/null; then
    echo "Checking for running Directus instances..."
    
    # Set PM2_HOME to the root data directory
    export PM2_HOME="$(pwd)/data/.pm2"
    
    if [ -d "$PM2_HOME" ]; then
        # Check if there are any PM2 processes
        PM2_LIST=$(PM2_HOME="$PM2_HOME" npx pm2 list 2>/dev/null)
        
        if echo "$PM2_LIST" | grep -q "directus-"; then
            echo "Note: Directus instances are still running"
            echo "Use 'PM2_HOME=./data/.pm2 npx pm2 stop all' to stop them"
        else
            echo "✓ No Directus instances running"
        fi
    else
        echo "✓ No PM2 data directory found"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  DirectusCloud stopped"
echo "═══════════════════════════════════════════════════════════"
