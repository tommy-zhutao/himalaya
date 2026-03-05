# AI 新闻资讯网站 - 设计文档

**项目名称：** AI News Hub
**设计日期：** 2026-03-05
**目标：** 商用产品原型

---

## 📋 目录

1. [项目概述](#项目概述)
2. [技术选型](#技术选型)
3. [架构设计](#架构设计)
4. [前端设计](#前端设计)
5. [后端服务设计](#后端服务设计)
6. [数据库设计](#数据库设计)
7. [部署设计](#部署设计)
8. [开发计划](#开发计划)

---

## 项目概述

### 目标
构建一个可商用化的 AI 新闻资讯网站，支持多数据源订阅、每日自动更新、移动端适配、后台管理。

### 核心功能
- 📰 多新闻源订阅（RSS + API）
- 🔄 自动定时抓取和更新
- 📱 响应式设计，支持移动端
- 🔍 全文搜索和智能推荐
- 👤 用户系统和收藏功能
- ⚙️ 后台管理面板

### 非功能性需求
- 可扩展性：支持横向扩展
- 可靠性：服务故障隔离
- 性能：支持高并发查询
- 可维护性：模块化设计

---

## 技术选型

### 前端
- **框架：** Next.js 14+ (App Router)
- **语言：** TypeScript
- **样式：** Tailwind CSS
- **UI 组件：** shadcn/ui
- **状态管理：** Zustand
- **数据获取：** React Query

### 后端
- **API Gateway：** Next.js API Routes
- **微服务：** Express.js + TypeScript
- **ORM：** Prisma
- **认证：** JWT + bcrypt
- **任务调度：** node-cron + Bull

### 数据库
- **主数据库：** PostgreSQL 15
- **缓存：** Redis 7
- **全文搜索：** PostgreSQL tsvector (中文分词)

### 部署
- **容器化：** Docker + Docker Compose
- **编排（生产）：** Kubernetes
- **CI/CD：** GitHub Actions

---

## 架构设计

### 整体架构图

```
┌──────────────────────────────────────────────────────┐
│                       用户                             │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────┐
│                  Next.js Frontend                     │
│              (React + TypeScript + Tailwind)           │
└─────────────────────────┬──────────────────────────────┘
                          │ API 调用
                          ↓
┌──────────────────────────────────────────────────────┐
│                    API Gateway                         │
│         (认证、限流、路由、日志、错误处理)              │
└────┬───────┬───────┬─────────────────────────────────┘
     ↓       ↓       ↓
┌────────┐ ┌────────┐ ┌────────┐
│ News   │ │ User   │ │ Admin  │
│ API    │ │ API    │ │ API    │
└────┬───┘ └────────┘ └────────┘
     ↓
┌──────────────────────────────────────────────────────┐
│                    PostgreSQL                          │
│  (users, news, sources, logs, stats)                  │
└────┬───────────────────────────────────────────────────┘
     ↑
     │
┌──────────────────────────────────────────────────────┐
│                Fetcher Services                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ RSS      │  │ API      │  │Scheduler │           │
│  │ Fetcher  │  │ Fetcher  │  │          │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────┘
         ↖────────────────↗
                Redis
           (缓存 + 任务队列)
```

---

## 前端设计

### 技术栈
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- React Query

### 页面结构

```
/                    - 首页（新闻列表）
/news/[id]           - 新闻详情
/category/[slug]      - 分类浏览
/search               - 搜索页面
/admin                - 后台管理
  /admin/sources      - 新闻源管理
  /admin/logs        - 抓取日志
  /admin/dashboard   - 数据看板
/login                - 登录页
/register             - 注册页
```

### 核心功能

#### 1. 新闻列表
- 分页加载
- 按时间/热度排序
- 筛选（分类、标签）
- 移动端无限滚动

#### 2. 新闻详情
- 完整内容展示
- 相关新闻推荐
- 分享功能
- 收藏功能

#### 3. 搜索
- 实时搜索建议
- 高级搜索（日期、来源、分类）
- 搜索历史

#### 4. 后台管理
- 新闻源 CRUD
- 抓取日志查看
- 系统状态监控
- 用户管理

#### 5. 认证系统
- JWT 登录/注册
- 自动刷新 Token
- 权限控制

---

## 后端服务设计

### API Gateway

**技术栈：** Next.js API Routes + TypeScript

**职责：**
- 统一入口，路由分发
- CORS 配置
- JWT 认证中间件
- 请求限流（Redis）
- 错误统一处理
- 日志记录

**路由：**
```
GET  /.well-known/health    - 健康检查
GET  /api/news/*            → News API Service
GET  /api/users/*           → User API Service
GET  /api/admin/*           → Admin API Service
POST /api/auth/*            → User API Service
```

---

### News API Service

**技术栈：** Express.js + TypeScript + Prisma

**端口：** 4001

**API 接口：**
```
GET  /health                  - 健康检查
GET  /api/news                - 获取新闻列表
GET  /api/news/:id            - 获取新闻详情
GET  /api/news/search         - 搜索新闻
GET  /api/news/hot            - 热门新闻排行
GET  /api/news/related/:id    - 相关新闻
```

**查询参数：**
```
GET /api/news?page=1&limit=20&category=tech&sort=latest
```

---

### User API Service

**技术栈：** Express.js + TypeScript + Prisma + bcrypt + jsonwebtoken

**端口：** 4002

**API 接口：**
```
POST /api/auth/register       - 用户注册
POST /api/auth/login          - 用户登录
POST /api/auth/refresh        - 刷新 Token
GET  /api/users/me            - 获取当前用户信息
PUT  /api/users/me            - 更新用户信息
GET  /api/users/favorites     - 获取收藏列表
POST /api/users/favorites/:id - 添加收藏
DELETE /api/users/favorites/:id - 删除收藏
```

---

### Admin API Service

**技术栈：** Express.js + TypeScript + Prisma

**端口：** 4003

**API 接口：**
```
GET  /api/admin/sources         - 获取所有新闻源
POST /api/admin/sources         - 创建新闻源
PUT  /api/admin/sources/:id     - 更新新闻源
DELETE /api/admin/sources/:id   - 删除新闻源
POST /api/admin/sources/:id/fetch - 手动触发抓取

GET  /api/admin/logs            - 获取抓取日志
GET  /api/admin/stats           - 获取系统统计

GET  /api/admin/users           - 用户管理（CRUD）
GET  /api/admin/news            - 新闻管理（CRUD）
```

---

### RSS Fetcher Service

**技术栈：** Node.js + TypeScript + rss-parser + node-cron

**端口：** 4004

**功能：**
1. 定时抓取（node-cron）
2. RSS 解析
3. 数据去重
4. 错误重试

---

### News API Fetcher Service

**技术栈：** Node.js + TypeScript + axios + node-cron

**端口：** 4005

**支持的 API：**
- NewsAPI
- GNews
- 可扩展自定义 API

---

### Scheduler Service

**技术栈：** Node.js + TypeScript + node-cron + Bull

**端口：** 4006

**功能：**
1. 任务调度
2. 任务队列管理
3. 失败任务重试
4. 健康检查

---

### 服务间通信

| 服务 | 依赖的服务 | 通信方式 |
|------|------------|---------|
| API Gateway | News/User/Admin API | HTTP REST |
| News API | PostgreSQL | Prisma ORM |
| User API | PostgreSQL | Prisma ORM |
| Admin API | PostgreSQL | Prisma ORM |
| RSS Fetcher | PostgreSQL, News API | HTTP + Prisma |
| API Fetcher | PostgreSQL, News API | HTTP + Prisma |
| Scheduler | RSS Fetcher, API Fetcher | HTTP |

---

## 数据库设计

### ER 图

```
┌─────────────┐         ┌─────────────┐
│   users     │1      * │user_favorites│
├─────────────┤─────────├─────────────┤
│ id (PK)     │         │ id (PK)     │
│ email       │         │ user_id (FK) │
│ username    │         │ news_id (FK) │
│ password    │         └─────────────┘
│ preferences │         *            1
│ role        │──────────────────────┐│
└─────────────┘                       ↓│
                                       │
┌┬────────────┐1    *            ┌─────────────┐
││news_sources│────────────────→ │    news     │
│├────────────┤                  ├─────────────┤
││ id (PK)     │                  │ id (PK)     │
││ name        │                  │ source_id(FK)│
││ type        │                  │ title       │
││ url         │                  │ summary     │
││ config      │                  │ content     │
││ enabled     │                  │ url         │
│└────────────┘                  │ tags        │
                                 │ view_count  │
                                 └─────────────┘
                                       ↑
                              *      │
┌─────────────┐─────────────────────┘
│fetch_logs   │
├─────────────┤
│ id (PK)     │
│ source_id(FK)│
│ status      │
│ items_fetched│
└─────────────┘
```

### 表结构

#### users (用户表)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  preferences JSONB DEFAULT '{}'::jsonb,
  role VARCHAR(50) DEFAULT 'user' NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);
```

#### news_sources (新闻源表)
```sql
CREATE TABLE news_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  url VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  config JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  fetch_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### news (新闻表)
```sql
CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES news_sources(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  content TEXT,
  author VARCHAR(255),
  url VARCHAR(500) UNIQUE NOT NULL,
  image_url VARCHAR(500),
  category VARCHAR(100),
  tags JSONB DEFAULT '[]'::jsonb,
  published_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  search_vector tsvector
);
```

#### user_favorites (用户收藏表)
```sql
CREATE TABLE user_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, news_id)
);
```

#### fetch_logs (抓取日志表)
```sql
CREATE TABLE fetch_logs (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES news_sources(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL,
  items_fetched INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### daily_stats (每日统计表)
```sql
CREATE TABLE daily_stats (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  total_news INTEGER DEFAULT 0,
  total_fetched INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 部署设计

### Docker Compose（开发环境）

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: news_app
      POSTGRES_USER: news_admin
      POSTGRES_PASSWORD: news_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api-gateway:
    build: ./services/api-gateway
    ports:
      - "4000:4000"
    environment:
      NEWS_API_URL: http://news-api:4001
      USER_API_URL: http://user-api:4002
      ADMIN_API_URL: http://admin-api:4003
      REDIS_URL: redis://redis:6379

  news-api:
    build: ./services/news-api
    ports:
      - "4001:4001"
    environment:
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app

  user-api:
    build: ./services/user-api
    ports:
      - "4002:4002"
    environment:
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app

  admin-api:
    build: ./services/admin-api
    ports:
      - "4003:4003"
    environment:
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app

  rss-fetcher:
    build: ./services/rss-fetcher
    ports:
      - "4004:4004"
    environment:
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app

  api-fetcher:
    build: ./services/api-fetcher
    ports:
      - "4005:4005"
    environment:
      DATABASE_URL: postgresql://news_admin:news_password@postgres:5432/news_app

  scheduler:
    build: ./services/scheduler
    environment:
      REDIS_URL: redis://redis:6379

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes（生产环境）

**关键组件：**
- Namespace: `news-app`
- Deployments: 每个服务独立部署
- Services: 内部服务发现
- Ingress: 对外流量入口
- ConfigMap: 配置管理
- Secret: 敏感信息
- PersistentVolumeClaim: 数据持久化
- HorizontalPodAutoscaler: 自动扩缩容

---

## 开发计划

### Phase 1: 基础设施
1. 初始化项目结构
2. 设置 Docker 环境
3. 配置 PostgreSQL
4. 配置 Redis
5. 设置 Prisma ORM

### Phase 2: 后端服务
1. 创建 API Gateway
2. 创建 News API Service
3. 创建 User API Service
4. 创建 Admin API Service
5. 创建 Fetcher Services
6. 创建 Scheduler Service

### Phase 3: 前端
1. 初始化 Next.js 项目
2. 创建页面结构
3. 实现新闻列表
4. 实现新闻详情
5. 实现搜索功能
6. 实现后台管理
7. 实现认证系统

### Phase 4: 数据抓取
1. 配置 RSS 源
2. 配置 API 源
3. 实现定时任务
4. 实现错误处理
5. 实现数据去重

### Phase 5: 测试和优化
1. 单元测试
2. 集成测试
3. 性能优化
4. 部署测试

---

## 附录

### 默认新闻源

**RSS 源：**
- Hacker News: https://hnrss.org/frontpage
- 36氪科技: https://36kr.com/feed
- 钛媒体: https://www.tmtpost.com/feed

**API 源：**
- NewsAPI (需要 API Key)
- GNews (需要 API Key)

### 环境变量

见 `.env.example`

---

**文档版本：** 1.0
**最后更新：** 2026-03-05
