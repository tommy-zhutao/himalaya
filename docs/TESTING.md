# AI News Hub — 测试指南

## 概述

AI News Hub 采用微服务架构，每个服务拥有独立的测试套件。测试框架为 **Jest**（后端）和 **Vitest**（前端）。

### 测试架构图

```
┌─────────────────────────────────────────────────┐
│                 Test Layers                       │
├───────────────┬──────────────┬───────────────────┤
│  Unit Tests   │  Integration │    E2E / Smoke    │
│  (per-service)│  Tests       │    Tests           │
│               │  (per-service│                    │
│  - utils      │  - routes    │  - smoke-test.sh   │
│  - algorithms │  - middleware│  - health-check.sh │
│  - parsers    │  - DB access │  - Playwright      │
└───────────────┴──────────────┴───────────────────┘
```

## Mock 策略

测试中需要 mock 的外部依赖：

| 依赖 | Mock 方式 | 说明 |
|------|----------|------|
| **Prisma (PostgreSQL)** | `jest.mock('@/lib/prisma')` | 使用 mock 对象模拟数据库操作，不连接真实数据库 |
| **Redis** | `jest.mock('ioredis')` | mock 所有 Redis 操作 |
| **智谱 AI API** | `jest.mock('@/lib/zhipu-client')` | mock 外部 AI 调用，返回固定响应 |
| **外部 HTTP 请求** | `nock` 或 `jest.mock('axios')` | mock RSS/API 抓取的外部请求 |
| **JWT** | 真实签名验证 | 使用测试密钥进行真实 JWT 签发和验证 |

### 什么用 Mock，什么用真实

- ✅ **Mock**: 数据库、Redis、外部 API 调用、AI 服务、HTTP 请求
- ✅ **真实**: JWT 验证、数据转换逻辑、算法计算、字符串处理、路由匹配

## 各服务测试运行方式

### 1. News API（新闻服务）

```bash
cd services/news-api
npm test                 # 运行所有测试
npm test -- --watch      # 监听模式
npm test -- --coverage   # 带覆盖率报告
```

测试覆盖：
- `src/lib/utils.test.ts` — 相似度计算、关键词提取、分页等工具函数
- `src/routes/news.routes.test.ts` — 新闻列表、详情、搜索、推荐 API
- `src/routes/news-rss.routes.test.ts` — RSS 抓取相关接口

### 2. User API（用户服务）

```bash
cd services/user-api
npm test
```

测试覆盖：
- 注册 / 登录流程
- JWT 签发和验证
- 用户信息 CRUD
- 收藏管理
- 密码修改

### 3. Admin API（管理服务）

```bash
cd services/admin-api
npm test
```

测试覆盖：
- 管理员权限验证
- 仪表盘统计数据
- 新闻源 CRUD
- 用户管理（启用/禁用）
- 抓取日志查询

### 4. API Gateway（网关）

```bash
cd services/api-gateway
npm test
```

测试覆盖：
- 路由代理转发
- JWT 认证中间件
- 请求限流
- 错误处理
- 请求日志

### 5. AI Analysis（AI 分析服务）

```bash
cd services/ai-analysis
npm test
```

测试覆盖：
- 智谱 API 客户端（mock 调用）
- 摘要生成逻辑
- 关键词提取
- 情感分析
- 质量评分

### 6. Fetchers（抓取服务）

```bash
cd services/rss-fetcher && npm test
cd services/api-fetcher && npm test
cd services/html-fetcher && npm test
cd services/content-fetcher && npm test
```

测试覆盖：
- RSS/Atom XML 解析
- JSON API 响应解析
- HTML 页面内容提取
- 反爬虫处理
- 去重逻辑
- 错误重试

## 根级测试脚本

项目根目录 `package.json` 提供了统一的测试入口：

```bash
# 单个服务
npm run test:news-api
npm run test:user-api
npm run test:admin-api
npm run test:gateway
npm run test:ai-analysis
npm run test:rss-fetcher
npm run test:api-fetcher
npm run test:html-fetcher
npm run test:content-fetcher

# 所有服务
npm run test:all

# 部署验证
npm run test:smoke    # 等同于 ./scripts/smoke-test.sh
npm run test:health   # 等同于 ./scripts/health-check.sh
```

