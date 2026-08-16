# syntax=docker/dockerfile:1
FROM oven/bun:1.2.22-alpine AS base

FROM base AS builder
WORKDIR /app

# Manifests only, so edits under packages/*/src reuse the cached install layer.
# `--parents` keeps the directory structure and needs frontend 1.20+, which is
# what the pinned syntax line guarantees.
COPY package.json bun.lock turbo.json ./
COPY --parents packages/*/package.json apps/proxy/package.json ./

# Cache mount persists downloads across builds; BUN_INSTALL_CACHE_DIR is
# per-command to stay build-only and survive a USER change.
RUN --mount=type=cache,target=/bun-cache,sharing=locked \
    BUN_INSTALL_CACHE_DIR=/bun-cache bun install

COPY . .

RUN bun run build --filter=proxy

FROM base AS runtime
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app

COPY --from=builder --chown=app:nodejs /app .

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

WORKDIR /app/apps/proxy
CMD ["bun", "run", "./dist/index.js"]
