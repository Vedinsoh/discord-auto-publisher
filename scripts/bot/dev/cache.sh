#!/bin/bash

set -e

# Load common functions and variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../utils/common.sh"

echo "🔗 Connecting to Redis cache (development)..."

is_docker_running
is_docker_services_running "dev" "$BOT_COMPOSE_FILES_DEV"

# Check if bot-api-cache service is running
if ! docker compose $BOT_COMPOSE_FILES_DEV ps --services --filter "status=running" | grep -q "bot-api-cache"; then
    echo "⚠️  Redis cache service (bot-api-cache) is not running."
    echo "🚀 Start the development environment first: bun run dev:start"
    exit 1
fi

echo "🎯 Opening Redis CLI for bot-api-cache container..."
echo "💡 Use 'exit' or Ctrl+D to close the Redis CLI"
echo ""

# Connect to Redis CLI in the running cache container
docker compose $BOT_COMPOSE_FILES_DEV exec bot-api-cache redis-cli
