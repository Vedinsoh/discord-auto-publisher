#!/bin/sh

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.development.yml"

docker compose $COMPOSE_FILES down
docker compose $COMPOSE_FILES build
docker compose $COMPOSE_FILES run --rm --service-ports bot
docker compose $COMPOSE_FILES down