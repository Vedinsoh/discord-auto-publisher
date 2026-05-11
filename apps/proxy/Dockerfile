FROM oven/bun:1.2.22-alpine AS base

FROM base AS builder
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY packages/ ./packages/
COPY apps/proxy/package.json ./apps/proxy/package.json

RUN bun install

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
