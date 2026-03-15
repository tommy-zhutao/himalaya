FROM node:20-alpine

WORKDIR /app

# Install all dependencies (including dev for build)
COPY package*.json ./
RUN npm install

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 4000

CMD ["node", "dist/index.js"]
