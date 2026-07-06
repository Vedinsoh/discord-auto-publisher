#!/bin/bash

set -e

# Load common functions and variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../utils/common.sh"

# Optional edition arg: stop only that edition's bot + proxy, leaving the
# backend, Redis, and Supabase running (the other edition keeps working)
EDITION="$1"

if [ -n "$EDITION" ]; then
  if [ "$EDITION" != "free" ] && [ "$EDITION" != "premium" ]; then
    echo "❌ Unknown argument: $EDITION (expected 'free' or 'premium')"
    exit 1
  fi

  echo "🛑 Stopping $EDITION edition services..."
  is_docker_running
  docker compose $BOT_COMPOSE_FILES_DEV stop "bot-$EDITION" "proxy-$EDITION"
  echo "✅ Stopped bot-$EDITION and proxy-$EDITION (backend, redis, and Supabase keep running)"
  echo "🚀 To start again: bun run dev:start:$EDITION"
  exit 0
fi

echo "🛑 Stopping development environment..."

is_docker_running

# Stop services and remove images and volumes
docker compose $BOT_COMPOSE_FILES_DEV down --rmi local --volumes

# Stop Supabase
echo "Stopping Supabase database..."
supabase stop

# Comprehensive cleanup: remove all unused Docker resources
echo "🧽 Cleaning up all unused Docker resources..."
docker image prune -f
docker builder prune -f 2>/dev/null || true
docker network prune -f 2>/dev/null || true
docker container prune -f 2>/dev/null || true

echo "✅ Development environment stopped and cleaned up!"
echo ""
echo "📝 Note: All Redis data has been removed"
echo "🚀 To start again: bun run dev:start"
