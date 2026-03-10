# CLAUDE.md - AI News Hub 项目指南

> 本文档为 Claude Code 提供项目上下文和开发规范。

## 项目概述

**AI News Hub** 是一个基于微服务架构的 AI 新闻聚合平台，支持多数据源订阅、自动抓取和智能分发。

### 核心功能
- 📰 多新闻源订阅（RSS + API）
- 🔄 自动定时抓取和更新
- 📱 响应式设计，支持移动端
- 🔍 全文搜索和智能推荐
- 👤 用户系统和收藏功能
- ⚙️ 后台管理面板

---

## 技术栈

### 前端
- **框架:** Next.js 14+ (App Router)
- **语言:** TypeScript
- **样式:** Tailwind CSS
- **状态管理:** Zustand
- **数据获取:** React Query (@tanstack/react-query)
- **HTTP 客户端:** Axios

### 后端
- **API 服务:** Express.js + TypeScript
- **ORM:** Prisma
- **认证:** JWT + bcrypt
- **任务调度:** node-cron
- **缓存:** Redis (ioredis)

### 数据库
- **主数据库:** PostgreSQL 15
- **缓存:** Redis 7

### 基础设施
- **容器化:** Docker + Docker Compose
- **编排（生产）:** Kubernetes

---

## 项目结构

```
news-app/
├── frontend/                # Next.js 前端应用
│   ├── app/                 # App Router 页面
│   ├── components/          # React 组件
│   └── lib/                 # 工具函数和 API 客户端
│
├── services/                # 后端微服务
│   ├── api-gateway/         # API 网关 (端口 4000)
│   ├── news-api/            # 新闻 API 服务 (端口 4001)
│   ├── user-api/            # 用户 API 服务 (端口 4002)
│   ├── admin-api/           # 管理 API 服务 (端口 4003)
│   ├── rss-fetcher/         # RSS 抓取服务 (端口 4004)
│   ├── api-fetcher/         # API 抓取服务 (端口 4005)
│   └── scheduler/           # 任务调度服务 (端口 4006)
│
├── docker/                  # Docker 配置
│   └── postgres/            # PostgreSQL 初始化脚本
│
├── docs/                    # 项目文档
│   ├── design.md            # 设计文档
│   └── plans/               # 实施计划
│
├── scripts/                 # 工具脚本
│
├── docker-compose.yml       # Docker Compose 配置
├── tsconfig.base.json       # 共享 TypeScript 配置
└── .env.example             # 环境变量示例
```

---

## 服务端口映射

| 服务 | 端口 | 描述 |
|------|------|------|
| Frontend | 3000 | Next.js 前端应用 |
| API Gateway | 4000 | 统一 API 入口 |
| News API | 4001 | 新闻相关 API |
| User API | 4002 | 用户认证 API |
| Admin API | 4003 | 管理后台 API |
| RSS Fetcher | 4004 | RSS 新闻抓取 |
| API Fetcher | 4005 | API 新闻抓取 |
| Scheduler | 4006 | 任务调度服务 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |

---

## 常用命令

### 开发环境启动

```bash
# 启动所有服务
docker compose up -d

# 启动单个服务
docker compose up -d postgres redis
docker compose up -d news-api

# 查看服务日志
docker compose logs -f news-api

# 停止所有服务
docker compose down
```

### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 生产模式运行
npm start

# 代码检查
npm run lint
```

### 后端服务开发

```bash
cd services/news-api

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 运行 Prisma 迁移
npx prisma migrate dev

# 生成 Prisma 客户端
npx prisma generate

# 打开 Prisma Studio
npx prisma studio
```

### 数据库操作

```bash
# 连接 PostgreSQL
docker compose exec postgres psql -U news_admin -d news_app

# 查看所有表
\dt

# 查看表结构
\d users
\d news
\d news_sources
```

### Redis 操作

```bash
# 连接 Redis
docker compose exec redis redis-cli

# 测试连接
PING

# 查看所有键
KEYS *

