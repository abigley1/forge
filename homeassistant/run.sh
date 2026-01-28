#!/bin/sh
# Forge Home Assistant Add-on Startup Script

set -e

# =============================================================================
# Read Home Assistant Add-on Options (if bashio available)
# =============================================================================
if command -v bashio >/dev/null 2>&1; then
    echo "Reading Home Assistant add-on configuration..."

    # Get Tailscale hostname from add-on options
    TAILSCALE_HOSTNAME=$(bashio::config 'tailscale_hostname' 2>/dev/null || echo "")
    export TAILSCALE_HOSTNAME

    echo "Tailscale hostname: ${TAILSCALE_HOSTNAME:-'(not configured)'}"
else
    echo "Running outside Home Assistant (bashio not available)"
fi

# =============================================================================
# Ensure Data Directory Exists
# =============================================================================
DATA_DIR="${FORGE_DATA_DIR:-/data}"
echo "Data directory: ${DATA_DIR}"

if [ ! -d "$DATA_DIR" ]; then
    echo "Creating data directory..."
    mkdir -p "$DATA_DIR"
fi

# Ensure projects subdirectory exists
if [ ! -d "$DATA_DIR/projects" ]; then
    echo "Creating projects directory..."
    mkdir -p "$DATA_DIR/projects"
fi

# =============================================================================
# Log Configuration
# =============================================================================
echo "=== Forge Configuration ==="
echo "PORT: ${PORT:-8099}"
echo "FORGE_DATA_DIR: ${DATA_DIR}"
echo "FORGE_STATIC_DIR: ${FORGE_STATIC_DIR:-/app/dist}"
echo "FORGE_DB_PATH: ${FORGE_DB_PATH:-$DATA_DIR/forge.sqlite}"
echo "NODE_ENV: ${NODE_ENV:-production}"
echo "==========================="

# =============================================================================
# Start Server
# =============================================================================
echo "Starting Forge server..."
cd /app/server
exec node dist/index.js
