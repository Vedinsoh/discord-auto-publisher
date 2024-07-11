#!/bin/sh

COMPOSE_FILES="-f docker-compose.base.yml -f docker-compose.dev.yml"

docker compose $COMPOSE_FILES down
docker compose $COMPOSE_FILES build &&
docker compose $COMPOSE_FILES run --rm --service-ports bot
docker compose $COMPOSE_FILES down --rmi local