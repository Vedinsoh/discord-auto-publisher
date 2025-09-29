#!/usr/bin/env bash

# Common variables
BOT_COMPOSE_FILES_DEV="-f scripts/bot/docker-compose.base.yml -f scripts/bot/dev/docker-compose.yml"
BOT_COMPOSE_FILES_PROD="-f scripts/bot/docker-compose.base.yml -f scripts/bot/prod/docker-compose.yml"

# Check if .env.local exists
check_env_exists() {
    local ENV_NAME="$1"
    local ENV_FILE=".env.$ENV_NAME"

    if [ ! -f "$ENV_FILE" ]; then
        echo "⚠️  $ENV_FILE file not found. Please create one based on .env.example"
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
    local ENV_NAME="$1"
    local FILES="$2"

    if ! docker compose $FILES ps --services --filter "status=running" | grep -q "bot-core\|bot-api"; then
        echo "⚠️  Bot services are not running. Start them first with: bun run $ENV_NAME:start"
        exit 1
    fi
}
