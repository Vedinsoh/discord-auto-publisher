#!/bin/bash

set -e

# Load common functions and variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../utils/common.sh"

is_docker_running
is_docker_services_running "dev" "$BOT_COMPOSE_FILES_DEV"

# Show continuous logs for bot services
docker compose $BOT_COMPOSE_FILES_DEV logs -f bot backend crosspost-worker discord-proxy
