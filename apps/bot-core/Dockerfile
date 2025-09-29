FROM oven/bun:1.2.22-alpine AS base

# Stage 1: Install and Build
FROM base AS builder
# Install necessary packages (needed for optional dependencies)
RUN apk update && apk add --no-cache g++ make python3 linux-headers
WORKDIR /app

# Copy workspace configuration and package files
COPY package.json bun.lock turbo.json ./
COPY packages/ ./packages/
# COPY apps/bot-api/package.json ./apps/bot-api/package.json
COPY apps/bot-core/package.json ./apps/bot-core/package.json

# Install all dependencies (including dev dependencies for build)
RUN bun install

# Copy source code
COPY . .

# Build the project
RUN bun run build --filter=bot-core

# Stage 2: Runtime
FROM base AS runtime
WORKDIR /app

# Create app user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app

# Copy the built application and production dependencies from builder
COPY --from=builder --chown=app:nodejs /app .

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --version || exit 1

# Start the application using the built JavaScript files
WORKDIR /app/apps/bot-core
CMD ["bun", "run", "./dist/index.js"]