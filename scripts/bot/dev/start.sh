#!/bin/bash

set -e

# Load common functions and variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../utils/common.sh"

# Args (any order): [free|premium] [--watch]
# No edition = full stack (both edition pairs + backend + redis)
EDITION=""
WATCH=false
for arg in "$@"; do
  case "$arg" in
    free|premium) EDITION="$arg" ;;
    --watch) WATCH=true ;;
    *) echo "❌ Unknown argument: $arg (expected 'free', 'premium', or '--watch')"; exit 1 ;;
  esac
done

# Explicit service list so watch mode covers the whole edition loop
SERVICES=""
if [ -n "$EDITION" ]; then
  SERVICES="bot-$EDITION proxy-$EDITION backend redis"
  echo "🚀 Starting development environment ($EDITION edition)..."
else
  echo "🚀 Starting development environment..."
fi

is_docker_running
check_env_exists "local"

# Start Supabase (database)
echo "Starting Supabase database..."
supabase start

echo "📋 Using .env.local for environment configuration"

if [ "$WATCH" = true ]; then
  echo "👀 Starting with watch mode enabled..."
  echo "📦 Building and starting services with file watching..."

  # Run Docker Compose from project root with watch mode
  docker compose $BOT_COMPOSE_FILES_DEV up --watch $SERVICES
else
  echo "📦 Building and starting services..."

  # Run Docker Compose from project root
  docker compose $BOT_COMPOSE_FILES_DEV up -d $SERVICES
  echo "✅ Development environment started!"

  # Show continuous logs after starting
  docker compose $BOT_COMPOSE_FILES_DEV logs -f $SERVICES
fi


info() {
  echo "📄 View logs: bun run dev:logs"
  echo "📋 Check status: bun run dev:ps"
  echo "🛑 Stop services: bun run dev:stop"
}

# Run info() when Ctrl+C (SIGINT) is received
trap info SIGINT
