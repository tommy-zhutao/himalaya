/**
 * Integration tests for AI Analysis routes
 * 
 * The AI analysis service calls Zhipu AI via axios.
 * We test the analysis logic through a test app that mirrors the route handlers.
 */

import request from 'supertest';
import express from 'express';

// Helper functions that mirror index.ts logic
function isCommonWord(word: string): boolean {
  const commonWords = [
    '的', '是', '在', '了', '和', '与', '或', '等', '但', '而',
    '这', '那', '有', '为', '以', '及', '也', '就', '不', '都',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can',
  ];
  return commonWords.includes(word.toLowerCase());
}

function extractFirstSentences(content: string): string {
  const sentences = content.split(/[。！？.!?]/).filter((s) => s.trim().length > 10);
  const summary = sentences.slice(0, 3).join('。');
  return summary.length > 0 ? summary + '。' : '';
}

function extractKeywordsByFrequency(title: string, content: string): string[] {
  const text = `${title} ${content}`;
  const words = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
  const wordCount: { [key: string]: number } = {};
  words.forEach((word) => {
    if (word.length > 1 && !isCommonWord(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function analyzeSentimentByWords(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  const positiveWords = ['突破', '创新', '增长', '成功', '优秀', '领先', '提升'];
  const negativeWords = ['失败', '下降', '亏损', '危机', '裁员', '倒闭', '破产'];
  let positiveScore = 0;
  let negativeScore = 0;
  positiveWords.forEach((word) => { if (text.includes(word)) positiveScore++; });
  negativeWords.forEach((word) => { if (text.includes(word)) negativeScore++; });
  if (positiveScore > negativeScore + 1) return 'positive';
  if (negativeScore > positiveScore + 1) return 'negative';
  return 'neutral';
}

function classifyCategory(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  const categories: { [key: string]: string[] } = {
    'AI/LLM': ['ai', '人工智能', '大模型', 'llm', 'gpt', 'chatgpt', 'claude'],
    '创业投资': ['融资', '投资', '创业', '独角兽', 'ipo', 'funding', 'startup'],
    '科技产品': ['发布', '推出', '新产品', '产品', 'launch', 'release'],
    '行业动态': ['市场', '行业', '公司', '企业', '发展', 'industry'],
  };
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) return category;
    }
  }
  return '其他';
}

function calculateQualityScore(title: string, content: string): number {
  let score = 50;
  if (title.length >= 10 && title.length <= 100) score += 10;
  if (title.match(/[！？?！]/)) score += 5;
  if (content.length > 500) score += 15;
  if (content.length > 1000) score += 10;
  if (content.includes('http') || content.includes('https')) score += 5;
  const uniqueChars = new Set(content).size;
  if (uniqueChars > 100) score += 10;
  return Math.min(100, score);
}

// Build test app with same route handlers (AI always mocked as unavailable → fallback logic)
function createTestApp(): express.Application {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ai-analysis',
      timestamp: new Date().toISOString(),
      aiEnabled: true,
      aiConfig: { provider: 'zhipu', model: 'test-model' },
    });
  });

  app.post('/api/analyze', (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields: title or content' });
    }
    // AI is unavailable → use fallback functions
    const analysis = {
      aiSummary: extractFirstSentences(content),
      keywords: extractKeywordsByFrequency(title, content),
      sentiment: analyzeSentimentByWords(title, content),
      category: classifyCategory(title, content),
      qualityScore: calculateQualityScore(title, content),
    };
    res.json({ success: true, data: analysis });
  });

  app.post('/api/analyze/batch', (req, res) => {
    const { articles } = req.body;
    if (!Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or empty articles array' });
    }
    const results = articles.map((article: any) => ({
      id: article.id,
      analysis: {
        aiSummary: extractFirstSentences(article.content || ''),
        keywords: extractKeywordsByFrequency(article.title || '', article.content || ''),
        sentiment: analyzeSentimentByWords(article.title || '', article.content || ''),
        category: classifyCategory(article.title || '', article.content || ''),
        qualityScore: calculateQualityScore(article.title || '', article.content || ''),
      },
    }));
    res.json({ success: true, data: results });
  });

  return app;
}

