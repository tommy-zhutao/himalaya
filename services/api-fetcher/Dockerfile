FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install all dependencies (including dev for build)
COPY package*.json ./
RUN npm install

# Copy TypeScript config, source, and prisma
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 4005

CMD ["node", "dist/index.js"]