## 添加新测试（Step by Step）

### 1. 单元测试

```bash
# 假设要测试 services/news-api/src/lib/score.ts
cd services/news-api
```

创建测试文件 `src/lib/score.test.ts`：

```typescript
import { calculateScore } from './score';

describe('calculateScore', () => {
  it('should return 0 for empty keywords', () => {
    expect(calculateScore([], ['AI'])).toBe(0);
  });

  it('should return correct score for matching keywords', () => {
    const score = calculateScore(['AI', 'tech'], ['AI', 'news']);
    expect(score).toBeGreaterThan(0);
  });

  it('should handle null input gracefully', () => {
    expect(calculateScore(null, ['AI'])).toBe(0);
  });
});
```

### 2. API 集成测试

创建 `src/routes/example.routes.test.ts`：

```typescript
import request from 'supertest';
import { app } from '../index';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  news: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
}));

describe('GET /api/example', () => {
  it('should return 200 with data', async () => {
    const res = await request(app)
      .get('/api/example')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 401 without auth token', async () => {
    await request(app)
      .get('/api/example/protected')
      .expect(401);
  });
});
```

### 3. Mock 外部 API

```typescript
import nock from 'nock';

beforeAll(() => {
  nock('https://api.example.com')
    .get('/news')
    .reply(200, { articles: [{ title: 'Test' }] });
});

afterAll(() => {
  nock.cleanAll();
});
```

## 覆盖率

### 生成覆盖率报告

```bash
cd services/<service-name>
npm test -- --coverage
```

报告输出在 `coverage/` 目录，打开 `coverage/lcov-report/index.html` 查看详情。

### 覆盖率目标

| 服务类型 | 目标行覆盖率 |
|---------|------------|
| 核心服务 (news-api, user-api) | ≥ 80% |
| 工具服务 (fetchers) | ≥ 70% |
| AI 服务 (ai-analysis) | ≥ 60% |
| 网关 (api-gateway) | ≥ 75% |

## 部署验证测试

### Smoke Test (`scripts/smoke-test.sh`)

冒烟测试在部署后运行，验证所有服务正常：

```bash
./scripts/smoke-test.sh
```

检查项：
1. 12 个服务健康状态（HTTP 端口或 Docker 容器）
2. API Gateway `/health` 返回有效 JSON
3. `/api/news` 返回新闻数据
4. 前端返回 HTML 页面
5. PostgreSQL 和 Redis 连接

### Health Check (`scripts/health-check.sh`)

快速检查所有暴露端口的服务状态：

```bash
./scripts/health-check.sh
```

## 常见问题

### Q: 测试报 `ECONNREFUSED` 错误
A: 单元测试不应该连接真实数据库或 Redis。检查是否忘记 mock Prisma 或 ioredis。

### Q: Jest 找不到 TypeScript 文件
A: 确保已安装 `ts-jest` 和 `@types/jest`，并且 `jest.config.js` 使用 `preset: 'ts-jest'`。

### Q: 测试数据库需要单独配置吗？
A: 不需要。单元/集成测试全部使用 mock，不连接数据库。如果需要真实数据库测试，在 CI 环境中使用 Docker 启动测试数据库。

### Q: 如何调试单个测试？
```bash
cd services/news-api
npx jest --runInBand --verbose src/lib/utils.test.ts
```

## 最佳实践

1. **测试隔离** — 每个测试独立运行，不依赖其他测试的执行顺序
2. **AAA 模式** — Arrange（准备）→ Act（执行）→ Assert（断言）
3. **描述性命名** — `it('should return 404 when news not found')` 而非 `it('test 1')`
4. **Mock 外部依赖** — 数据库、Redis、AI API、HTTP 请求一律 mock
5. **测试边界情况** — 空值、错误输入、大数据量
6. **保持快速** — 不要在测试中sleep或做耗时操作
