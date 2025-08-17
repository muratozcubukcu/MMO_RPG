# Multi-stage build for NestJS application
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/rules-engine/package.json ./packages/rules-engine/
COPY apps/inventory-service/package.json ./apps/inventory-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/inventory-service/ ./apps/inventory-service/

# Build shared packages
# Ensure workspace dependencies are properly linked
RUN pnpm install --frozen-lockfile --prefer-offline

# Build shared packages
RUN pnpm --filter @ai-mmo/shared-types build
RUN pnpm --filter @ai-mmo/rules-engine build
RUN pnpm --filter @ai-mmo/rules-engine build

# Build application
RUN pnpm --filter @ai-mmo/inventory-service build

# Production stage
FROM node:18-alpine AS production

# Install pnpm and curl for health checks
RUN npm install -g pnpm && apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/rules-engine/package.json ./packages/rules-engine/
COPY apps/inventory-service/package.json ./apps/inventory-service/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built packages and application
COPY --from=base /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=base /app/packages/rules-engine/dist ./packages/rules-engine/dist
COPY --from=base /app/apps/inventory-service/dist ./apps/inventory-service/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3005/healthz || exit 1

# Start the application
CMD ["node", "apps/inventory-service/dist/apps/inventory-service/src/main.js"]
