#!/usr/bin/env bash

# Common variables
FILES="-f scripts/bot/docker-compose.base.yml -f scripts/bot/prod/docker-compose.yml"

# Check if .env.production exists
is_env_production_exists() {
    if [ ! -f ".env.production" ]; then
        echo "⚠️  .env.production file not found. Please create one based on .env.example"
        exit 1
    fi
}

# Check if Docker is running
is_docker_running() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Check if Docker services are running
is_docker_services_running() {
    if ! docker compose $FILES ps --services --filter "status=running" | grep -q "bot-core\|bot-api"; then
        echo "⚠️  Bot services are not running. Start them first with: bun run prod:start"
        exit 1
    fi
}
