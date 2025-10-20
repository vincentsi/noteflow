# Multi-stage Dockerfile for Next.js frontend (Monorepo-compatible)
# This Dockerfile must be built from the MONOREPO ROOT with context
# docker build -f apps/frontend/Dockerfile -t frontend .

FROM node:20-alpine AS base

# Install dependencies for the entire monorepo
FROM base AS deps
WORKDIR /app

# Copy root workspace files first
COPY package*.json ./
COPY turbo.json ./

# Copy workspace package files
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/tsconfig/package*.json ./packages/tsconfig/
COPY packages/eslint-config/package*.json ./packages/eslint-config/

# Install ALL workspace dependencies (monorepo needs root context)
RUN npm ci

# Build stage - compile Next.js application
FROM base AS builder
WORKDIR /app

# Copy all necessary files for build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY package*.json ./
COPY turbo.json ./
COPY apps/frontend ./apps/frontend
COPY packages ./packages

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js from frontend directory
WORKDIR /app/apps/frontend
RUN npm run build

# Production image - minimal size with standalone output
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build from Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "apps/frontend/server.js"]
