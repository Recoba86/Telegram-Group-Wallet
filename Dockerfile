FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.server.json ./

# Install dependencies (ts-node is now a production dependency)
RUN npm install

# Copy source code
COPY src ./src

# Create backup and logs directories with proper permissions
RUN mkdir -p /backups /app/logs && chown -R node:node /backups /app/logs

# Copy webapp static files
COPY src/web/webapp ./src/web/webapp

# Switch to non-root user
USER node

# Expose web port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run with ts-node in transpileOnly mode (skips type checking for fast startup)
CMD ["npx", "ts-node", "--transpile-only", "--project", "tsconfig.server.json", "src/index.ts"]
