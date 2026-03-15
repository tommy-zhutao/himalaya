# AI 智能分析功能 - 快速启动指南

## 🎯 功能概述

为 AI News Hub 添加智能化分析能力，包括：
- ✨ AI 摘要生成
- 🏷️ 关键词提取
- 😊 情感分析
- 📊 质量评分

---

## 🚀 快速开始

### 1. 数据库迁移

```bash
cd /root/.openclaw/workspace/news-app/services/news-api

# 生成迁移文件
npx prisma migrate dev --name add_ai_analysis_fields

# 应用迁移
npx prisma migrate deploy
```

### 2. 启动 AI 分析服务

```bash
cd /root/.openclaw/workspace/news-app/services/ai-analysis

# 安装依赖
npm install

# 开发模式启动
npm run dev

# 或者生产模式
npm run build
npm start
```

服务将运行在：`http://localhost:4008`

### 3. 测试服务

```bash
cd /root/.openclaw/workspace/news-app/scripts
chmod +x test-ai-analysis.sh
./test-ai-analysis.sh
```

---

## 📋 完整部署流程

### 使用 Docker Compose

```bash
cd /root/.openclaw/workspace/news-app

# 重新构建所有服务
docker-compose build

# 启动所有服务
docker-compose up -d

# 查看 AI 分析服务日志
docker-compose logs -f ai-analysis
```

---

## 🔧 API 使用示例

### 单篇文章分析

```bash
curl -X POST http://localhost:4008/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "OpenAI 发布 GPT-5",
    "content": "OpenAI 今日发布了最新的 GPT-5 模型...",
    "summary": "原始摘要"
  }'
```

响应示例：
```json
{
  "success": true,
  "data": {
    "aiSummary": "OpenAI 发布 GPT-5，推理能力提升 10 倍...",
    "keywords": ["OpenAI", "GPT-5", "AI", "推理", "模型"],
    "sentiment": "positive",
    "category": "AI/LLM",
    "qualityScore": 85
  }
}
```

### 批量分析

```bash
curl -X POST http://localhost:4008/api/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [
      { "id": 1, "title": "...", "content": "..." },
      { "id": 2, "title": "...", "content": "..." }
    ]
  }'
```

---

## 🔄 集成到新闻抓取流程

### 修改 RSS Fetcher

在 `services/rss-fetcher/src/lib/rss-fetcher.ts` 中添加：

```typescript
import axios from 'axios';

const AI_ANALYSIS_URL = process.env.AI_ANALYSIS_URL || 'http://localhost:4008';

async function analyzeNews(news: NewsItem): Promise<void> {
  try {
    const response = await axios.post(`${AI_ANALYSIS_URL}/api/analyze`, {
      title: news.title,
      content: news.content,
      summary: news.summary,
    });

    if (response.data.success) {
      // 更新数据库中的新闻记录
      await prisma.news.update({
        where: { id: news.id },
        data: {
          aiSummary: response.data.data.aiSummary,
          keywords: response.data.data.keywords,
          sentiment: response.data.data.sentiment,
          qualityScore: response.data.data.qualityScore,
          analyzedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
    // 不阻塞主流程，记录错误即可
  }
}
```

---

## 📊 前端展示

### 新闻卡片显示关键词

```tsx
// components/NewsCard.tsx
{news.keywords && news.keywords.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-2">
    {news.keywords.slice(0, 3).map((keyword, index) => (
      <span
        key={index}
        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
      >
        {keyword}
      </span>
    ))}
  </div>
)}
```

### 情感标签

```tsx
// components/SentimentBadge.tsx
function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors = {
    positive: 'bg-green-100 text-green-700',
    negative: 'bg-red-100 text-red-700',
    neutral: 'bg-gray-100 text-gray-700',
  };

  const labels = {
    positive: '😊 正面',
    negative: '😟 负面',
    neutral: '😐 中性',
  };

  return (
    <span className={`px-2 py-1 rounded ${colors[sentiment]}`}>
      {labels[sentiment]}
    </span>
  );
}
```

---

## 🎯 下一步计划

- [ ] 集成到 RSS/API Fetcher
- [ ] 前端展示优化
- [ ] 相关新闻推荐
- [ ] 用户个性化推荐

---

## ❓ 常见问题

### Q: AI 分析服务启动失败？
检查端口 4008 是否被占用：
```bash
lsof -i :4008
```

### Q: 分析结果不准确？
当前使用的是基于规则的分析，后续可以接入真实的 AI API：
- OpenAI API
- Claude API
- 本地 LLM（Ollama）

### Q: 如何提升分析质量？
可以在 `ai-analysis/src/index.ts` 中：
- 扩展关键词词典
- 改进情感分析规则
- 调整质量评分算法

---

**文档版本：** 1.0
**最后更新：** 2026-03-14
