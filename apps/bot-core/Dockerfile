# Multi-stage build for bot-core
# Stage 1: Dependencies
FROM oven/bun:1.2.22-alpine AS deps

# Install necessary packages (needed for optional dependencies)
RUN apk add g++ make python3 linux-headers

WORKDIR /app

# Copy workspace configuration and packages
COPY package.json bun.lock turbo.json ./
COPY packages/ ./packages/
COPY apps/bot-core/package.json ./apps/bot-core/package.json

# Install dependencies
RUN bun install --frozen-lockfile --production

# Stage 2: Build
FROM oven/bun:1.2.22-alpine AS builder
WORKDIR /app

# Copy all necessary files
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Build the application
RUN bun run build --filter=bot-core

# Stage 3: Runtime
FROM oven/bun:1.2.22-alpine AS runtime

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S app -u 1001

WORKDIR /app

# Copy built application and dependencies
COPY --from=deps --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=app:nodejs /app/apps/bot-core/dist ./apps/bot-core/dist
COPY --from=builder --chown=app:nodejs /app/packages ./packages
COPY --from=builder --chown=app:nodejs /app/package.json ./package.json
COPY --from=builder --chown=app:nodejs /app/turbo.json ./turbo.json

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --version || exit 1

# Start the application
WORKDIR /app/apps/bot-core
CMD ["bun", "run", "start"]