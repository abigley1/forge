# Forge - Home Assistant Add-on
# Multi-stage build for minimal production image

# =============================================================================
# Stage 1: Build Frontend
# =============================================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files for frontend build
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Build frontend with production settings
RUN npm run build:prod

# =============================================================================
# Stage 2: Build Server
# =============================================================================
FROM node:22-alpine AS server-builder

WORKDIR /build/server

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy server package files
COPY server/package.json server/package-lock.json ./

# Install server dependencies
RUN npm ci

# Copy server source and build
COPY server/tsconfig.json ./
COPY server/src/ ./src/

RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# =============================================================================
# Stage 3: Production Image
# =============================================================================
FROM node:22-alpine AS production

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache libstdc++

WORKDIR /app

# Copy built frontend from stage 1
COPY --from=frontend-builder /build/dist ./dist

# Copy built server and dependencies from stage 2
COPY --from=server-builder /build/server/dist ./server/dist
COPY --from=server-builder /build/server/node_modules ./server/node_modules
COPY --from=server-builder /build/server/package.json ./server/package.json

# Create data directory and set ownership to node user (UID 1000, already exists in alpine)
RUN mkdir -p /data && chown -R node:node /data /app

# Copy startup script
COPY forge/run.sh /run.sh
RUN chmod +x /run.sh

# Environment defaults
ENV NODE_ENV=production \
    PORT=8099 \
    FORGE_DATA_DIR=/data \
    FORGE_STATIC_DIR=/app/dist \
    FORGE_DB_PATH=/data/forge.sqlite

# Expose port
EXPOSE 8099

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8099/api/health || exit 1

# Run as non-root user (node user already exists in node:alpine)
USER node

# Start server
CMD ["/run.sh"]
