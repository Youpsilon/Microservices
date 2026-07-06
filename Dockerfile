FROM node:20-alpine

WORKDIR /app

# Copy root configurations
COPY package*.json tsconfig.base.json nx.json ./

# Copy all packages (required due to monorepo workspace dependencies)
COPY packages/ ./packages/

# Install dependencies
RUN npm ci

# Default command (intended to be overridden by docker-compose)
CMD ["npm", "run", "dev:gateway"]
