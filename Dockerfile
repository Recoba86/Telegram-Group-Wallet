FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for ts-node)
RUN npm install

# Copy source code
COPY src ./src

# Create backup directory
RUN mkdir -p /backups && chown node:node /backups

# Copy webapp static files
COPY src/web/webapp ./src/web/webapp

# Switch to non-root user
USER node

# Expose web port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run with ts-node directly (no build step)
CMD ["npx", "ts-node", "src/index.ts"]
