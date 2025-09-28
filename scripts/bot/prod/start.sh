#!/bin/bash

set -e

# Load common functions and variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/../../utils/common.sh"

echo "🚀 Starting production environment..."

is_docker_running
check_env_exists "production"

echo "📦 Building and starting production services..."

# Build and start services with production overrides
docker compose $FILES up --build -d

echo "⏳ Waiting for services to be healthy..."

# Wait for services to be ready with longer timeout for production
timeout=180
counter=0

while [ $counter -lt $timeout ]; do
    redis_healthy=$(docker compose ps redis | grep -c "healthy" || echo "0")
    api_healthy=$(docker compose ps bot-api | grep -c "healthy" || echo "0")
    
    if [ "$redis_healthy" = "1" ] && [ "$api_healthy" = "1" ]; then
        # Give bot-core a bit more time to connect
        sleep 10
        break
    fi
    
    echo -n "."
    sleep 3
    counter=$((counter + 3))
done

echo ""

if [ $counter -ge $timeout ]; then
    echo "⚠️  Services are taking longer than expected to start"
    echo "📋 Check service status:"
    docker-compose ps
    echo ""
    echo "📄 Recent logs:"
    docker-compose logs --tail=10
else
    echo "✅ Production environment is ready!"
    echo ""
    echo "📋 Service Status:"
    docker-compose ps
    echo ""
    echo "📊 Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    echo ""
    echo "📄 View logs: bun run prod:logs"
    echo "🛑 Stop services: bun run prod:stop"
fi