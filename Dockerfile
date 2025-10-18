FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.server.json ./

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

# Set environment variables for ts-node
ENV TS_NODE_TRANSPILE_ONLY=true
ENV TS_NODE_PROJECT=tsconfig.server.json

# Expose web port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run with ts-node in transpileOnly mode (skips type checking)
CMD ["npx", "ts-node", "--transpile-only", "--project", "tsconfig.server.json", "src/index.ts"]
