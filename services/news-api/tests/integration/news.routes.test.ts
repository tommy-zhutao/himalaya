/**
 * Integration tests for News API routes
 */

import request from 'supertest';
import express from 'express';
import newsRoutes from '../../src/routes/news.routes';

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    news: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    userReadHistory: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    userFavorite: {
      findMany: jest.fn(),
    },
  },
}));

// Import after mocking
import { prisma } from '../../src/lib/prisma';

const app = express();
app.use(express.json());
app.use('/api/news', newsRoutes);

describe('News API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/news', () => {
    const mockNewsList = [
      {
        id: 1,
        title: 'Test News 1',
        summary: 'Summary 1',
        category: 'tech',
        viewCount: 100,
        publishedAt: new Date('2024-03-15'),
        source: { id: 1, name: 'Source 1', type: 'rss' },
      },
      {
        id: 2,
        title: 'Test News 2',
        summary: 'Summary 2',
        category: 'science',
        viewCount: 50,
        publishedAt: new Date('2024-03-14'),
        source: { id: 2, name: 'Source 2', type: 'api' },
      },
    ];

    it('should return paginated news list', async () => {
      (prisma.news.findMany as jest.Mock).mockResolvedValue(mockNewsList);
      (prisma.news.count as jest.Mock).mockResolvedValue(2);

      const response = await request(app)
        .get('/api/news')
        .query({ page: 1, limit: 20 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by category', async () => {
      (prisma.news.findMany as jest.Mock).mockResolvedValue([mockNewsList[0]]);
      (prisma.news.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .get('/api/news')
        .query({ category: 'tech' })
        .expect(200);

      expect(prisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'tech' }),
        })
      );
    });

    it('should sort by latest (default)', async () => {
      (prisma.news.findMany as jest.Mock).mockResolvedValue(mockNewsList);
      (prisma.news.count as jest.Mock).mockResolvedValue(2);

      await request(app)
        .get('/api/news')
        .query({ sort: 'latest' })
        .expect(200);

      expect(prisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { publishedAt: 'desc' },
        })
      );
    });

    it('should sort by hot', async () => {
      (prisma.news.findMany as jest.Mock).mockResolvedValue(mockNewsList);
      (prisma.news.count as jest.Mock).mockResolvedValue(2);

      await request(app)
        .get('/api/news')
        .query({ sort: 'hot' })
        .expect(200);

      expect(prisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viewCount: 'desc' },
        })
      );
    });

    it('should limit max items to 100', async () => {
      (prisma.news.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.news.count as jest.Mock).mockResolvedValue(0);

      await request(app)
        .get('/api/news')
        .query({ limit: 200 })
        .expect(200);

      expect(prisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped at 100
        })
      );
    });
  });

  describe('GET /api/news/:id', () => {
    const mockNews = {
      id: 1,
      title: 'Test News',
      content: 'Full content...',
      summary: 'AI summary',
      keywords: ['AI', 'tech'],
      sentiment: 'positive',
      qualityScore: 85,
      category: 'tech',
      viewCount: 100,
      publishedAt: new Date('2024-03-15'),
      source: { id: 1, name: 'Source 1', type: 'rss', url: 'https://...' },
    };

    it('should return news detail', async () => {
      (prisma.news.findUnique as jest.Mock).mockResolvedValue(mockNews);
      (prisma.news.update as jest.Mock).mockResolvedValue({ ...mockNews, viewCount: 101 });

      const response = await request(app)
        .get('/api/news/1')
        .expect(200);

      expect(response.body.data.id).toBe(1);
      expect(response.body.data.title).toBe('Test News');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/api/news/invalid')
        .expect(400);

      expect(response.body.error).toBe('Invalid news ID');
    });

    it('should return 404 for non-existent news', async () => {
      (prisma.news.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/news/999')
        .expect(404);

      expect(response.body.error).toBe('News not found');
    });

    it('should increment view count', async () => {
      (prisma.news.findUnique as jest.Mock).mockResolvedValue(mockNews);
      (prisma.news.update as jest.Mock).mockResolvedValue({ ...mockNews, viewCount: 101 });

      await request(app)
        .get('/api/news/1')
        .expect(200);

      expect(prisma.news.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { viewCount: { increment: 1 } },
      });
    });
  });

  describe('GET /api/news/search', () => {
    const mockSearchResults = [
      {
        id: 1,
        title: 'AI Revolution',
        summary: 'AI is changing the world',
        content: 'Full content about AI...',
        category: 'tech',
        publishedAt: new Date('2024-03-15'),
        source: { id: 1, name: 'Source 1', type: 'rss' },
      },
    ];

    it('should search news by query', async () => {
      (prisma.news.findMany as jest.Mock).mockResolvedValue(mockSearchResults);
      (prisma.news.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .get('/api/news/search')
        .query({ q: 'AI' })
        .expect(200);

      expect(response.body.query).toBe('AI');
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .get('/api/news/search')
        .expect(400);

      expect(response.body.error).toBe('Search query is required');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .get('/api/news/search')
        .query({ q: '   ' })
        .expect(400);

      expect(response.body.error).toBe('Search query is required');
    });
  });

  describe('GET /api/news/hot', () => {
    it('should return hot news', async () => {
      const mockHotNews = [
        { id: 1, title: 'Hot News 1', viewCount: 1000 },
        { id: 2, title: 'Hot News 2', viewCount: 800 },
      ];
      (prisma.news.findMany as jest.Mock).mockResolvedValue(mockHotNews);

      const response = await request(app)
        .get('/api/news/hot')
        .query({ limit: 10, days: 7 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/news/trending-topics', () => {
    it('should return trending topics', async () => {
      const mockNews = [
        { id: 1, keywords: ['AI', 'GPT'], viewCount: 100 },
        { id: 2, keywords: ['AI', 'LLM'], viewCount: 150 },
        { id: 3, keywords: ['AI', 'technology'], viewCount: 200 },
      ];
      (prisma.news.findMany as jest.Mock).mockResolvedValue(mockNews);

      const response = await request(app)
        .get('/api/news/trending-topics')
        .query({ limit: 10 })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.period).toBeDefined();
    });
  });

  describe('GET /api/news/related/:id', () => {
    it('should return related news', async () => {
      const mockOriginal = {
        id: 1,
        title: 'Original News',
        keywords: ['AI', 'GPT'],
        category: 'tech',
        sourceId: 1,
      };
      const mockRelated = [
        { id: 2, title: 'Related News', keywords: ['AI'], category: 'tech', sourceId: 1 },
      ];

      (prisma.news.findUnique as jest.Mock).mockResolvedValue(mockOriginal);
      (prisma.news.findMany as jest.Mock).mockResolvedValue(mockRelated);

      const response = await request(app)
        .get('/api/news/related/1')
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should return 404 for non-existent news', async () => {
      (prisma.news.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/news/related/999')
        .expect(404);

      expect(response.body.error).toBe('News not found');
    });
  });

  describe('GET /api/news/recommendations', () => {
    it('should return 401 without auth', async () => {
      const response = await request(app)
        .get('/api/news/recommendations')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should return recommendations for authenticated user', async () => {
      const mockReadHistory = [
        {
          newsId: 1,
          news: { id: 1, keywords: ['AI'], category: 'tech', sourceId: 1 },
        },
      ];
      const mockFavorites = [];
      const mockCandidates = [
        { id: 2, title: 'New AI News', keywords: ['AI'], category: 'tech', sourceId: 1 },
      ];

      (prisma.userReadHistory.findMany as jest.Mock).mockResolvedValue(mockReadHistory);
      (prisma.userFavorite.findMany as jest.Mock).mockResolvedValue(mockFavorites);
      (prisma.news.findMany as jest.Mock).mockResolvedValue(mockCandidates);

      const response = await request(app)
        .get('/api/news/recommendations')
        .set('x-user-id', '1')
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/news/:id/read', () => {
    it('should return 401 without auth', async () => {
      const response = await request(app)
        .post('/api/news/1/read')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should record read history', async () => {
      (prisma.news.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.userReadHistory.upsert as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/news/1/read')
        .set('x-user-id', '1')
        .send({ duration: 120 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent news', async () => {
      (prisma.news.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/news/999/read')
        .set('x-user-id', '1')
        .expect(404);

      expect(response.body.error).toBe('News not found');
    });
  });
});
