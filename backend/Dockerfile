# ==============================================================================
# Multi-stage Dockerfile for Chandra Precision ERP Backend (Node 20 Alpine)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies
# ------------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies if native addons needed
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ------------------------------------------------------------------------------
# Stage 2: Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl/wget for health check
RUN apk add --no-cache wget

# Create log directory and set ownership to non-root node user
RUN mkdir -p /app/logs && chown -R node:node /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node countries.csv ./countries.csv

# Use standard non-root user
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/app.js"]
