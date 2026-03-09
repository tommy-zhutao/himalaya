# T15: Frontend 搜索功能设计方案

## �求分析

**目标：** 实现前端搜索功能，让用户可以通过关键词搜索新闻

**现有资源：**
- ✅ 后端搜索 API：`GET /api/news/search?q=xxx&page=1&limit=20`
- ✅ 后端字段：title, summary, content（支持不区分大小写搜索）
- ✅ 前端框架：Next.js 14 + TypeScript + React Query

---

## 设计方案

### 1. 组件结构

```
frontend/
├── components/
│   ├── SearchBar.tsx           # 搜索框组件（输入框 + 搜索按钮）
│   ├── SearchResults.tsx        # 搜索结果列表组件
│   └── NewsCard.tsx            # 新闻卡片（复用）
│
├── app/
│   ├── page.tsx                 # 主页（包含搜索框 + 结果展示）
│   ├── search/
│   │   └── page.tsx          # /search 路页（专用搜索页面）
│   └── api/
│       └── search/route.ts    # 搜索 API wrapper
```

### 2. 技术选型

**前端框架：**
- **Next.js 14 App Router：** 使用 App Router 实现页面路由
- **React Query：** 使用 useQuery �理数据获取和缓存
- **Debounce：** 使用 lodash.debounce 防止搜索抖动

**状态管理：**
- `useState`： 本地状态（搜索关键词、搜索历史）
- `useEffect`： 副端调用防抖

**UI 库：**
- **Tailwind CSS：** 使用 Tailwind 的 utility classes
- **lucide-react：** 使用图标（Search, X, Clock, Loader2 等）

### 3. 数据流

```
用户输入 → debounce(300ms)
  → 触发 API 请求 /api/news/search
  → 更新 UI 状态（加载中）
  → 展示搜索结果
```

### 4. 核心功能

#### 4.1 搜索框组件
- 位置：页面顶部或导航栏
- 功能：
  - 输入关键词
  - 点击搜索按钮或按 Enter 键触发搜索
  - 清空按钮（有关键词时显示）
  - 搜索历史（最近 5 个）
  - 热动建议（自动补全）

#### 4.2 搜索结果组件
- 显示搜索结果列表
- 分页支持
- 空载/错误/空状态处理
- 点击新闻查看详情

#### 4.3 搜索历史
- 本地存储搜索历史（localStorage）
- 显示最近的 5 个搜索词
- 点击历史记录可重新搜索

#### 4.4 搜索建议
- 输入 3 个字符后显示建议
- 点击建议填充搜索框

### 5. API 集成

**现有 API：** `GET /api/news/search?q=xxx&page=1&limit=20`

**参数说明：**
- `q`: 搜索关键词（必需）
- `page`: 页码（默认：1）
- `limit`: 每页显示数（默认：20）

**响应格式：**
```json
{
  "query": "OpenAI",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 6. 边界情况处理

#### 6.1 空载状态
- 显示 spinner
- 禁用搜索框

#### 6.2 错误状态
- 显示错误提示
- 提供"重试"按钮

#### 6.3 空状态
- 提示"没有找到相关新闻"
- 清晰的空状态提示

#### 6.4 搜索历史为空
- 显示"暂无搜索历史"
- 隐藏历史记录区域

---

## 实施步骤

### Step 1: 创建搜索 API wrapper

**文件：** `frontend/app/api/search/route.ts`

**功能：**
- 创建搜索 API 请求函数
- 使用 axios 调用后端 API
- 添加错误处理

**代码：**
```typescript
'use client'

import axios from 'axios'

export interface SearchResponse {
  data: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SearchParams {
  q: string
  page?: number
  limit?: number
}

export async function searchNews(params: SearchParams): Promise<SearchResponse> {
  try {
    const { q, page = 1, limit = 20 } = params
    
    const response = await axios.get('/api/news/search', { params })
    return response.data
  } catch (error: any) {
    console.error('Search error:', error)
    throw error
  }
}
```

---

### Step 2: 创建 SearchBar 组件

**文件：** `frontend/components/SearchBar.tsx`

**功能：**
- 搜索输入框
- 搜索按钮
- 清空按钮
- 搜索历史显示
- 搜索建议显示
- 防抖动处理（300ms）

**代码要点：**
- 使用 `useState` 管理本地状态
- 使用 `useEffect` 处理本地存储（搜索历史）
- 使用 `lodash.debounce` 防止搜索抖动
- 支持键盘快捷键（Enter 触发搜索，Escape 清空）

### Step 3: 创建 SearchResults 组件

**文件：** `frontend`/components/SearchResults.tsx`

**功能：**
- 显示搜索结果列表
- 分页支持
- 空载/错误/空状态处理

**代码要点：**
- 复用 NewsCard 组件展示每条新闻
- 添加"加载中"/"错误"/"空状态"提示
- 支持加载更多按钮

### Step 4: 创建 /search 专用页面

**文件：** `frontend/app/search/page.tsx`

**功能：**
- 完整的搜索页面
- 包含 SearchBar + SearchResults 组件
- 添加搜索标题和描述

### Step 5: 集成到主页

**修改：** `frontend/app/page.tsx`

**功能：**
- 在主页添加快速搜索功能
- 顶部显示搜索框
- 点击"高级搜索"跳转到 /search 页面

---

## 预计

### 预计时间
- Step 1: 创建搜索 API wrapper - 5 分钟
- Step 2: 创建 SearchBar 组件 - 15 分钟
- Step 3: 创建 SearchResults 组件 - 15 分钟
- Step 4: 创建 /search 专用页面 - 10 分钟
- Step 5: 集成到主页 - 5 分钟
- 总计：** 约 50 分钟

### 预计文件数
- 新建文件：5 个
- 修改文件：1 个

### 验收标准
- [ ] 搜索框可以输入关键词
- [ ] 点击搜索按钮触发搜索
- [ ] 按 Enter 键触发搜索
- [ ] 搜索结果正确显示
- [ ] 分页功能正常工作
- [ ] 空载/错误/空状态处理正确
- [ ] 搜索历史功能正常
- [ ] 搜索防抖有效（300ms）
- [ ] 响应式键盘操作

---

## 风险评估

### 技术风险
- **低风险：**
  - 代码相对简单
  - 使用成熟的技术栈
  - 有现成的 API 可以使用

### 潬发风险
- **无：**
  - 不影响现有功能
  - 可以独立开发和测试

### 测试风险
- **低风险：**
  - 前端 API 已经验证
  - 可以通过手动测试验证

---

## 下一步

涛哥，设计方案已完成。是否开始实施？
- 选项 A：立即开始实施 T15 搜索功能
- 选项 B：先调整设计方案
- 选项 C：暂停，等下次继续
