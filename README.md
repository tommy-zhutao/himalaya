# AI News Hub

一个基于 AI 智能分析的新闻聚合平台，支持多源抓取、智能推荐、个性化订阅。

## 🚀 功能特性

### 核心功能
- 📰 **多源新闻抓取** - 支持 RSS 和 API 两种新闻源
- 🤖 **AI 智能分析** - 自动生成摘要、关键词、情感分析、质量评分
- 🔍 **全文搜索** - 支持标题、内容、关键词搜索
- 📱 **响应式设计** - 完美适配移动端和桌面端

### 智能推荐
- 🎯 **相关新闻推荐** - 基于关键词相似度 + 分类匹配
- 👤 **个性化推荐** - 基于阅读历史和收藏偏好
- 📈 **热点话题** - 关键词词频分析，展示热门话题
- 🔄 **重复检测** - 自动过滤重复新闻

### 用户功能
- 🔐 **用户认证** - JWT 登录注册
- ❤️ **收藏管理** - 收藏喜欢的新闻
- ⚙️ **个人设置** - 修改头像、用户名、密码

### 管理后台
- 📊 **仪表盘** - 系统概览和统计
- 📡 **新闻源管理** - 添加/编辑/删除新闻源
- 📰 **新闻管理** - 编辑、推荐、删除新闻
- 👥 **用户管理** - 角色管理、启用/禁用用户
- 📋 **抓取日志** - 查看抓取状态和统计

## 🏗️ 技术架构

### 前端
- **Next.js 15** - React 框架
- **Tailwind CSS** - 样式
- **Zustand** - 状态管理
- **React Query** - 数据请求

### 后端微服务

| 服务 | 端口 | 说明 | 健康检查 |
|------|------|------|---------|
| Frontend | 3000 | Next.js 前端 | `http://localhost:3000` |
| API Gateway | 4000 | 统一网关 | `http://localhost:4000/health` |
| News API | 4001 | 新闻 CRUD | `http://localhost:4001/health` |
| User API | 4002 | 用户认证 | `http://localhost:4002/health` |
| Admin API | 4003 | 管理后台 | `http://localhost:4003/health` |
| RSS Fetcher | 4004 | RSS 抓取（内部） | Docker 容器状态 |
| API Fetcher | 4005 | API 抓取（内部） | Docker 容器状态 |
| Scheduler | 4006 | 定时任务（内部） | Docker 容器状态 |
| Content Fetcher | 4007 | 内容抓取 | `http://localhost:4007/health` |
| AI Analysis | 4008 | AI 分析 | `http://localhost:4008/health` |
| Health Monitor | 4009 | 健康监控 | `http://localhost:4009/health` |
| HTML Fetcher | 4010 | HTML 页面抓取 | `http://localhost:4010/health` |

### 数据存储
- **PostgreSQL** - 主数据库
- **Redis** - 缓存（可选）
- **Prisma** - ORM

## 📦 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- Redis（可选）

### 安装步骤

```bash
# 克隆项目
git clone <repo-url>
cd news-app

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等

# 初始化数据库
npx prisma migrate dev

# 启动开发服务器
npm run dev
```

### Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 🔧 配置说明

### 必需环境变量

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/news_app

# JWT 密钥（必须设置）
JWT_SECRET=your-super-secret-key

# AI 服务（可选）
ZHIPU_API_KEY=your-zhipu-api-key
```

### 可选环境变量

```env
# Redis 缓存
REDIS_URL=redis://localhost:6379

# 前端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 📁 项目结构

```
news-app/
├── frontend/              # Next.js 前端
│   ├── app/              # 页面路由
│   ├── components/       # 组件
│   └── lib/              # 工具函数
├── services/             # 后端微服务
│   ├── api-gateway/      # API 网关 (4000)
│   ├── news-api/         # 新闻 API (4001)
│   ├── user-api/         # 用户 API (4002)
│   ├── admin-api/        # 管理 API (4003)
│   ├── rss-fetcher/      # RSS 抓取 (4004)
│   ├── api-fetcher/      # API 抓取 (4005)
│   ├── scheduler/        # 定时任务 (4006)
│   ├── content-fetcher/  # 内容抓取 (4007)
│   ├── ai-analysis/      # AI 分析 (4008)
│   ├── health-monitor/   # 健康监控 (4009)
│   └── html-fetcher/     # HTML 抓取 (4010)
├── scripts/              # 运维脚本
│   ├── smoke-test.sh     # 部署冒烟测试
│   └── health-check.sh   # 快速健康检查
├── docs/                 # 项目文档
├── docker-compose.yml    # Docker 配置
├── docker-compose.prod.yml
└── package.json          # 根级脚本入口
```

## 🧪 测试

### Run all tests

```bash
# Run tests for a specific service
cd services/news-api && npm test
cd services/user-api && npm test

# Deployment smoke test
./scripts/smoke-test.sh

# Quick health check
./scripts/health-check.sh
```

### Root-level test scripts

```bash
# Run individual service tests
npm run test:news-api
npm run test:user-api
npm run test:admin-api
npm run test:gateway
npm run test:ai-analysis
npm run test:rss-fetcher
npm run test:api-fetcher
npm run test:html-fetcher
npm run test:content-fetcher

# Run all service tests
npm run test:all

# Deployment verification
npm run test:smoke
npm run test:health
```

### Test Coverage

Each service has its own test suite with Jest:
- **news-api**: Unit tests (utils, algorithms) + Integration tests (routes)
- **user-api**: Auth + User management tests
- **admin-api**: Admin panel route tests
- **api-gateway**: Middleware + proxy tests
- **ai-analysis**: AI client + analysis tests
- **fetchers**: RSS/API/HTML/Content parsing tests

详细测试指南请参阅 [docs/TESTING.md](docs/TESTING.md)。

## 🏥 健康监控

### Smoke Test（冒烟测试）

完整的部署验证脚本，检查所有服务健康状态和关键业务流程：

```bash
./scripts/smoke-test.sh
```

检查内容包括：
- 所有 12 个服务（含 Docker 容器）的健康状态
- API Gateway 健康端点返回有效 JSON
- 新闻列表接口正常返回数据
- 前端页面正常加载 HTML
- PostgreSQL 和 Redis 基础连接

### Quick Health Check（快速健康检查）

轻量级端口检测，输出服务状态表格：

```bash
./scripts/health-check.sh
```

## 🤖 AI 功能

### 智谱 AI 集成
项目使用智谱 AI GLM-4 模型实现以下功能：

- **AI 摘要** - 自动生成新闻摘要
- **关键词提取** - 提取新闻关键词
- **情感分析** - 分析新闻情感倾向（正面/中性/负面）
- **质量评分** - 评估新闻质量（0-100分）

### 推荐算法
- **Jaccard 相似度** - 计算关键词重叠度
- **加权评分** - 关键词 0.5 + 分类 0.3 + 来源 0.2
- **用户画像** - 基于阅读历史和收藏建立兴趣模型

## 📝 开发说明

### 添加新新闻源

1. 在管理后台添加新闻源
2. 选择类型（RSS/API）
3. 配置 URL 和参数
4. 保存后自动开始抓取

### 自定义 AI 分析

修改 `services/ai-analysis/src/lib/zhipu-client.ts` 中的提示词模板。

## 📄 License

MIT License

## 🙏 致谢

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [智谱 AI](https://www.zhipuai.cn/)
- [Tailwind CSS](https://tailwindcss.com/)
