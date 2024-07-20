#!/bin/sh

FILE="-f docker-compose.dev.yml"

docker compose $FILE down
docker compose $FILE up -d &&
docker-compose $FILE logs -f bot rest &&
docker compose $FILE run --rm
docker compose $FILE down --rmi local