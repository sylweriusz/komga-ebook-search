FROM node:18-slim

WORKDIR /app

# Install global dependencies
RUN npm install -g typescript

# Copy package files
COPY package*.json ./

# Install dependencies (use ci for faster, reproducible builds)
RUN npm ci --ignore-scripts

# Copy source code
COPY src/ ./src/

# Build the project
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Set the entrypoint
ENTRYPOINT ["node", "dist/index.js"]
