FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# Expose port
EXPOSE 4010

# Start
CMD ["npm", "start"]
