# Multi-stage Dockerfile for Fastify backend (Monorepo-compatible)
# This Dockerfile must be built from the MONOREPO ROOT with context
# docker build -f apps/backend/Dockerfile -t backend .

FROM node:20-alpine AS base

# Install dependencies for the entire monorepo
FROM base AS deps
WORKDIR /app

# Copy root workspace files first
COPY package*.json ./
COPY turbo.json ./

# Copy workspace package files
COPY apps/backend/package*.json ./apps/backend/
COPY packages/tsconfig/package*.json ./packages/tsconfig/
COPY packages/eslint-config/package*.json ./packages/eslint-config/

# Install ALL workspace dependencies (monorepo needs root context)
RUN npm ci

# Copy Prisma schema and generate client
COPY apps/backend/prisma ./apps/backend/prisma
RUN cd apps/backend && npx prisma generate

# Build stage - compile TypeScript
FROM base AS builder
WORKDIR /app

# Copy all necessary files for build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend ./apps/backend
COPY packages ./packages

# Build the backend
WORKDIR /app/apps/backend
RUN npm run build

# Production image - minimal size with only runtime files
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify

# Copy package.json
COPY --from=builder --chown=fastify:nodejs /app/apps/backend/package*.json ./

# Copy node_modules from MONOREPO ROOT (deps stage installs at /app/node_modules)
# This includes all workspace dependencies + Prisma client
COPY --from=deps --chown=fastify:nodejs /app/node_modules ./node_modules

# Copy compiled code and Prisma files
COPY --from=builder --chown=fastify:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/apps/backend/prisma ./prisma

# Switch to non-root user
USER fastify

# Expose backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "start"]
