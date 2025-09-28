#!/bin/bash

set -e

# Load common functions and variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/../../utils/common.sh"

echo "🚀 Starting development environment..."

is_docker_running
check_env_exists "local"

echo "📋 Using .env.local for environment configuration"
echo "📦 Building and starting services..."

# Run Docker Compose from project root
docker compose $FILES up -d
echo "✅ Development environment started!"

# Show continuous logs after starting
docker compose $FILES logs -f bot-core bot-api

info() {
  echo "📄 View logs: bun run dev:logs"
  echo "📋 Check status: bun run dev:ps"
  echo "🛑 Stop services: bun run dev:stop"
}

# Run info() when Ctrl+C (SIGINT) is received
trap info SIGINT
