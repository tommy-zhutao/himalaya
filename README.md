# AI News Hub 📰

一个基于微服务架构的 AI 新闻聚合平台，支持多数据源订阅、自动抓取和智能分发。

## 🏗️ 架构概览

```
┌──────────────────────────────────────────────────────┐
│                  Next.js Frontend                    │
│              (React + TypeScript)                    │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────┐
│                    API Gateway                       │
│         (认证、限流、路由、日志)                       │
└────┬───────┬───────┬───────────────────────────────┘
     ↓       ↓       ↓
┌────────┐ ┌────────┐ ┌────────┐
│ News   │ │ User   │ │ Admin  │
│ API    │ │ API    │ │ API    │
└────┬───┘ └────────┘ └────────┘
     ↓
┌──────────────────────────────────────────────────────┐
│                    PostgreSQL                        │
│  (users, news, sources, logs, stats)              │
└──────────────────────────────────────────────────────┘
     ↑
     │
┌──────────────────────────────────────────────────────┐
│                Fetcher Services                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ RSS      │  │ API      │  │Scheduler │      │
│  │ Fetcher  │  │ Fetcher  │  │          │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└──────────────────────────────────────────────────────┘
         ↖────────────────↗
                Redis
```

## 🚀 快速开始

### 前置要求

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### 安装和运行

1. **克隆项目**
```bash
git clone <repository-url>
cd news-app
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，设置必要的配置
```

3. **启动所有服务**
```bash
docker compose up -d
```

4. **访问应用**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- News API: http://localhost:4001
- User API: http://localhost:4002
- Admin API: http://localhost:4003

## 📦 服务列表

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

## 🗄️ 数据库

### 表结构

- `users` - 用户表
- `news_sources` - 新闻源配置
- `news` - 新闻内容
- `user_favorites` - 用户收藏
- `fetch_logs` - 抓取日志
- `daily_stats` - 每日统计

## 📝 开发进度

- [x] Phase 1: 项目初始化
  - [x] 创建项目结构
  - [x] 配置 Docker Compose
  - [x] 设置 PostgreSQL
  - [x] 设置 Redis
- [x] Phase 2: 后端服务脚手架
  - [x] API Gateway
  - [x] News API Service
  - [x] User API Service
  - [x] Admin API Service
  - [x] RSS Fetcher Service
  - [x] API Fetcher Service
  - [x] Scheduler Service
- [x] Phase 3: 前端脚手架
  - [x] Next.js 初始化
  - [x] Tailwind CSS 配置
  - [x] 基础页面结构
- [ ] Phase 4: 后端功能实现
  - [ ] Prisma 配置和数据库连接
  - [ ] 新闻 API 实现
  - [ ] 用户认证实现
  - [ ] RSS 抓取实现
  - [ ] 任务调度实现
- [ ] Phase 5: 前端功能实现
  - [ ] 新闻列表页面
  - [ ] 新闻详情页面
  - [ ] 搜索功能
  - [ ] 用户认证界面
  - [ ] 管理后台
- [ ] Phase 6: 测试和部署
  - [ ] 单元测试
  - [ ] 集成测试
  - [ ] 性能优化
  - [ ] 生产环境部署

## 🔧 技术栈

### 前端
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- Zustand (状态管理)
- React Query (数据获取)

### 后端
- Express.js
- TypeScript
- Prisma ORM
- JWT + bcrypt (认证)
- node-cron (任务调度)
- ioredis (Redis 客户端)

### 基础设施
- PostgreSQL 15
- Redis 7
- Docker
- Docker Compose

## 📚 文档

- [设计文档](./docs/design.md)
- [实施计划](./docs/plans/2026-03-05-implementation-plan.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
