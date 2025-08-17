# Multi-stage build for Next.js application
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Build shared packages
# Ensure workspace dependencies are properly linked
RUN pnpm install --frozen-lockfile --prefer-offline

# Build shared packages
RUN pnpm --filter @ai-mmo/shared-types build

# Build Next.js application
RUN pnpm --filter @ai-mmo/web build

# Production stage
FROM node:18-alpine AS production

# Install pnpm and curl for health checks
RUN npm install -g pnpm && apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built packages and application
COPY --from=base /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public

# Copy Next.js configuration
COPY apps/web/next.config.js ./apps/web/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3008/api/health || exit 1

# Start the application
CMD ["node_modules/.bin/next", "start", "-p", "3008"]
