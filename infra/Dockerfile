# Dockerfile for database operations (migrations, seeding)
FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/rules-engine/package.json ./packages/rules-engine/
COPY infra/package.json ./infra/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY infra/ ./infra/

# Build shared packages
RUN pnpm --filter @ai-mmo/shared-types build
RUN pnpm --filter @ai-mmo/rules-engine build

# Generate Prisma client
WORKDIR /app/infra
RUN npx prisma generate

# Set working directory back to infra
WORKDIR /app/infra
