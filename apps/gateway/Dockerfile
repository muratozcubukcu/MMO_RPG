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
COPY apps/gateway/package.json ./apps/gateway/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/gateway/ ./apps/gateway/
COPY infra/ ./infra/

# Build shared packages
# Ensure workspace dependencies are properly linked
RUN pnpm install --frozen-lockfile --prefer-offline

# Generate Prisma client
RUN npm install -g prisma && cd infra && PRISMA_SKIP_POSTINSTALL_GENERATE=true npx prisma generate

# Build shared packages
RUN pnpm --filter @ai-mmo/shared-types build
RUN pnpm --filter @ai-mmo/rules-engine build

# Build application
RUN pnpm --filter @ai-mmo/gateway build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/rules-engine/package.json ./packages/rules-engine/
COPY apps/gateway/package.json ./apps/gateway/
COPY infra/package.json ./infra/
COPY infra/prisma/ ./infra/prisma/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy generated Prisma client from base stage
COPY --from=base /app/node_modules/.pnpm ./node_modules/.pnpm

# Copy built packages and application
COPY --from=base /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=base /app/packages/rules-engine/dist ./packages/rules-engine/dist
COPY --from=base /app/apps/gateway/dist ./apps/gateway/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Start the application
CMD ["node", "apps/gateway/dist/apps/gateway/src/main.js"]
