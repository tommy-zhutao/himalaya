# AI News Hub Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Build a commercial-ready AI news aggregation platform with microservices architecture

**Architecture:** Microservices-based system with Next.js frontend, 7 backend services, PostgreSQL database, and Redis for caching/queues. Services communicate via HTTP REST API.

**Tech Stack:**
- Frontend: Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Express.js, TypeScript, Prisma ORM
- Database: PostgreSQL 15, Redis 7
- Infrastructure: Docker, Docker Compose
- Deployment: Kubernetes (production)

---

## Phase 1: Project Initialization (基础设施搭建)

### Task 1: Create project directory structure

**Files:**
- Create: `news-app/frontend/`
- Create: `news-app/services/api-gateway/`
- Create: `news-app/services/news-api/`
- Create: `news-app/services/user-api/`
- Create: `news-app/services/admin-api/`
- Create: `news-app/services/rss-fetcher/`
- Create: `news-app/services/api-fetcher/`
- Create: `news-app/services/scheduler/`
- Create: `news-app/docker/postgres/`
- Create: `news-app/docs/`
- Create: `news-app/scripts/`
- Create: `news-app/.env.example`

**Step 1: Create directories**
Command: `mkdir -p news-app/{frontend,services/{api-gateway,news-api,user-api,admin-api,rss-fetcher,api-fetcher,scheduler},docker/postgres,docs,scripts}`
Expected: Creates all directories

**Step 2: Verify structure**
Command: `tree -L 3 news-app/`
Expected: Directory tree displayed

**Step 3: Create .env.example**
Content:
```bash
# Database
DATABASE_URL=postgresql://news_admin:news_password@localhost:5432/news_app

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# API URLs
NEWS_API_URL=http://localhost:4001
USER_API_URL=http://localhost:4002
ADMIN_API_URL=http://localhost:4003

# News API Keys (optional)
NEWSAPI_KEY=your_newsapi_key_here
GNEWS_API_KEY=your_gnews_api_key_here

# Cron Schedules
RSS_FETCH_CRON=*/15 * * * *
API_FETCH_CRON=0 * * * *

# Node
NODE_ENV=development
PORT=4000

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Step 4: Commit**
Command: `git add . && git commit -m "chore: create project directory structure"`
Expected: Git commit successful

---

### Task 2: Initialize Docker Compose configuration

**Files:**
- Create: `news-app/docker-compose.yml`

**Step 1: Write docker-compose.yml**
Content:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: news-app-postgres
    environment:
      POSTGRES_DB: news_app
      POSTGRES_USER: news_admin
      POSTGRES_PASSWORD: news_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U news_admin -d news_app"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: news-app-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api-gateway:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    container_name: news-app-gateway
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: development
      NEWS_API_URL: http://news-api:4001
      USER_API_URL: http://user-api:4002
      ADMIN_API_URL: http://admin-api:4003
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:-dev_jwt_secret}
    depends_on:
      - redis

  news-api:
    build:
      context: ./services/news-api
      dockerfile: Dockerfile
    container_name: news-app-news-api
    ports:
      - "4001:4001"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  user-api:
    build:
      context: ./services/user-api
      dockerfile: Dockerfile
    container_name: news-app-user-api
    ports:
      - "4002:4002"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app
      JWT_SECRET: ${JWT_SECRET:-dev_jwt_secret}
      JWT_EXPIRES_IN: 7d
    depends_on:
      postgres:
        condition: service_healthy

  admin-api:
    build:
      context: ./services/admin-api
      dockerfile: Dockerfile
    container_name: news-app-admin-api
    ports:
      - "4003:4003"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app
      JWT_SECRET: ${JWT_SECRET:-dev_jwt_secret}
    depends_on:
      postgres:
        condition: service_healthy

  rss-fetcher:
    build:
      context: ./services/rss-fetcher
      dockerfile: Dockerfile
    container_name: news-app-rss-fetcher
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app
      NEWS_API_URL: http://news-api:4001
      CRON_SCHEDULE: "*/15 * * * *"
    depends_on:
      postgres:
        condition: service_healthy
      news-api:
        condition: service_started

  api-fetcher:
    build:
      context: ./services/api-fetcher
      dockerfile: Dockerfile
    container_name: news-app-api-fetcher
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app
      NEWS_API_URL: http://news-api:4001
      CRON_SCHEDULE: "0 * * * *"
    depends_on:
      postgres:
        condition: service_healthy
      news-api:
        condition: service_started

  scheduler:
    build:
      context: ./services/scheduler
      dockerfile: Dockerfile
    container_name: news-app-scheduler
    environment:
      NODE_ENV: development
      REDIS_URL: redis://redis:6379
      RSS_FETCHER_URL: http://rss-fetcher:4004
      API_FETCHER_URL: http://api-fetcher:4005
    depends_on:
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: news-app-frontend
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_API_URL: http://localhost:4000
    depends_on:
      - api-gateway

volumes:
  postgres_data:
  redis_data:
```

