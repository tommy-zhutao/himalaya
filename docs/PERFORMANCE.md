# 性能优化指南

## 已实施的优化

### 1. 数据库索引

News 表已建立以下索引：
- `publishedAt` - 按时间排序查询
- `category` - 分类筛选
- `sourceId` - 来源筛选
- `viewCount` - 热门排序
- `tags` - Gin 索引（JSON 数组查询）
- `sentiment` - 情感筛选
- `qualityScore` - 质量评分排序

### 2. Redis 缓存

已实现的缓存策略：
- 新闻列表：5 分钟 TTL
- 新闻详情：10 分钟 TTL
- 搜索结果：2 分钟 TTL
- 热门新闻：5 分钟 TTL
- 相关推荐：5 分钟 TTL
- 热点话题：5 分钟 TTL

### 3. API 限流

- 默认：100 请求/分钟/IP
- 基于 Redis 的滑动窗口

## 可优化项

### 1. 数据库查询优化

```sql
-- 使用 EXPLAIN ANALYZE 分析慢查询
EXPLAIN ANALYZE SELECT * FROM news WHERE category = 'tech' ORDER BY published_at DESC LIMIT 20;

-- 复合索引优化（如果需要）
CREATE INDEX idx_news_category_published ON news(category, published_at DESC);
```

### 2. N+1 查询优化

使用 Prisma 的 include 预加载关联数据，避免 N+1：
```typescript
// 好
prisma.news.findMany({
  include: { source: true }
});

// 避免
for (const news of newsList) {
  const source = await prisma.source.findUnique(...);
}
```

### 3. 分页优化

对于大数据集，使用游标分页替代 OFFSET：
```typescript
// 传统分页（大数据集性能差）
prisma.news.findMany({
  skip: (page - 1) * limit,
  take: limit,
});

// 游标分页（推荐）
prisma.news.findMany({
  cursor: { id: lastId },
  take: limit,
});
```

### 4. 批量操作

批量插入/更新优于循环单条操作：
```typescript
// 好
prisma.news.createMany({ data: newsList });

// 避免
for (const news of newsList) {
  await prisma.news.create({ data: news });
}
```

### 5. 连接池优化

Prisma 默认连接池配置：
```
DATABASE_URL="postgresql://...?connection_limit=10"
```

### 6. 前端优化

- Next.js 图片优化：使用 `next/image`
- 代码分割：动态 import
- React Query 缓存：设置 staleTime

### 7. 压缩响应

在 API Gateway 添加 gzip 压缩：
```typescript
import compression from 'compression';
app.use(compression());
```

## 监控指标

### 关键指标

| 指标 | 目标 | 告警阈值 |
|------|------|----------|
| API 响应时间 | < 200ms | > 500ms |
| 数据库查询 | < 50ms | > 200ms |
| 缓存命中率 | > 80% | < 50% |
| 错误率 | < 0.1% | > 1% |

### 监控工具

- PostgreSQL: `pg_stat_statements`
- Redis: `INFO` 命令
- Node.js: ` clinic` 或 `autocannon`

## 压力测试

### 使用 autocannon

```bash
# 安装
npm install -g autocannon

# 测试新闻列表 API
autocannon -c 100 -d 30 http://localhost:4000/api/news

# 测试搜索 API
autocannon -c 50 -d 30 "http://localhost:4000/api/news/search?q=AI"
```

### 使用 k6

```javascript
// k6 script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  const res = http.get('http://localhost:4000/api/news');
  check(res, { 'status was 200': r => r.status == 200 });
  sleep(1);
}
```

## 性能排查清单

- [ ] 检查慢查询日志
- [ ] 分析 EXPLAIN 输出
- [ ] 验证缓存命中率
- [ ] 检查内存使用
- [ ] 监控连接池状态
- [ ] 检查 N+1 查询
- [ ] 验证索引使用
