#!/bin/sh

COMPOSE_FILES="-f docker-compose.dev.yml"

docker compose $COMPOSE_FILES down
docker compose $COMPOSE_FILES up &&
docker compose $COMPOSE_FILES run --rm
docker compose $COMPOSE_FILES down --rmi local