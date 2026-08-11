FROM oven/bun:1.2.22-alpine AS base

# Stage 1: Install and Build
FROM base AS builder
WORKDIR /app

# Copy workspace configuration and package files
COPY package.json bun.lock turbo.json ./
COPY packages/ ./packages/
COPY apps/web/package.json ./apps/web/package.json

# Install all dependencies (including dev dependencies for build)
RUN bun install

# Copy source code
COPY . .

# Build the project. No build arguments are needed: the dashboard reads its
# configuration at runtime (see `getSiteConfig`), so one image works for any
# deployment rather than baking a client id in at build time.
RUN bun run build --filter=web

# Stage 2: Runtime
#
# Node rather than bun: `output: 'standalone'` emits a Node server entrypoint,
# and this is the runtime Next itself targets and tests.
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

# Create app user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app

# The standalone bundle carries its own pruned node_modules; static assets and
# public files are not traced into it and must be copied alongside.
COPY --from=builder --chown=app:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=app:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=app:nodejs /app/apps/web/public ./apps/web/public

USER app

EXPOSE 3100

# 127.0.0.1, not localhost: Next binds to HOSTNAME (0.0.0.0) which is IPv4-only,
# while `localhost` resolves to [::1] first in this image and is refused.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3100/login || exit 1

CMD ["node", "apps/web/server.js"]
