# API 文档

## 概述

AI News Hub 采用微服务架构，所有 API 通过 API Gateway (端口 4000) 统一对外提供服务。

## 基础信息

- **Base URL**: `http://localhost:4000/api`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

## 认证

### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "username": "user",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "user"
}
```

## 新闻 API

### 获取新闻列表
```http
GET /api/news?page=1&limit=20&category=tech&sourceId=xxx
```

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |
| category | string | 否 | 分类筛选 |
| sourceId | string | 否 | 新闻源筛选 |
| recommended | boolean | 否 | 仅推荐新闻 |

**响应**:
```json
{
  "success": true,
  "data": {
    "news": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 获取新闻详情
```http
GET /api/news/:id
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "title": "新闻标题",
    "content": "新闻内容...",
    "summary": "AI 生成的摘要",
    "keywords": ["关键词1", "关键词2"],
    "sentiment": "positive",
    "qualityScore": 85,
    "category": "tech",
    "source": {
      "id": "clx...",
      "name": "新闻源名称"
    },
    "relatedNews": [...],
    "createdAt": "2024-03-15T10:00:00Z"
  }
}
```

### 搜索新闻
```http
GET /api/news/search?q=关键词&page=1&limit=20
```

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| q | string | 是 | 搜索关键词 |
| page | number | 否 | 页码 |
| limit | number | 否 | 每页数量 |

### 获取热点话题
```http
GET /api/news/trending
```

**响应**:
```json
{
  "success": true,
  "data": {
    "topics": [
      { "keyword": "AI", "count": 150 },
      { "keyword": "GPT", "count": 120 }
    ]
  }
}
```

### 获取个性化推荐
```http
GET /api/news/recommendations
Authorization: Bearer <token>
```

## 收藏 API

### 获取收藏列表
```http
GET /api/favorites
Authorization: Bearer <token>
```

### 添加收藏
```http
POST /api/favorites
Authorization: Bearer <token>
Content-Type: application/json

{
  "newsId": "clx..."
}
```

### 删除收藏
```http
DELETE /api/favorites/:newsId
Authorization: Bearer <token>
```

## 用户 API

### 获取当前用户信息
```http
GET /api/users/me
Authorization: Bearer <token>
```

### 更新用户信息
```http
PATCH /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "新用户名",
  "avatar": "https://..."
}
```

### 修改密码
```http
POST /api/users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "旧密码",
  "newPassword": "新密码"
}
```

### 上传头像
```http
POST /api/users/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

avatar: <文件>
```

## 管理 API

> 需要 admin 角色权限

### 仪表盘统计
```http
GET /api/admin/dashboard
Authorization: Bearer <admin-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalNews": 1000,
      "totalUsers": 500,
      "totalSources": 20,
      "todayNews": 50
    },
    "recentLogs": [...]
  }
}
```

### 新闻源管理

#### 获取新闻源列表
```http
GET /api/admin/sources
Authorization: Bearer <admin-token>
```

#### 创建新闻源
```http
POST /api/admin/sources
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "新闻源名称",
  "type": "rss",
  "url": "https://...",
  "category": "tech",
  "fetchInterval": 60
}
```

#### 更新新闻源
```http
PATCH /api/admin/sources/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "新名称",
  "active": false
}
```

#### 删除新闻源
```http
DELETE /api/admin/sources/:id
Authorization: Bearer <admin-token>
```

#### 测试新闻源连接
```http
POST /api/admin/sources/:id/test
Authorization: Bearer <admin-token>
```

### 新闻管理

#### 获取所有新闻
```http
GET /api/admin/news?page=1&limit=20
Authorization: Bearer <admin-token>
```

#### 更新新闻
```http
PATCH /api/admin/news/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "featured": true
}
```

#### 删除新闻
```http
DELETE /api/admin/news/:id
Authorization: Bearer <admin-token>
```

### 用户管理

#### 获取用户列表
```http
GET /api/admin/users?page=1&limit=20
Authorization: Bearer <admin-token>
```

#### 更新用户角色
```http
PATCH /api/admin/users/:id/role
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "admin"
}
```

#### 启用/禁用用户
```http
PATCH /api/admin/users/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "active": false
}
```

### 抓取日志

#### 获取日志列表
```http
GET /api/admin/logs?page=1&limit=20&sourceId=xxx
Authorization: Bearer <admin-token>
```

## 错误响应

所有错误响应格式：
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

常见错误码：
| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| UNAUTHORIZED | 401 | 未认证或 token 过期 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 参数验证失败 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

## 速率限制

- 普通 API: 100 请求/分钟
- 管理 API: 200 请求/分钟
- 搜索 API: 30 请求/分钟
