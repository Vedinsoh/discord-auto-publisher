#!/bin/bash

set -e

# Load common functions and variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../utils/common.sh"

echo "🚀 Starting production environment..."

is_docker_running
check_env_exists "production"

echo "📦 Building and starting production services..."

# Build and start services with production overrides
# Docker Compose will handle health checks and service dependencies automatically
docker compose $BOT_COMPOSE_FILES_PROD up --build -d

echo "✅ Production environment started!"
echo ""
echo "📋 Service Status:"
docker compose $BOT_COMPOSE_FILES_PROD ps
echo ""
echo "📊 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""
echo "📄 View logs: bun run prod:logs"
echo "🛑 Stop services: bun run prod:stop"