# 清空缓存
FLUSHALL
```

---

## API 接口概览

### API Gateway (4000)
```
GET  /.well-known/health    # 健康检查
GET  /api/news/*            # → News API
GET  /api/users/*           # → User API
GET  /api/admin/*           # → Admin API
POST /api/auth/*            # → User API
```

### News API (4001)
```
GET  /health                # 健康检查
GET  /api/news              # 获取新闻列表
GET  /api/news/:id          # 获取新闻详情
GET  /api/news/search       # 搜索新闻
GET  /api/news/hot          # 热门新闻
GET  /api/news/related/:id  # 相关新闻
```

### User API (4002)
```
POST /api/auth/register     # 用户注册
POST /api/auth/login        # 用户登录
POST /api/auth/refresh      # 刷新 Token
GET  /api/users/me          # 当前用户信息
PUT  /api/users/me          # 更新用户信息
GET  /api/users/favorites   # 收藏列表
POST /api/users/favorites/:id   # 添加收藏
DELETE /api/users/favorites/:id # 取消收藏
```

### Admin API (4003)
```
GET  /api/admin/sources     # 新闻源列表
POST /api/admin/sources     # 创建新闻源
PUT  /api/admin/sources/:id # 更新新闻源
DELETE /api/admin/sources/:id # 删除新闻源
GET  /api/admin/logs        # 抓取日志
GET  /api/admin/stats       # 系统统计
```

---

## 数据库表结构

### 核心表

| 表名 | 描述 |
|------|------|
| `users` | 用户表 |
| `news_sources` | 新闻源配置 |
| `news` | 新闻内容 |
| `user_favorites` | 用户收藏 |
| `fetch_logs` | 抓取日志 |
| `daily_stats` | 每日统计 |

### 关键字段

**news 表:**
- `id`, `source_id`, `title`, `summary`, `content`
- `url`, `image_url`, `category`, `tags`
- `published_at`, `view_count`, `like_count`
- `search_vector` (全文搜索)

**users 表:**
- `id`, `email`, `username`, `password_hash`
- `avatar_url`, `preferences`, `role`
- `is_active`, `created_at`, `last_login_at`

---

## 环境变量

```bash
# 数据库
DATABASE_URL=postgresql://news_admin:news_password@localhost:5432/news_app

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# API URLs
NEWS_API_URL=http://localhost:4001
USER_API_URL=http://localhost:4002
ADMIN_API_URL=http://localhost:4003

# 新闻 API Keys (可选)
NEWSAPI_KEY=your_newsapi_key
GNEWS_API_KEY=your_gnews_api_key

# 定时任务
RSS_FETCH_CRON=*/15 * * * *
API_FETCH_CRON=0 * * * *

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 开发规范

### Git 提交规范

```
feat:     新功能
fix:      Bug 修复
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构
test:     测试
chore:    构建/工具变更
```

### 示例
```bash
git commit -m "feat(news): add pagination to news list API"
git commit -m "fix(auth): resolve JWT token refresh issue"
git commit -m "docs: update API documentation"
```

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 前端使用 Tailwind CSS 类名
- API 响应使用统一格式：
  ```typescript
  // 成功
  { success: true, data: {...} }
  
  // 失败
  { success: false, error: "错误信息" }
  ```

---

## 前端页面路由

```
/                    # 首页（新闻列表）
/news/[id]           # 新闻详情
/category/[slug]     # 分类浏览
/search              # 搜索页面
/login               # 登录页
/register            # 注册页
/admin               # 后台管理
  /admin/sources     # 新闻源管理
  /admin/logs        # 抓取日志
  /admin/dashboard   # 数据看板
```

---

## 开发进度

### 已完成 ✅
- [x] Phase 1: 项目初始化
- [x] Phase 2: 后端服务脚手架
- [x] Phase 3: 前端脚手架
- [x] News/User/Admin API 基础实现
- [x] API Gateway 认证和代理
- [x] 前端登录/注册页面
- [x] 前端新闻列表/详情页
- [x] 前端搜索功能
- [x] Redis 缓存

### 待完成 🚧
- [ ] Phase 4: 后端功能完善
  - [ ] Prisma 完整配置
  - [ ] RSS 抓取完善
  - [ ] 任务调度完善
- [ ] Phase 5: 前端功能完善
  - [ ] 管理后台完善
  - [ ] 用户设置页
- [ ] Phase 6: 测试和部署
  - [ ] 单元测试
  - [ ] 集成测试
  - [ ] 生产环境部署

---

## 参考文档

- [设计文档](./docs/design.md) - 完整的架构设计和数据库设计
- [实施计划](./docs/plans/2026-03-05-implementation-plan.md) - 详细的开发任务清单
- [README.md](./README.md) - 项目说明和快速开始

---

## 常见问题

### Q: 数据库连接失败？
```bash
# 检查 PostgreSQL 是否运行
docker compose ps postgres

# 重启数据库
docker compose restart postgres
```

### Q: 前端无法连接 API？
1. 检查 API Gateway 是否运行 (端口 4000)
2. 检查 `NEXT_PUBLIC_API_URL` 环境变量
3. 检查 CORS 配置

### Q: 如何添加新的新闻源？
1. 通过 Admin API 创建: `POST /api/admin/sources`
2. 或直接插入数据库 `news_sources` 表

---

**文档版本:** 1.0  
**最后更新:** 2026-03-10
