FROM node:20-alpine

WORKDIR /app

# Install all dependencies (including dev for build)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 4006

CMD ["node", "dist/index.js"]