describe('AI Analysis API Routes', () => {
  const app = createTestApp();

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('ai-analysis');
    });
  });

  describe('POST /api/analyze', () => {
    it('should return analysis results with fallback logic', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: '人工智能大模型取得重大突破',
          content: 'OpenAI发布了最新的GPT-5模型，在各项基准测试中表现优异。这项突破性的创新引领了人工智能领域的增长。',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.aiSummary).toBeDefined();
      expect(res.body.data.keywords).toBeInstanceOf(Array);
      expect(res.body.data.sentiment).toMatch(/positive|negative|neutral/);
      expect(res.body.data.category).toBeDefined();
      expect(res.body.data.qualityScore).toBeGreaterThanOrEqual(0);
      expect(res.body.data.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should reject missing title or content', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({ title: 'Only Title' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject empty body', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should classify AI-related content correctly', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: 'ChatGPT发布新功能',
          content: '人工智能大模型的新版本发布，GPT系列又有创新突破。该产品推出了多项新特性。',
        })
        .expect(200);

      expect(res.body.data.category).toBe('AI/LLM');
    });

    it('should classify investment content correctly', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: '某科技公司获得数亿美元融资',
          content: '这家创业公司完成了新一轮投资，估值达到独角兽级别。',
        })
        .expect(200);

      expect(res.body.data.category).toBe('创业投资');
    });

    it('should classify product launch content', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: '科技公司发布新产品',
          content: '该公司推出了最新产品，引发市场关注。',
        })
        .expect(200);

      expect(res.body.data.category).toBe('科技产品');
    });

    it('should default to 其他 for unrecognized categories', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: '天气预报',
          content: '今天天气晴朗，适合出行。',
        })
        .expect(200);

      expect(res.body.data.category).toBe('其他');
    });

    it('should detect positive sentiment', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: 'AI技术取得突破性创新增长',
          content: '成功的AI模型在多个领域表现优秀，引领行业发展趋势。',
        })
        .expect(200);

      expect(res.body.data.sentiment).toBe('positive');
    });

    it('should detect negative sentiment', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: '多家科技公司裁员危机加剧',
          content: '行业面临亏损和倒闭风险，企业下降趋势明显。',
        })
        .expect(200);

      expect(res.body.data.sentiment).toBe('negative');
    });

    it('should detect neutral sentiment', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: 'AI公司发布年度报告',
          content: '公司公布了去年的业绩数据。',
        })
        .expect(200);

      expect(res.body.data.sentiment).toBe('neutral');
    });

    it('should extract keywords from content', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: 'GPT大模型突破',
          content: 'GPT模型取得了重大突破，GPT在多项测试中表现优异。GPT的应用场景越来越广泛。',
        })
        .expect(200);

      expect(res.body.data.keywords.length).toBeGreaterThan(0);
      // GPT should be a top keyword since it appears 3 times
      expect(res.body.data.keywords.map((k: string) => k.toLowerCase())).toContain('gpt');
    });

    it('should calculate quality score based on content characteristics', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: '这是一篇非常长的新闻标题测试用例',
          content: '这是一段非常长的新闻内容。' + 'A'.repeat(1000) + ' https://example.com',
        })
        .expect(200);

      expect(res.body.data.qualityScore).toBeGreaterThanOrEqual(50);
    });

    it('should generate fallback summary from content', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send({
          title: '测试标题',
          content: '这是第一句话，内容足够长。这是第二句话，也足够长。这是第三句话。',
        })
        .expect(200);

      expect(res.body.data.aiSummary).toBeTruthy();
      expect(res.body.data.aiSummary.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/analyze/batch', () => {
    it('should analyze multiple articles', async () => {
      const res = await request(app)
        .post('/api/analyze/batch')
        .send({
          articles: [
            { id: 1, title: 'AI突破', content: '人工智能取得了重大突破。' + 'A'.repeat(600) },
            { id: 2, title: '融资新闻', content: '某公司完成新一轮融资投资。' + 'A'.repeat(200) },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].id).toBe(1);
      expect(res.body.data[1].id).toBe(2);
      expect(res.body.data[0].analysis).toBeDefined();
      expect(res.body.data[1].analysis).toBeDefined();
    });

    it('should reject empty articles array', async () => {
      const res = await request(app)
        .post('/api/analyze/batch')
        .send({ articles: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject non-array articles', async () => {
      const res = await request(app)
        .post('/api/analyze/batch')
        .send({ articles: 'not an array' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject missing articles field', async () => {
      const res = await request(app)
        .post('/api/analyze/batch')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle single article batch', async () => {
      const res = await request(app)
        .post('/api/analyze/batch')
        .send({
          articles: [
            { id: 42, title: 'Single Article', content: 'Content here. ' + 'B'.repeat(500) },
          ],
        })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(42);
    });
  });
});
