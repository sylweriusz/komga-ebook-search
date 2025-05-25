FROM node:18-slim

WORKDIR /app

# Install required packages
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install global dependencies
RUN npm install -g typescript

# Copy package files
COPY package*.json ./

# Install dependencies (use ci for faster, reproducible builds)
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Set the entrypoint
ENTRYPOINT ["node", "dist/index.js"]
