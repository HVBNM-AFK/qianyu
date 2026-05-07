# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install postgres client tools (optional for debugging)
RUN apk add --no-cache postgresql-client

# Copy from build stage
COPY --from=build /app /app

# Environment variables from .env (Docker will inject these)
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

# Start the MCP server
CMD ["node", "src/server.js"]