**Step 2: Validate syntax**
Command: `cd news-app && docker compose config`
Expected: No syntax errors

**Step 3: Commit**
Command: `git add docker-compose.yml && git commit -m "feat: add Docker Compose configuration"`
Expected: Git commit successful

---

### Task 3: Setup PostgreSQL with initialization script

**Files:**
- Create: `news-app/docker/postgres/init.sql`

**Step 1: Write database schema**
Content: (Complete SQL schema from design.md - see docs/design.md)

**Step 2: Commit**
Command: `git add docker/postgres/ && git commit -m "feat: add PostgreSQL initialization script"`
Expected: Git commit successful

---

### Task 4: Initialize and start PostgreSQL service

**Files:**
- Modify: `news-app/docker-compose.yml`

**Step 1: Start PostgreSQL container**
Command: `cd news-app && docker compose up -d postgres`
Expected: PostgreSQL container starts

**Step 2: Wait for healthy status**
Command: `docker compose ps postgres`
Expected: Status: healthy

**Step 3: Test connection**
Command: `docker compose exec postgres pg_isready -U news_admin -d news_app`
Expected: "news_app is ready to accept connections"

**Step 4: Verify tables created**
Command: `docker compose exec postgres psql -U news_admin -d news_app -c "\dt"`
Expected: List of tables (users, news, news_sources, etc.)

**Step 5: Commit**
Command: `git add -A && git commit -m "feat: configure and verify PostgreSQL service"`
Expected: Git commit successful

---

### Task 5: Setup Redis service and verify connectivity

**Files:**
- Modify: `news-app/docker-compose.yml`

`docker compose up -d redis`

**Step 3: Test Redis connection**
`docker compose exec redis redis-cli ping`

**Step 4: Expected output**
Expected: PONG

**Step 5: Commit**
`git add -A && git commit -m "feat: configure and verify Redis service"`

---

## Phase 2: Backend Services (后端服务)

### Task 6: Create shared TypeScript configuration

**Files:**
- Create: `news-app/tsconfig.base.json`

**Step 1: Write base tsconfig**
Content:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  }
}
```

**Step 2: Commit**
Command: `git add tsconfig.base.json && git commit -m "chore: add shared TypeScript configuration"`
Expected: Git commit successful

---

### Task 7: Initialize News API Service

**Files:**
- Create: `news-app/services/news-api/package.json`
- Create: `news-app/services/news-api/tsconfig.json`
- Create: `news-app/services/news-api/src/index.ts`
- Create: `news-app/services/news-api/Dockerfile`

**Step 1: Initialize Node.js project**
Command: `cd news-app/services/news-api && npm init -y`
Expected: package.json created

**Step 2: Install dependencies**
Command: `npm install express @types/express cors @types/cors dotenv @prisma/client`
Expected: Dependencies installed

**Step 3: Install dev dependencies**
Command: `npm install -D typescript ts-node @types/node prisma`
Expected: Dev dependencies installed

**Step 4: Create src/index.ts**
Content:
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'news-api' });
});

app.get('/api/news', (req, res) => {
  res.json({ news: [] });
});

app.listen(PORT, () => {
  console.log(`News API service running on port ${PORT}`);
});
```

**Step 5: Create Dockerfile**
Content:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 4001

CMD ["node", "dist/index.js"]
```

**Step 6: Commit**
Command: `git add services/news-api/ && git commit -m "feat: initialize News API service"`
Expected: Git commit successful

---

### Task 8: Setup Prisma for News API

**Files:**
- Create: `news-app/services/news-api/prisma/schema.prisma`
- Create: `news-app/services/news-api/.env`

**Step 1: Initialize Prisma**
Command: `cd news-app/services/news-api && npx prisma init`
Expected: Prisma initialized

**Step 2: Write schema.prisma**
Content: (Prisma schema matching the PostgreSQL tables)

**Step 3: Commit**
Command: `git add services/news-api/prisma/ && git commit -m "feat: setup Prisma ORM for News API"`
Expected: Git commit successful

---

### Task 9: Create News API endpoints

**Files:**
- Create: `news-app/services/news-api/src/routes/news.routes.ts`

**Step 1: Write news routes module**
Content:
```typescript
import { Router } from 'express';

