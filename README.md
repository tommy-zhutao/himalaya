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
| 服务 | 端口 | 说明 |
|------|------|------|
| API Gateway | 4000 | 统一网关 |
| News API | 4001 | 新闻 CRUD |
| User API | 4002 | 用户认证 |
| Admin API | 4003 | 管理后台 |
| RSS Fetcher | 4004 | RSS 抓取 |
| API Fetcher | 4005 | API 抓取 |
| Auth Service | 4006 | 认证服务 |
| Scheduler | 4007 | 定时任务 |
| AI Analysis | 4008 | AI 分析 |

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
├── frontend/           # Next.js 前端
│   ├── app/           # 页面路由
│   ├── components/    # 组件
│   └── lib/           # 工具函数
├── services/          # 后端微服务
│   ├── api-gateway/   # API 网关
│   ├── news-api/      # 新闻 API
│   ├── user-api/      # 用户 API
│   ├── admin-api/     # 管理 API
│   ├── rss-fetcher/   # RSS 抓取
│   ├── api-fetcher/   # API 抓取
│   ├── auth-service/  # 认证服务
│   ├── scheduler/     # 定时任务
│   └── ai-analysis/   # AI 分析
└── docker-compose.yml # Docker 配置
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
