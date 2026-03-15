# AI News Hub - 智能化功能增强计划

**日期：** 2026-03-14
**目标：** 为新闻聚合平台添加 AI 智能分析能力

---

## 🎯 功能清单

### Phase 1: 基础 AI 分析（当前）

#### 1.1 数据库扩展
- [x] 添加 AI 分析字段到 News 表
  - `aiSummary` - AI 生成的摘要
  - `keywords` - 提取的关键词（数组）
  - `sentiment` - 情感分析（positive/negative/neutral）
  - `qualityScore` - 质量评分（0-100）
  - `analyzedAt` - 分析时间戳

#### 1.2 AI 分析服务
- [x] 创建独立微服务 `ai-analysis-service`
  - 端口：4007
  - 单篇文章分析 API
  - 批量分析 API
  - 健康检查

#### 1.3 集成到抓取流程
- [ ] 修改 RSS Fetcher，在抓取后自动调用 AI 分析
- [ ] 修改 API Fetcher，在抓取后自动调用 AI 分析
- [ ] 添加分析失败重试机制

---

### Phase 2: 高级 AI 功能

#### 2.1 内容理解
- [ ] **相关新闻推荐** - 基于内容相似度
- [ ] **话题聚类** - 自动归类相似话题
- [ ] **重复检测** - 智能去重相似新闻

#### 2.2 用户个性化
- [ ] **兴趣画像** - 基于用户阅读历史建立画像
- [ ] **智能推荐** - 个性化推荐新闻
- [ ] **阅读预测** - 预测用户可能感兴趣的内容

---

### Phase 3: 前端展示优化 ✅ 已完成（2026-03-14）

#### 3.1 AI 功能展示
- [x] 新闻卡片显示 AI 关键词（最多3个，紫色渐变标签）
- [x] 详情页显示 AI 摘要（渐变紫色背景区块）
- [x] 情感标签（正面/中性/负面）
- [x] 质量评分徽章

#### 3.2 智能筛选
- [ ] 按情感筛选新闻
- [ ] 按质量评分排序
- [ ] 关键词云图

---

## 🛠️ 技术实现

### AI 分析服务架构

```
┌─────────────────┐
│   RSS Fetcher   │
└────────┬────────┘
         │ 抓取新闻
         ↓
┌─────────────────┐
│   AI Analysis   │
│    Service      │
│   (Port 4007)   │
└────────┬────────┘
         │ 分析结果
         ↓
┌─────────────────┐
│   PostgreSQL    │
│   (news table)  │
└─────────────────┘
```

### API 设计

#### POST /api/analyze
单篇文章分析

```json
{
  "title": "新闻标题",
  "content": "新闻内容",
  "summary": "原始摘要"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "aiSummary": "AI 生成的摘要...",
    "keywords": ["AI", "大模型", "创业"],
    "sentiment": "positive",
    "category": "AI/LLM",
    "qualityScore": 85
  }
}
```

#### POST /api/analyze/batch
批量分析

```json
{
  "articles": [
    { "id": 1, "title": "...", "content": "..." },
    { "id": 2, "title": "...", "content": "..." }
  ]
}
```

---

## 📊 数据库迁移

### 添加新字段

```sql
ALTER TABLE news ADD COLUMN ai_summary TEXT;
ALTER TABLE news ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE news ADD COLUMN sentiment VARCHAR(20);
ALTER TABLE news ADD COLUMN quality_score INTEGER;
ALTER TABLE news ADD COLUMN analyzed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_news_sentiment ON news(sentiment);
CREATE INDEX idx_news_quality_score ON news(quality_score DESC);
```

---

## 🚀 部署步骤

### 1. 数据库迁移
```bash
cd services/news-api
npx prisma migrate dev --name add_ai_analysis_fields
```

### 2. 启动 AI 分析服务
```bash
cd services/ai-analysis
npm install
npm run dev
```

### 3. 更新 docker-compose.yml
添加 ai-analysis 服务到编排文件

### 4. 修改 Fetcher 服务
集成 AI 分析调用

---

## 📈 性能考虑

### 缓存策略
- AI 分析结果缓存到 Redis
- 相同内容不重复分析
- 分析结果持久化到数据库

### 异步处理
- 批量分析使用任务队列（Bull）
- 不阻塞新闻抓取主流程
- 失败自动重试

---

## 🎨 前端集成

### 新闻卡片增强

```tsx
<NewsCard>
  <Keywords>{news.keywords.map(k => <Tag>{k}</Tag>)}</Keywords>
  <SentimentBadge sentiment={news.sentiment} />
  <QualityScore score={news.qualityScore} />
</NewsCard>
```

### 详情页优化

```tsx
<NewsDetail>
  <AISummary>{news.aiSummary}</AISummary>
  <KeywordsCloud keywords={news.keywords} />
  <RelatedNews newsId={news.id} />
</NewsDetail>
```

---

## 📝 待办事项

- [ ] 完成数据库迁移
- [ ] 测试 AI 分析服务
- [ ] 集成到 Fetcher
- [ ] 前端展示优化
- [ ] 性能测试
- [ ] 文档更新

---

**状态：** 进行中
**预计完成：** 2026-03-14
