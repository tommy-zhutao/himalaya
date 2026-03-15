# 开发指南

## 环境准备

### 必需软件
- Node.js 18+ (推荐 20 LTS)
- PostgreSQL 14+
- Redis 7+ (可选，用于缓存)
- Docker & Docker Compose (推荐)

### 推荐工具
- VS Code + ESLint + Prettier
- DBeaver 或 pgAdmin (数据库管理)
- Postman 或 Insomnia (API 测试)

## 项目设置

### 1. 克隆项目
```bash
git clone https://github.com/xxx/news-app.git
cd news-app
```

### 2. 安装依赖
```bash
# 根目录（可选的根脚本）
npm install

# 各服务独立安装
cd services/news-api && npm install && cd ../..
cd services/user-api && npm install && cd ../..
cd frontend && npm install && cd ..
# ... 其他服务
```

### 3. 配置环境变量

创建 `services/news-api/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/news_app
JWT_SECRET=your-jwt-secret-min-32-chars
ZHIPU_API_KEY=your-zhipu-api-key
```

创建 `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. 初始化数据库
```bash
# 进入 news-api 服务
cd services/news-api
npx prisma generate
npx prisma migrate dev
cd ../..
```

### 5. 启动开发服务器

**方式一：Docker Compose（推荐）**
```bash
docker-compose up -d
```

**方式二：手动启动**
```bash
# 终端 1 - News API
cd services/news-api && npm run dev

# 终端 2 - User API
cd services/user-api && npm run dev

# 终端 3 - API Gateway
cd services/api-gateway && npm run dev

# 终端 4 - Frontend
cd frontend && npm run dev

# ... 其他服务
```

## 项目结构详解

```
news-app/
├── frontend/                    # Next.js 前端
│   ├── app/                     # App Router 页面
│   │   ├── page.tsx            # 首页
│   │   ├── news/[id]/          # 新闻详情
│   │   ├── search/             # 搜索页
│   │   ├── favorites/          # 收藏页
│   │   ├── admin/              # 管理后台
│   │   └── api/                # API 路由（代理）
│   ├── components/              # React 组件
│   │   ├── NewsCard.tsx        # 新闻卡片
│   │   ├── NewsList.tsx        # 新闻列表
│   │   ├── NewsDetail.tsx      # 新闻详情
│   │   ├── SearchBox.tsx       # 搜索框
│   │   ├── CategoryFilter.tsx  # 分类筛选
│   │   ├── Recommendations.tsx # 推荐组件
│   │   └── TrendingTopics.tsx  # 热点话题
│   ├── lib/                     # 工具库
│   │   ├── api.ts              # API 客户端
│   │   ├── news.ts             # 新闻 API
│   │   ├── favorites.ts        # 收藏 API
│   │   └── stores/             # Zustand 状态
│   └── public/                  # 静态资源
│
├── services/                    # 后端微服务
│   ├── api-gateway/            # API 网关 (4000)
│   │   └── src/
│   │       ├── index.ts        # 入口
│   │       ├── proxy/          # 代理配置
│   │       └── middleware/     # 中间件
│   │
│   ├── news-api/               # 新闻服务 (4001)
│   │   └── src/
│   │       ├── index.ts        # 入口
│   │       ├── routes/         # 路由
│   │       ├── lib/            # 业务逻辑
│   │       └── prisma/         # 数据库
│   │
│   ├── user-api/               # 用户服务 (4002)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── routes/
│   │       └── lib/
│   │
│   ├── admin-api/              # 管理服务 (4003)
│   │
│   ├── rss-fetcher/            # RSS 抓取 (4004)
│   │   └── src/lib/
│   │       ├── rss-fetcher.ts  # RSS 解析
│   │       └── ai-client.ts    # AI 分析
│   │
│   ├── api-fetcher/            # API 抓取 (4005)
│   │
│   ├── auth-service/           # 认证服务 (4006)
│   │
│   ├── scheduler/              # 定时任务 (4007)
│   │   └── src/index.ts        # 调度器
│   │
│   └── ai-analysis/            # AI 分析 (4008)
│       └── src/
│           └── lib/
│               └── zhipu-client.ts
│
├── docker/                      # Docker 配置
│   └── postgres/
│       └── migrations/         # SQL 迁移
│
├── scripts/                     # 工具脚本
│   ├── batch-analyze.ts        # 批量分析
│   └── test-ai-integration.sh  # 测试脚本
│
├── docs/                        # 文档
│   ├── API.md                  # API 文档
│   ├── design.md               # 设计文档
│   └── DEVELOPMENT.md          # 本文件
│
└── docker-compose.yml          # Docker 编排
```

## 开发规范

### Git Commit 规范

使用 Conventional Commits：
```
feat(scope): 添加新功能
fix(scope): 修复 bug
docs(scope): 文档更新
style(scope): 代码格式
refactor(scope): 重构
test(scope): 测试
chore(scope): 构建/工具
```

示例：
```bash
feat(news): add AI summary generation
fix(auth): resolve token expiration issue
docs(api): update API documentation
```

### 代码风格

- **TypeScript**: 严格模式
- **ESLint**: 项目配置
- **Prettier**: 2 空格缩进

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `news-card.tsx` |
| 组件 | PascalCase | `NewsCard` |
| 函数 | camelCase | `fetchNews()` |
| 常量 | UPPER_SNAKE | `API_BASE_URL` |
| 类型/接口 | PascalCase | `NewsItem` |

### API 响应格式

统一响应格式：
```typescript
// 成功
{
  "success": true,
  "data": { ... }
}

// 失败
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## 常见任务

### 添加新的微服务

1. 创建服务目录：
```bash
mkdir -p services/new-service/src
```

2. 创建 `package.json`:
```json
{
  "name": "new-service",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

3. 在 `docker-compose.yml` 添加服务配置

4. 在 `api-gateway` 添加代理规则

### 添加新的数据库表

1. 修改 `services/news-api/prisma/schema.prisma`
2. 运行迁移：
```bash
cd services/news-api
npx prisma migrate dev --name add_new_table
```

### 添加新的前端页面

1. 创建页面文件：`frontend/app/new-page/page.tsx`
2. 如需认证，添加 layout 检查

### 调试技巧

**查看服务日志：**
```bash
# Docker
docker-compose logs -f news-api

# 直接运行
# 查看控制台输出
```

**数据库调试：**
```bash
# Prisma Studio
cd services/news-api
npx prisma studio
```

**API 测试：**
```bash
# curl 示例
curl http://localhost:4000/api/news

# 或使用 Postman/Insomnia
```

## 性能优化

### 前端
- 使用 `next/image` 优化图片
- 使用 React Query 缓存
- 代码分割（动态 import）

### 后端
- 数据库索引（查看 Prisma schema）
- Redis 缓存热点数据
- 分页查询

## 故障排除

### 端口冲突
```bash
# 查看端口占用
lsof -i :4000

# 修改 docker-compose.yml 中的端口
```

### 数据库连接失败
1. 检查 PostgreSQL 是否运行
2. 验证 DATABASE_URL 配置
3. 确认数据库已创建

### Docker 问题
```bash
# 重建容器
docker-compose down -v
docker-compose up --build
```

## 有用的命令

```bash
# 清理所有 node_modules
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# 重新安装依赖
rm -rf node_modules package-lock.json && npm install

# 查看服务健康状态
docker-compose ps

# 查看数据库数据
docker-compose exec postgres psql -U postgres -d news_app
```
