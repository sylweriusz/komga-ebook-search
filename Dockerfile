FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies for build
RUN npm ci

# Copy source code and TypeScript config
COPY src/ ./src/
COPY tsconfig.json ./

# Build the project
RUN npx tsc

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Set the entrypoint
ENTRYPOINT ["node", "dist/index.js"]
