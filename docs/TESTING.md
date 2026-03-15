# 测试指南

## 概述

本文档描述 AI News Hub 的测试策略和测试方法。

## 测试类型

### 1. 单元测试
测试独立的函数和模块

### 2. 集成测试
测试服务之间的交互

### 3. 端到端测试（E2E）
测试完整的用户流程

### 4. API 测试
测试 REST API 端点

## 测试框架

| 类型 | 框架 | 用途 |
|------|------|------|
| 单元/集成 | Jest | 后端服务测试 |
| 单元 | Vitest | 前端组件测试 |
| E2E | Playwright | 用户流程测试 |
| API | Postman/Newman | API 集合测试 |

## 后端测试

### 设置

```bash
cd services/news-api
npm install --save-dev jest @types/jest ts-jest
```

### Jest 配置

创建 `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
};
```

### 测试示例

**单元测试示例** (`src/lib/utils.test.ts`):
```typescript
import { calculateSimilarity, extractKeywords } from './utils';

describe('Utils', () => {
  describe('calculateSimilarity', () => {
    it('should return 1 for identical arrays', () => {
      const arr1 = ['a', 'b', 'c'];
      const arr2 = ['a', 'b', 'c'];
      expect(calculateSimilarity(arr1, arr2)).toBe(1);
    });

    it('should return 0 for disjoint arrays', () => {
      const arr1 = ['a', 'b'];
      const arr2 = ['c', 'd'];
      expect(calculateSimilarity(arr1, arr2)).toBe(0);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = 'AI and machine learning are transforming technology';
      const keywords = extractKeywords(text);
      expect(keywords).toContain('AI');
      expect(keywords).toContain('machine learning');
    });
  });
});
```

**API 路由测试** (`src/routes/news.routes.test.ts`):
```typescript
import request from 'supertest';
import app from '../index';

describe('News API', () => {
  describe('GET /api/news', () => {
    it('should return paginated news list', async () => {
      const response = await request(app)
        .get('/api/news?page=1&limit=10')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.news).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/news/:id', () => {
    it('should return news detail', async () => {
      const response = await request(app)
        .get('/api/news/clx123456')
        .expect(200);

      expect(response.body.data.id).toBe('clx123456');
      expect(response.body.data.title).toBeDefined();
    });

    it('should return 404 for non-existent news', async () => {
      await request(app)
        .get('/api/news/non-existent-id')
        .expect(404);
    });
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- news.routes.test.ts

# 带覆盖率
npm test -- --coverage

# 监听模式
npm test -- --watch
```

## 前端测试

### Vitest 配置

创建 `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.ts',
  },
});
```

### 组件测试示例

```typescript
// components/NewsCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NewsCard from './NewsCard';

describe('NewsCard', () => {
  const mockNews = {
    id: '1',
    title: 'Test News',
    summary: 'Test summary',
    source: { name: 'Test Source' },
    publishedAt: '2024-03-15T10:00:00Z',
  };

  it('should render news title', () => {
    render(<NewsCard news={mockNews} />);
    expect(screen.getByText('Test News')).toBeDefined();
  });

  it('should display source name', () => {
    render(<NewsCard news={mockNews} />);
    expect(screen.getByText('Test Source')).toBeDefined();
  });
});
```

### 运行前端测试

```bash
cd frontend
npm test
```

## E2E 测试

### Playwright 配置

创建 `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

### E2E 测试示例

```typescript
// e2e/news.spec.ts
import { test, expect } from '@playwright/test';

test.describe('News Flow', () => {
  test('should display news list on homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="news-list"]')).toBeVisible();
  });

  test('should search for news', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'AI');
    await page.press('[data-testid="search-input"]', 'Enter');
    await expect(page).toHaveURL(/.*search\?q=AI/);
  });

  test('should view news detail', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="news-card"]:first-child');
    await expect(page.locator('[data-testid="news-detail"]')).toBeVisible();
  });

  test('should login and view favorites', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');
    await expect(page).toHaveURL('/');
    
    await page.goto('/favorites');
    await expect(page.locator('[data-testid="favorites-list"]')).toBeVisible();
  });
});
```

### 运行 E2E 测试

```bash
# 安装浏览器
npx playwright install

# 运行测试
npx playwright test

# UI 模式
npx playwright test --ui
```

## API 测试集合

### Postman 集合

导入 `postman_collection.json` 测试所有 API 端点。

### 使用 Newman CLI

```bash
# 安装 Newman
npm install -g newman

# 运行集合
newman run postman_collection.json -e postman_environment.json
```

## 测试覆盖率目标

| 类型 | 目标覆盖率 |
|------|-----------|
| 单元测试 | 80% |
| 集成测试 | 70% |
| E2E 测试 | 关键流程 100% |

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 测试脚本

```bash
# scripts/test.sh
#!/bin/bash

echo "Running backend tests..."
cd services/news-api && npm test
cd ../..

echo "Running frontend tests..."
cd frontend && npm test
cd ..

echo "Running E2E tests..."
npx playwright test

echo "All tests completed!"
```

## 测试数据

### 数据库种子

创建测试数据：
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建测试用户
  await prisma.user.create({
    data: {
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashed_password',
    },
  });

  // 创建测试新闻源
  await prisma.source.create({
    data: {
      name: 'Test Source',
      type: 'rss',
      url: 'https://test.com/rss',
    },
  });

  // 创建测试新闻
  // ...
}

main();
```

### Mock 数据

```typescript
// test/mocks/news.ts
export const mockNews = {
  id: 'clx123',
  title: 'Test News Title',
  content: 'Test content...',
  summary: 'AI generated summary',
  keywords: ['AI', 'technology'],
  sentiment: 'positive',
  qualityScore: 85,
  sourceId: 'src123',
  publishedAt: new Date('2024-03-15'),
};
```

## 最佳实践

1. **测试隔离** - 每个测试应该独立，不依赖其他测试
2. **描述性命名** - 测试名称应清楚描述测试内容
3. **AAA 模式** - Arrange, Act, Assert
4. **Mock 外部依赖** - 数据库、API 调用等
5. **测试边界情况** - 空值、错误输入、极端情况
6. **保持测试快速** - 使用内存数据库、并行执行
