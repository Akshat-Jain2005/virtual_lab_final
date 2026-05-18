# Stage 1: Build & Dependencies
FROM node:22-alpine as builder

WORKDIR /app

# Install build dependencies if needed (e.g., for native modules)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for builds)
RUN npm install

# Copy application code
COPY . .

# Stage 2: Production Runtime
FROM node:22-alpine as runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy built assets and production dependencies from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./
COPY --from=builder /app/monitoring ./monitoring

# Create logs directory
RUN mkdir -p logs

# Expose ports
EXPOSE 5000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

# Start application
CMD ["node", "server.js"]
