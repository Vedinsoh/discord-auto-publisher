FROM oven/bun:1.2.22-alpine

# Stage 1: Build
FROM base AS builder
WORKDIR /app

# Add turbo globally for monorepo support
RUN bun install -g turbo@^2
# Copy source code
COPY . .

# Generate a partial monorepo with a pruned lockfile for a target workspace
RUN turbo prune bot-api --docker

# Stage 2: Install
FROM base AS installer
WORKDIR /app

# Install the dependencies
COPY --from=builder /app/out/json/ .
RUN bun install --frozen-lockfile --production
 
# Build the project
COPY --from=builder /app/out/full/ .
RUN bun turbo run build

# Stage 3: Runtime
FROM base AS runtime
WORKDIR /app

# Create app user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app
USER app

# Copy built application and dependencies
COPY --from=installer --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=app:nodejs /app/apps/bot-api/dist ./apps/bot-api/dist
COPY --from=installer --chown=app:nodejs /app/packages ./packages

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application
WORKDIR /app/apps/bot-api
CMD ["bun", "run", "start"]