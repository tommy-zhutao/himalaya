# AI News Hub - 详细实施计划

**项目名称：** AI News Hub
**计划日期：** 2026-03-06
**目标：** 商用产品原型
**预计总工期：** 7-10 天（单人开发）

---

## 📋 目录

1. [实施路线图](#实施路线图)
2. [Phase 2: 详细实施计划](#phase-2-详细实施计划)
3. [Phase 3: 开发优先级](#phase-3-开发优先级)
4. [技术任务清单](#技术任务清单)
5. [里程碑检查点](#里程碑检查点)
6. [风险和依赖](#风险和依赖)

---

## 实施路线图

```
Phase 1: Design & Planning     ✅  已完成 (100%)
│   ├─ 需求分析
│   ├─ 架构设计
│   └─ 数据库设计
│
Phase 2: Writing Plans         ✅  已完成 (100%)
│   ├─ 详细实施计划
│   └─ 任务分解
│
Phase 3: Implementation         ⏳  进行中 (10%)
│   ├─ 基础设施搭建 ← 当前位置
│   ├─ 后端服务开发
│   ├─ 前端开发
│   └─ 集成测试
│
Phase 4: Testing & Deployment   ⏸️  未开始 (0%)
│   ├─ 功能测试
│   ├─ 性能优化
│   └─ 生产部署
│
Phase 5: Documentation          ⏸️  未开始 (0%)
    ├─ API 文档
    └─ 部署文档
```

---

## Phase 2: 详细实施计划 ✅

### 目标
将整个项目分解为可执行的小任务，每个任务有明确的输入、输出和验收标准。

**状态：** 已完成 ✅

---

## Phase 3: 开发优先级

### 核心功能（MVP - 最小可行产品）

**高优先级（P0）- 必须完成完成）**
- ✅ 项目基础结构（已完成）
- ✅ PostgreSQL 数据库初始化（已完成）
- ✅ News API Service（新闻列表、详情）
- ✅ Frontend - 新闻列表页面
- ✅ Frontend - 新闻详情页面
- ✅ RSS Fetcher Service（定时抓取）
- ✅ Frontend - 搜索功能
- ✅ 默认新闻源配置（已有3个）

**中优先级（P1）- 完成核心体验**
- ✅ User API Service（认证系统）
- ✅ Frontend - 登录/注册页面
- ⏳ API Gateway（统一入口）
- ⏳ Redis 缓存集成

**低优先级（P2）- 增强功能**
- ⏳ Admin API Service
- ⏳ Frontend - 后台管理
- ⏳ Frontend - 用户收藏
- ⏳ News API Fetcher Service
- ⏳ Scheduler Service
- ⏳ 智能推荐

**可选优先级（P3）- 锦上添花**
- ⏳ 单元测试
- ⏳ E2E 测试
- ⏳ 性能监控
- ⏳ 日志系统完善
- ⏳ 错误告警

---

## 技术任务清单

### 🏗️ 基础设施任务

#### T01: Prisma ORM 配置 ✅
**优先级：** P0
**预计时间：** 1 小时
**前置条件：** 无

**任务描述：**
配置 Prisma 连接 PostgreSQL，生成 Client，设置类型安全。

**步骤：**
1. 安装依赖：`npm install prisma @prisma/client`
2. 初始化：`npx prisma init`
3. 配置 `schema.prisma`，映射数据库表
4. 生成 Client：`npx prisma generate`
5. 测试连接：编写简单查询脚本

**验收标准：**
- [x] Prisma 可以连接数据库
- [x] 所有表结构已定义在 schema.prisma
- [x] 可以执行简单的 CRUD 操作

**依赖服务：** PostgreSQL

**状态：** ✅ 已完成
**完成时间：** 2026-03-07

---

#### T02: 环境变量配置 ✅
**优先级：** P0
**预计时间：** 30 分钟
**前置条件：** 无

**任务描述：**
创建 `.env` 文件，定义所有环境变量，确保服务间通信。

**步骤：**
1. 复制 `.env.example` 为 `.env`
2. 填写数据库连接信息
3. 填写 JWT 密钥
4. 填写 Redis 连接信息
5. 填写服务间 URL

**验收标准：**
- [x] `.env` 文件已创建
- [x] 所有必需变量已填写
- [x] `.env` 已加入 `.gitignore`

**依赖服务：** 无

**状态：** ✅ 已完成
**完成时间：** 2026-03-07

---

### 🔧 后端服务任务

#### T03: News API Service - 基础 CRUD ✅
**优先级：** P0
**预计时间：** 3-4 小时
**前置条件：** T01, T02

**任务描述：**
实现 News API Service 的核心功能：获取新闻列表、获取详情、搜索。

**步骤：**
1. 配置 Express.js + TypeScript
2. 集成 Prisma Client
3. 实现 `GET /api/news` 接口
   - 支持分页（page, limit）
   - 支持筛选（category, source_id）
   - 支持排序（sort=latest/hot）
4. 实现 `GET /api/news/:id` 接口
   - 返回完整新闻内容
   - 增加 view_count
5. 实现 `GET /api/news/search` 接口
   - 使用 PostgreSQL 全文搜索
   - 支持分页
6. 错误处理和日志记录

**验收结果：**
- [x] 获取新闻列表正常工作
- [x] 获取新闻详情正常工作
- [x] 搜索功能正常工作
- [x] 所有接口有错误处理
- [x] 访问详情后 view_count 增加
- [x] 实现热门新闻接口 `/api/news/hot`
- [x] 实现相关新闻接口 `/api/news/related/:id`

**依赖服务：** PostgreSQL, Prisma

**API 接口：**
```typescript
GET /api/news?page=1&limit=20&category=tech&sort=latest
GET /api/news/:id
GET /api/news/search?q=AI&page=1&limit=20
GET /api/news/hot?limit=10&days=7
GET /api/news/related/:id?limit=5
```

**状态：** ✅ 已完成
**完成时间：** 2026-03-07

---

#### T04: User API Service - 认证系统 ✅
**优先级：** P1
**预计时间：** 4-5 小时
**前置条件：** T01, T02

**任务描述：**
实现用户注册、登录、Token 刷新、用户信息管理。

**步骤：**
1. 安装依赖：`bcrypt, jsonwebtoken`
2. 实现密码加密（bcrypt）
3. 实现 JWT 生成和验证
4. 实现 `POST /api/auth/register` 接口
   - 邮箱唯一性检查
   - 密码加密存储
5. 实现 `POST /api/auth/login` 接口
   - 验证用户名密码
   - 生成 JWT Token
6. 实现 `POST /api/auth/refresh` 接口
   - 验证 Refresh Token
   - 生成新的 Access Token
7. 实现认证中间件
8. 实现 `GET /api/users/me` 接口（需要认证）

**验收标准：**
- [x] 用户注册成功
- [x] 用户登录成功，返回 Token
- [x] Token 刷新正常工作
- [x] 受保护接口需要认证
- [x] 无效 Token 返回 401

**依赖服务：** PostgreSQL, Prisma

**状态：** ✅ 已完成
**完成时间：** 2026-03-09

---

#### T05: User API Service - 收藏功能
**优先级：** P2
**预计时间：** 2-3 小时
**前置条件：** T04

**任务描述：**
实现用户收藏新闻的功能。

**步骤：**
1. 实现 `GET /api/users/favorites` 接
   - 支持分页
2. 实现 `POST /api/users/favorites/:id` 接口
   - 检查是否已收藏
   - 添加收藏记录
3. 实现 `DELETE /api/users/favorites/:id` 接口

**验收标准：**
- [ ] 可以获取收藏列表
- [ ] 可以添加收藏（（重复收藏不会报错）
- [ ] 可以删除收藏
- [ ] 收藏列表正确关联新闻数据

**依赖服务：** PostgreSQL, Prisma

**API 接口：**
```typescript
GET /api/users/favorites?page=1&limit=20
POST /api/users/favorites/:id
DELETE /api/users/favorites/:id
```

---

#### T06: Admin API Service - 基础功能
**优先级：** P2
**预计时间：** 3-4 小时
**前置条件：** T01, T02

**任务描述：**
实现后台管理的新闻源管理、日志查看、统计功能。

**步骤：**
1. 实现管理员权限中间件（role='admin'）
2. 实现 `GET /api/admin/sources` 接口（列出所有新闻源）
3. 实现 `POST /api/admin/sources` 接口（创建新闻源）
4. 实现 `PUT /api/admin/sources/:id` 接口（更新新闻源）
5. 实现 `DELETE /api/admin/sources/:id` 接口（删除新闻源）
6. 实现 `GET /api/admin/logs` 接口（抓取日志）
7. 实现 `GET /api/admin/stats` 接口（系统统计）

**验收标准：**
- [ ] 只有管理员可以访问
- [ ] 新闻源 CRUD 正常工作
- [ ] 可以查看抓取日志
- [ ] 可以查看系统统计

**依赖服务：** PostgreSQL, Prisma

**API 接口：**
```typescript
GET /api/admin/sources
POST /api/admin/sources
  Body: { name, type, url, category, enabled }
PUT /api/admin/sources/:id
  Body: { name, type, url, category, enabled }
DELETE /api/admin/sources/:id
GET /api/admin/logs?page=1&limit=20
GET /api/admin/stats
```

---

#### T07: RSS Fetcher Service
**优先级：** P0
**预计时间：** 3-4 小时
**前置条件：** T01, T02

**任务描述：**
实现 RSS 源定时抓取、解析、去重、存储功能。

**步骤：**
1. 安装依赖：`rss-parser, node-cron`
2. 实现单次抓取函数
   - 获取所有启用的 RSS 源
   - 解析 RSS 内容
   - 数据去重（检查 URL 是否已存在）
   - 存储到数据库
   - 记录抓取日志
3. 实现定时任务（node-cron）
   - 默认每 15 分钟执行一次
4. 实现手动触发接口（可选）

**验收标准：**
- [ ] 可以成功抓取 RSS 源
- [ ] 重复的新闻不会重复插入
- [ ] 抓取日志正确记录
- [ ] 定时任务正常运行
- [ ] 错误处理完善（单个源失败不影响其他源）

**依赖服务：** PostgreSQL, Prisma, News API

**配置：**
```typescript
CRON_SCHEDULE: "*/15 * * * *"  // 每 15 分钟
```

---

#### T08: API Gateway
**优先级：** P1
**预计时间：** 2-3 小时
**前置条件：** T03, T04

**任务描述：**
实现统一 API 入口，负责路由分发、认证、限流。

**步骤：**
1. 配置 Next.js API Routes
2. 实现路由分发
   - `/api/news/*` → News API (4001)
   - `/api`/users/*` → User API (4002)
   - `/api/admin/*` → Admin API (4003)
   - `/api/auth/*` → User API (4002)
3. 实现 CORS 中间件
4. 实现认证中间件（从 User API 移过来）
5. 实现请求限流（Redis）
6. 实现统一错误处理
7. 实现请求日志

**验收标准：**
- [ ] 所有所有请求通过 Gateway
- [ ] 路由正确分发
- [ ] CORS 配置正确
- [ ] 认证正常工作
- [ ] 限流正常工作（可选）
- [ ] 错误统一处理

**依赖服务：** Redis, News API, User API, Admin API

**配置：**
```typescript
NEWS_API_URL: http://news-api:4001
USER_API_URL: http://user-api:4002
ADMIN_API_URL: http://admin-api:4003
REDIS_URL: redis://redis:6379
```

---

#### T09: Redis 缓存集成
**优先级：** P1
**预计时间：** 2-3 小时
**前置条件：** T08

**任务描述：**
在 News API 和 User API 中集成 Redis 缓存，提高性能。

**步骤：**
1. 安装依赖：`ioredis`
2. 在 News API 中实现缓存
   - 新闻列表缓存（TTL: 5 分钟）
   - 新闻详情缓存（TTL: 10 分钟）
   - 搜索结果缓存（TTL: 2 分钟）
3. 实现缓存失效策略
   - 新新闻添加时清除列表缓存
   - 新闻更新时清除详情缓存

**验收标准：**
- [ ] Redis 缓存正常工作
- [ ] 缓存命中率 > 50%
- [ ] 缓存失效策略正确

**依赖服务：** Redis

---

#### T10: Scheduler Service (可选)
**优先级：** P2
**预计时间：** 2-3 小时
**前置条件：** T07

**任务描述：**
实现任务调度服务，使用 Bull 管理任务队列。

**步骤：**
1. 安装依赖：`bull, ioredis`
2. 创建任务队列
3. 实现任务调度
   - RSS 抓取任务
   - API 抓取任务
4. 实现失败重试机制

**验收标准：**
- [ ] 任务队列正常工作
- [ ] 失败任务自动重试
- [ ] 可以查看任务状态

**依赖服务：** Redis, RSS Fetcher, API Fetcher

---

### 🎨 前端开发任务

#### T11: Frontend - 项目初始化
**优先级：** P0
**预计时间：** 1 小时
**前置条件：** 无

**任务描述：**
初始化 Next.js 项目，配置 TypeScript、Tailwind CSS、shadcn/ui。

**步骤：**
1. 创建 Next.js 项目：`npx create-next-app@latest`
2. 配置 TypeScript
3. 安装 Tailwind CSS
4. (安装 shadcn/ui
5. 安装依赖：`@tanstack/react-query, zustand, axios`
6. 配置环境变量

**验收标准：**
- [ ] Next.js 项目正常运行
- [ ] Tailwind CSS 正常工作
- [ ] shadcn/ui 组件可用
- [ ] React Query 配置完成

---

#### T12: Frontend - 布局和导航
**优先级：** P0
****预计时间：** 2-3 小时
**前置条件：** T11

**任务描述：**
创建应用的布局结构、导航栏、响应式设计。

**步骤：**
1. 创建 Header 组件（Logo、搜索框、用户菜单）
2. 创建 Footer 组件
3. 创建 Layout 组件
4. 实现响应式导航（移动端汉堡菜单）
5. 配置全局样式

**验收标准：**
- [ ] 布局正确显示
- [ ] 导航栏正常工作
- [ ] 移动端响应式正常

---

#### T13: Frontend - 新闻列表页面
**优先级：** P0
**预计时间：** 3-4 小时
**前置条件：** T11, T12, T03

**任务描述：**
实现新闻列表页面，支持分页、筛选、排序。

**步骤：**
1. 创建 NewsCard 组件
   - 标题、摘要、来源、时间、标签
   - 图片展示
   - hover 效果
2. 创建 NewsList 组件
   - 调用 `/api/news` 接口
   - 分页加载
   - 移动端无限滚动
3. 实现分类筛选
4. 实现排序（最新/最热）
5. 加载状态和错误处理

**验收标准：**
- [ ] 新闻列表正确显示
- [ ] 分页正常工作
- [ ] 分类筛选正常工作
- [ ] 排序正常工作
- [ ] 加载状态和错误处理完善

**API 接口：**
```typescript
GET /api/news?page=1&limit=20&category=tech&sort=latest
```

---

#### T14: Frontend - 新闻详情页面
**优先级：** P0
**预计时间：** 2-3 小时
**前置条件：** T11, T12, T03

**任务描述：**
实现新闻详情页面，显示完整内容、相关推荐。

**步骤：**
1. 创建 NewsDetail 组件
   - 调用 `/api/news/:id` 接口
   - 显示标题、作者、时间、来源
   - 显示正文内容
   - 显示图片
   - 分享按钮
2. 实现相关推荐
   - 调用 `/api/news/related/:id` 接口
   - 显示相关新闻列表
3. 实现收藏功能（如果已登录）

**验收标准：**
- [ ] 新闻详情正确显示
- [ ] 相关推荐正常显示
- [ ] 收藏功能正常工作
- [ ] 分享功能正常工作

**API 接口：**
```typescript
GET /api/news/:id
GET /api/news/related/:id
```

---

#### T15: Frontend - 搜索页面
**优先级：** P1
**预计时间：** 2-3 小时
**前置条件：** T11, T12, T03

**任务描述：**
实现搜索页面，支持实时搜索建议、搜索历史。

**步骤：**
1. 创建 SearchBox 组件
   - 实时搜索建议（可选）
   - 搜索历史
2. 创建 SearchResults 组件
   - 调用 `/api/news/search` 接口
   - 显示搜索结果
3. 实现搜索历史存储（localStorage）

**验收标准：**
- [ ] 搜索功能正常工作
- [ ] 搜索结果正确显示
- [ ] 搜索历史正常工作

**API 接口：**
```typescript
GET /api/news/search?q=AI&page=1&limit=20
```

---

#### T16: Frontend - 登录/注册页面 ✅
**优先级：** P1
**预计时间：** 2-3 小时
**前置条件：** T11, T12, T04

**任务描述：**
实现登录和注册页面，表单验证、错误处理。

**步骤：**
1. 创建 Login 组件
   - 邮箱、密码输入框
   - 表单验证
   - 调用 `/api/auth/login` 接口
   - Token 存储（localStorage）
   - 跳转到首页
2. 创建 Register 组件
   - 邮箱、用户名、密码输入框
   - 表单验证
   - 调用 `/api/auth/register` 接口
3. 创建 AuthContext/Zustand store
   - 管理用户状态
   - 管理登录状态

**验收标准：**
- [x] 登录功能正常工作
- [x] 注册功能正常工作
- [x] 表单验证正常工作
- [x] Token 正确存储
- [x] 用户状态正确管理

**状态：** ✅ 已完成
**完成时间：** 2026-03-09

---

#### T17: Frontend - 用户中心
**优先级：** P2
**预计时间：** 2-3 小时
**前置条件：** T16, T05

**任务描述：**
实现用户中心页面，显示用户信息、收藏列表。

**步骤：**
1. 创建 UserProfile 组件
   - 显示用户信息
   - 编辑用户信息
2. 创建 UserFavorites 组件
   - 调用 `/api/users/f/favorites` 接口
   - 显示收藏列表
3. 实现收藏/取消收藏功能

**验收标准：**
- [ ] 用户信息正确显示
- [ ] 可以编辑用户信息
- [ ] 收藏列表正确显示
- [ ] 收藏功能正常工作

**API 接口：**
```typescript
GET /api/users/me
PUT /api/users/me
GET /api/users/favorites
POST /api/users/favorites/:id
DELETE /api/users/favorites/:id
```

---

#### T18: Frontend - 后台管理
**优先级：** P2
**预计时间：** 4-5 小时
**前置条件：** T16, T06

**任务描述：**
实现后台管理页面，管理新闻源、查看日志、查看统计。

**步骤：**
1. 创建 AdminLayout 组件
   - 侧边栏导航
   - 权限检查（只允许 admin）
2. 创建 AdminSources 组件
   - 列出所有新闻源
   - 创建/编辑/删除新闻源
3. 创建 AdminLogs 组件
   - 显示抓取日志
   - 日志筛选
4. 创建 AdminDashboard 组件
   - 显示系统统计
   - 显示图表（可选）

**验收标准：**
- [ ] 只有管理员可以访问
- [ ] 新闻源管理正常工作
- [ ] 抓取日志正确显示
- [ ] 系统统计正确显示

**API 接口：**
```typescript
GET /api/admin/sources
POST /api/admin/sources
PUT /api/admin/sources/:id
DELETE /api/admin/sources/:id
GET /api/admin/logs
GET /api/admin/stats
```

---

### 🧪 测试任务

#### T19: 集成测试
**优先级：** P3
**预计时间：** 3-4 小时
**前置条件：** 所有核心功能完成

**任务描述：**
编写端到端测试，确保核心功能正常工作。

**步骤：**
1. 安装依赖：`@playwright/test`
2. 编写测试用例
   - 测试新闻列表
   - 测试新闻详情
   - 测试搜索
   - 测试登录/注册
3. 配置 CI/CD 运行测试

**验收标准：**
- [ ] 所有测试通过
- [ ] 测试覆盖核心功能

---

#### T20: 性能优化
**优先级：** P3
**预计时间：** 2-3 小时
**前置条件：** T09

**任务描述：**
优化应用性能，提升用户体验。

**步骤：**
1. 前端优化
   - 图片懒加载
   - 代码分割
   - 水合优化
2. 后端优化
   - 数据库查询优化
   - 缓存优化
   - 并发限制

**验收标准：**
- [ ] 首屏加载时间 < 2 秒
- [ ] API 响应时间 < 500 ms
- [ ] Lighthouse 评分 > 80

---

## 里程碑检查点

### Milestone 1: MVP 可用
**时间：** Day 4
**验收标准：**
- [x] Phase 1 完成
- [x] PostgreSQL 正常运行
- [x] News API 可以返回新闻
- [ ] RSS Fetcher 可以抓取新闻
- [ ] Frontend 可以显示新闻列表
- [ ] Frontend 可以显示新闻详情

**演示功能：**
1. 打开前端，看到新闻列表
2. 点击新闻，看到详情
3. 刷新页面，看到新新闻（RSS 已抓取）

---

### Milestone 2: 核心功能完整
**时间：** Day 6
**验收标准：**
- [x] 所有 P0 任务完成
- [ ] 所有 P1 任务完成（2/4 已完成）
- [x] 搜索功能正常工作
- [x] 用户系统正常工作
- [ ] API Gateway 正常工作

**演示功能：**
1. ✅ 用户注册/登录
2. ✅ 搜索新闻
3. ⏳ 用户收藏新闻
4. ⏳ 查看收藏列表

---

### Milestone 3: 功能完整
**时间：** Day 8
**验收标准：**
- [ ] 所有 P0, P1, P2 任务完成
- [ ] 后台管理正常工作
- [ ] 所有功能测试通过

**演示功能：**
1. 管理员登录后台
2. 添加新闻源
3. 查看抓取日志
4. 查看系统统计

---

### Milestone 4: 生产就绪
**时间：** Day 10
**验收标准：**
- [ ] 所有 P3 任务完成（可选）
- [ ] 部署文档完成
- [ ] API 文档完成
- [ ] 性能测试通过

---

## 风险和依赖

### 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|:--------:|
| RSS 源不稳定 | 中 | 中 | 实现重试机制，监控错误率 |
| API 源限流 | 低 | 中 | 实现请求限流，使用多个源 |
| 数据库性能 | 低 | 高 | 使用索引，优化查询，Redis 缓存 |
| 任务调度失败 | 中 | 中 | 实现失败重试，日志记录 |
| 前端性能 | 低 | 中 | 代码分割，图片懒加载，缓存 |

### 外部依赖

| 依赖 | 用途 | 可替换 |
|------|------|--------|
| PostgreSQL | 主数据库 | MySQL（需要重写 ORM）|
| Redis | 缓存 + 任务队列 | Memcached（仅缓存）|
| Node.js | 运行时 | 无 |
| Docker | 容器化 | 无 |

### 数据依赖

| 数据 | 来源 | 可用性 |
|------|------|--------|
| 新闻数据 | RSS 源 | 依赖第三方源 |
| 用户数据 | 用户注册 | 初始无数据 |
| 统计数据 | 日志分析 | 依赖运行数据 |

---

## 时间估算

### Phase 2: Writing Plans ✅
- **预计时间：** 1 小时
- **实际时间：** 已完成
- **状态：** ✅ 已完成

### Phase 3: Implementation ⏳
- **预计时间：** 6-7 天
- **进度：** 45% (已完成 T01-T03, T07, T13-T16, T04)
- **状态：** 进行中

**分解：**
- [x] Day 1: T01, T02, T03（基础设施 + News API）
- [x] Day 2: T13, T14（前端新闻列表 + 详情）
- [x] Day 3: T07, T15（RSS Fetcher + 搜索）
- [x] Day 4: **Milestone 1** - MVP 可用 ✅
- [x] Day 5: T04, T16（User API + 登录注册） ← **当前位置**
- Day 6: T08, T09（API Gateway + Redis 缓存）- **Milestone 2**
- Day 7: T05, T06, T17, T18（其他服务 + 用户中心 + 后台管理）
- Day 8: **Milestone 3** - 功能完整

### Phase 4: Testing & Deployment ⏸️
- **预计时间：** 1-2 天
- **状态：** 未开始

### Phase 5: Documentation ⏸️
- **预计时间：** 1 天
- **状态：** 未开始

**总计：** 7-10 天

---

## 下一步行动

**当前任务：** T16 Frontend - 登录/注册页面 ✅ 已完成

**下一步：**
1. ✅ T16 已完成
2. ⏳ 开始 T08: API Gateway（统一入口）
3. ⏳ 或开始 T09: Redis 缓存集成

**问题：**
涛哥，下一步想做哪个任务？
- 选项 A: 实现 API Gateway（统一入口）
- 选项 B: 实现 Redis 缓存集成
- 选项 C: 其他任务

---

**文档版本：** 1.1
**最后更新：** 2026-03-07
**作者：** 旺财 🐕
