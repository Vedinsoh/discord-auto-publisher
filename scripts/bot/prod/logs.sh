#!/bin/bash

set -e

# Load common functions and variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/../../utils/common.sh"

is_docker_running
is_docker_services_running "$FILES"

# Show continuous logs for bot services
docker compose $FILES logs -f bot-core bot-api
