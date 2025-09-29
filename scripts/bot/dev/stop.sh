#!/bin/bash

set -e

# Load common functions and variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../utils/common.sh"

echo "🛑 Stopping development environment..."

is_docker_running

# Stop services and remove images and volumes
docker compose $BOT_COMPOSE_FILES_DEV down --rmi local --volumes

# Clean up dangling images and build cache
echo "🧽 Cleaning up dangling images and build cache..."
docker image prune -f
docker builder prune -f 2>/dev/null || true

echo "✅ Development environment stopped and cleaned up!"
echo ""
echo "📝 Note: All Redis data has been removed"
echo "🚀 To start again: bun run dev:start"