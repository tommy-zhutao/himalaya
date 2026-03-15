import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4008;

// 智谱 AI 配置
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || process.env.ARK_API_KEY || '';
const ZHIPU_BASE_URL = process.env.ZHIPU_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || process.env.ARK_MODEL_ID || 'glm-4-7-251222';

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ai-analysis',
    timestamp: new Date().toISOString(),
    aiConfigured: !!ZHIPU_API_KEY,
  });
});

// AI Analysis endpoints
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { title, content, summary } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title or content',
      });
    }

    const analysis = {
      aiSummary: await generateAISummary(title, content, summary),
      keywords: await extractKeywords(title, content),
      sentiment: await analyzeSentiment(title, content),
      category: classifyCategory(title, content),
      qualityScore: calculateQualityScore(title, content),
    };

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze content',
    });
  }
});

// Batch analysis
app.post('/api/analyze/batch', async (req: Request, res: Response) => {
  try {
    const { articles } = req.body;

    if (!Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or empty articles array',
      });
    }

    const results = await Promise.all(
      articles.map(async (article) => {
        const { id, title, content, summary } = article;
        return {
          id,
          analysis: {
            aiSummary: await generateAISummary(title, content, summary),
            keywords: await extractKeywords(title, content),
            sentiment: await analyzeSentiment(title, content),
            category: classifyCategory(title, content),
            qualityScore: calculateQualityScore(title, content),
          },
        };
      })
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze articles',
    });
  }
});

// 智谱 AI 调用
async function callZhipuAI(prompt: string): Promise<string | null> {
  if (!ZHIPU_API_KEY) {
    console.warn('ZHIPU_API_KEY not configured, using fallback');
    return null;
  }

  try {
    const response = await axios.post<any>(
      `${ZHIPU_BASE_URL}/chat/completions`,
      {
        model: ZHIPU_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ZHIPU_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    return response.data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error: any) {
    console.error('Zhipu AI API error:', error.response?.data || error.message);
    return null;
  }
}

// AI 摘要生成
async function generateAISummary(
  title: string,
  content: string,
  originalSummary?: string
): Promise<string> {
  // 如果原文摘要足够好，直接使用
  if (originalSummary && originalSummary.length > 50) {
    return originalSummary.substring(0, 200) + (originalSummary.length > 200 ? '...' : '');
  }

  try {
    const prompt = `请为以下新闻生成一个简洁的摘要（50-100字）：

标题：${title}
内容：${content.substring(0, 500)}

摘要：`;

    const response = await callZhipuAI(prompt);
    return response || extractFirstSentences(content);
  } catch (error) {
    console.error('AI summary generation failed:', error);
    return extractFirstSentences(content);
  }
}

function extractFirstSentences(content: string): string {
  const sentences = content.split(/[。！？.!?]/).filter((s) => s.trim().length > 10);
  const summary = sentences.slice(0, 3).join('。');
  return summary.length > 0 ? summary + '。' : '';
}

// 关键词提取
async function extractKeywords(title: string, content: string): Promise<string[]> {
  try {
    const prompt = `请从以下新闻中提取 3-5 个关键词，用逗号分隔：

标题：${title}
内容：${content.substring(0, 500)}

关键词：`;

    const response = await callZhipuAI(prompt);
    if (response) {
      const keywords = response.split(/[,，、\s]+/).filter((k) => k.trim().length > 0);
      return keywords.slice(0, 5);
    }
    return extractKeywordsByFrequency(title, content);
  } catch (error) {
    console.error('Keyword extraction failed:', error);
    return extractKeywordsByFrequency(title, content);
  }
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

// 情感分析
async function analyzeSentiment(title: string, content: string): Promise<string> {
  try {
    const prompt = `请分析以下新闻的情感倾向（只回答：positive、negative 或 neutral）：

标题：${title}
内容：${content.substring(0, 300)}

情感：`;

    const response = await callZhipuAI(prompt);
    const sentiment = response?.toLowerCase().trim();

    if (['positive', 'negative', 'neutral'].includes(sentiment || '')) {
      return sentiment!;
    }
    return analyzeSentimentByWords(title, content);
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return analyzeSentimentByWords(title, content);
  }
}

function analyzeSentimentByWords(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  const positiveWords = [
    '突破', '创新', '增长', '成功', '优秀', '领先', '提升',
    'breakthrough', 'innovation', 'growth', 'success', 'excellent',
  ];

  const negativeWords = [
    '失败', '下降', '亏损', '危机', '裁员', '倒闭', '破产',
    'failure', 'decline', 'loss', 'crisis', 'layoff', 'bankrupt',
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  positiveWords.forEach((word) => {
    if (text.includes(word)) positiveScore++;
  });

  negativeWords.forEach((word) => {
    if (text.includes(word)) negativeScore++;
  });

  if (positiveScore > negativeScore + 1) return 'positive';
  if (negativeScore > positiveScore + 1) return 'negative';
  return 'neutral';
}

// 分类
function classifyCategory(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  const categories: { [key: string]: string[] } = {
    'AI/LLM': ['ai', '人工智能', '大模型', 'llm', 'gpt', 'chatgpt', 'claude', 'aiops'],
    '创业投资': ['融资', '投资', '创业', '独角兽', 'ipo', 'funding', 'startup'],
    '科技产品': ['发布', '推出', '新产品', '发布', '产品', 'launch', 'release'],
    '行业动态': ['市场', '行业', '公司', '企业', '发展', 'industry'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  return '其他';
}

// 质量评分
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

// 常用词过滤
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

// Start server
app.listen(PORT, () => {
  console.log(`🤖 AI Analysis Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`AI Configured: ${!!ZHIPU_API_KEY}`);
});
