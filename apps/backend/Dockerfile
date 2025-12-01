FROM oven/bun:1.2.22-alpine AS base

# Stage 1: Install and Build
FROM base AS builder
WORKDIR /app

# Copy workspace configuration and package files
COPY package.json bun.lock turbo.json ./
COPY packages/ ./packages/
COPY apps/backend/package.json ./apps/backend/package.json

# Install all dependencies (including dev dependencies for build)
RUN bun install

# Copy source code
COPY . .

# Generate Prisma client for the target platform
RUN bun run db:generate

# Build the project
RUN bun run build --filter=backend

# Stage 2: Runtime
FROM base AS runtime
WORKDIR /app

# Create app user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app

# Copy the built application and production dependencies from builder
COPY --from=builder --chown=app:nodejs /app .

USER app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application using the built JavaScript files
WORKDIR /app/apps/backend
CMD ["bun", "run", "./dist/index.js"]