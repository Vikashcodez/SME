# ==============================================================================
# Multi-stage Dockerfile for Chandra Precision ERP Frontend (Vite + React + Nginx)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Vite React SPA
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package descriptors
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Run production build
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Server
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
