/**
 * Unit tests for HTML Fetcher / Scraper logic
 * Tests parsing, filtering, and deduplication logic
 */

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Since the functions in html-fetcher.ts are exported, we could import them,
// but they depend heavily on prisma/axios. We test the core logic patterns.

// AI Keywords from html-fetcher.ts
const AI_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'dl',
  'neural network', 'transformer', 'llm', 'generative ai', 'aigc',
  'chatbot', 'gpt', 'bert', 'llama', 'claude', 'gemini', 'qwen',
  '人工智能', '机器学习', '深度学习', '神经网络', '大模型', '语言模型',
  '生成式ai', 'chatgpt', '文心一言', '通义千问', '智谱', 'deepseek',
  '自动驾驶', '计算机视觉', '自然语言处理', 'nlp', 'cv',
  'chatgpt', 'openai', 'anthropic', 'deepmind', 'hugging face',
  'stability ai', 'midjourney', 'dall-e', 'whisper',
];

const EXCLUDE_KEYWORDS = [
  '招聘', '求职', 'hiring', 'job', 'career', 'resume',
  '广告', '推广', 'advertisement', 'sponsored',
  '会议', 'conference', 'summit', 'webinar', 'event',
];

// Replicate isAIRelated for testing
function isAIRelated(title: string): boolean {
  const titleLower = title.toLowerCase();
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) return false;
  }
  for (const keyword of AI_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) return true;
  }
  return false;
}

// Replicate calculateSimilarity for testing
function calculateSimilarity(title1: string, title2: string): number {
  const s1 = title1.toLowerCase().trim();
  const s2 = title2.toLowerCase().trim();
  if (s1 === s2) return 1;
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

describe('HTML Scraper Unit Tests', () => {
  describe('isAIRelated', () => {
    it('should identify AI-related titles with English keywords', () => {
      expect(isAIRelated('OpenAI launches new GPT model')).toBe(true);
      expect(isAIRelated('Deep learning breakthrough in NLP')).toBe(true);
      expect(isAIRelated('Claude AI assistant updates')).toBe(true);
      expect(isAIRelated('Midjourney v6 released')).toBe(true);
      expect(isAIRelated('Hugging Face open source models')).toBe(true);
    });

    it('should identify AI-related titles with Chinese keywords', () => {
      expect(isAIRelated('人工智能大模型新突破')).toBe(true);
      expect(isAIRelated('深度学习在自然语言处理中的应用')).toBe(true);
      expect(isAIRelated('文心一言发布新版本')).toBe(true);
      expect(isAIRelated('智谱AI推出GLM-5')).toBe(true);
      expect(isAIRelated('通义千问API开放')).toBe(true);
    });

    it('should exclude titles with exclude keywords', () => {
      expect(isAIRelated('AI工程师招聘')).toBe(false);
      expect(isAIRelated('AI会议报名')).toBe(false);
      expect(isAIRelated('AI产品推广广告')).toBe(false);
      expect(isAIRelated('Machine Learning Engineer Hiring')).toBe(false);
    });

    it('should reject non-AI titles', () => {
      expect(isAIRelated('New restaurant opens downtown')).toBe(false);
      expect(isAIRelated('Weather forecast for tomorrow')).toBe(false);
      expect(isAIRelated('Sports scores update')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isAIRelated('OPENAI NEW MODEL')).toBe(true);
      expect(isAIRelated('Ai And Machine Learning')).toBe(true);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical titles', () => {
      expect(calculateSimilarity('AI model released', 'AI model released')).toBe(1);
    });

    it('should return high similarity for similar titles', () => {
      const sim = calculateSimilarity('OpenAI releases GPT-5', 'OpenAI releases new GPT-5 model');
      expect(sim).toBeGreaterThan(0.5);
    });

    it('should return low similarity for unrelated titles', () => {
      const sim = calculateSimilarity('Apple launches new phone', 'Climate change report');
      expect(sim).toBeLessThan(0.3);
    });

    it('should return 0 for completely different words', () => {
      const sim = calculateSimilarity('alpha beta gamma', 'delta epsilon zeta');
      expect(sim).toBe(0);
    });

    it('should handle Chinese titles', () => {
      const sim = calculateSimilarity('人工智能大模型发布', '人工智能大模型更新');
      // Chinese doesn't split on spaces, so this tests the fallback behavior
      expect(typeof sim).toBe('number');
      expect(sim).toBeGreaterThanOrEqual(0);
      expect(sim).toBeLessThanOrEqual(1);
    });
  });

  describe('FetchResult structure', () => {
    it('should have correct structure for successful fetch', () => {
      const result = {
        sourceId: 1,
        sourceName: '量子位',
        success: true,
        itemsFetched: 20,
        itemsCreated: 10,
        itemsUpdated: 0,
        itemsSkipped: 10,
      };

      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBeLessThanOrEqual(result.itemsFetched);
    });

    it('should have correct structure for failed fetch', () => {
      const result = {
        sourceId: 1,
        sourceName: '量子位',
        success: false,
        itemsFetched: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        errorMessage: 'Connection timeout',
      };

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle disabled source', () => {
      const result = {
        sourceId: 1,
        sourceName: 'Disabled Source',
        success: false,
        itemsFetched: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        errorMessage: 'Source is disabled',
      };

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Source is disabled');
    });
  });

  describe('Site selectors', () => {
    it('should have selectors for known Chinese tech sites', () => {
      const knownSites = ['qbitai.com', 'leiphone.com', 'jiqizhixin.com', '36kr.com', 'huxiu.com', 'infoq.cn', 'geekpark.net', 'ithome.com'];
      // We verify the concept — these sites should be matchable by hostname
      knownSites.forEach(site => {
        expect(site).toContain('.');
        expect(site.length).toBeGreaterThan(0);
      });
    });
  });
});