const router = Router();

// GET /api/news - Get news list
router.get('/', async (req, res) => {
  const { page = 1, limit = 20, category, sort } = req.query;
  // TODO: Implement with Prisma
  res.json({ news: [], page: parseInt(page as string), limit: parseInt(limit as string) });
});

// GET /api/news/:id - Get news detail
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  // TODO: Implement with Prisma
  res.json({ id, title: '', content: '' });
});

// GET /api/news/search - Search news
router.get('/search', async (req, res) => {
  const { q } = req.query;
  // TODO: Implement with Prisma full-text search
  res.json({ results: [] });
});

export default router;
```

**Step 2: Update src/index.ts to use routes**
Content: (Import and use news routes)

**Step 3: Commit**
Command: `git add services/news-api/src/ && git commit -m "feat: add news API endpoints"`
Expected: Git commit successful

---

### Task 10-17: Initialize remaining backend services

(Continue similar pattern for: User API, Admin API, RSS Fetcher, API Fetcher, Scheduler, API Gateway)

---

## Phase 3: Frontend (前端)

### Task 18: Initialize Next.js Frontend

**Files:**
- Create: `news-app/frontend/package.json`

**Step 1: Create Next.js app**
Command: `cd news-app && npx create-next-app@latest frontend --typescript --app --tailwind --eslint --no-src-dir --import-alias "@/*"`
Expected: Next.js app created

**Step 2: Install additional dependencies**
Command: `cd news-app/frontend && npm install @tanstack/react-query zustand axios`
Expected: Dependencies installed

**Step 3: Commit**
Command: `git add frontend/ && git commit -m "feat: initialize Next.js frontend"`
Expected: Git commit successful

---

### Task 19: Setup shadcn/ui components

**Files:**
- Create: `news-app/frontend/components/`

**Step 1: Initialize shadcn/ui**
Command: `cd news-app/frontend && npx shadcn@latest init`
Expected: shadcn/ui initialized

**Step 2: Add required components**
Command: `npx shadcn@latest add button card input dialog dropdown-menu`
Expected: Components added

**Step 3: Commit**
Command: `git add frontend/components/ && git commit -m "feat: setup shadcn/ui components"`
Expected: Git commit successful

---

### Task 20: Create news list page

**Files:**
- Create: `news-app/frontend/app/page.tsx`

**Step 1: Write homepage component**
Content: (News list with pagination)

**Step 2: Commit**
Command: `git add frontend/app/page.tsx && git commit -m "feat: add news list page"`
Expected: Git commit successful

---

### Task 21-24: Create remaining pages

(News detail, search, admin dashboard, auth pages)

---

## Phase 4: Integration and Testing (集成和测试) ✅ COMPLETED

### Task 25: Test all services health ✅

**Completed: 2026-03-11**

**Implementation:**
- api-fetcher service: External API news fetching (NewsAPI, GNews, custom APIs)
- scheduler service: Unified fetch orchestration with Redis distributed locking
- All services compile and start successfully

**Files created:**
- `services/api-fetcher/src/lib/api-fetcher.ts` - API fetch logic
- `services/api-fetcher/src/lib/prisma.ts` - Database client
- `services/scheduler/src/lib/scheduler.ts` - Scheduler orchestration

**Verification:**
```bash
# api-fetcher
✅ Database connected
⏰ Cron job scheduled: 0 * * * *
🚀 API Fetcher Service running on port 4005

# scheduler
⏰ RSS cron job scheduled: */15 * * * *
⏰ API cron job scheduled: 0 * * * *
🚀 Scheduler Service running on port 4006
✅ Redis connected
```

**Commit:** d7030e1b

---

## Phase 5: Final Polish (最终完善)

### Task 26-30: Final tasks

(Seed data, end-to-end testing, Docker health checks, README)

---

## Execution Notes

- Each task should take 2-5 minutes to complete
- Run services in Docker for proper isolation
- Use the provided commit messages for consistency
- Verify each step before proceeding to the next
