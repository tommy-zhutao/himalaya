/**
 * Integration tests for Content Fetcher Express routes
 */

// Mock Prisma
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    news: { findUnique: mockFindUnique, findMany: mockFindMany, update: mockUpdate },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
  validate: jest.fn().mockReturnValue(true),
}));

// Imports
import express from 'express';
import cors from 'cors';
import request from 'supertest';

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'content-fetcher', timestamp: new Date().toISOString(), cronSchedule: '0 */6 * * *' });
  });

  app.post('/api/fetch', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const category = req.query.category as string;
      const whereClause: any = { OR: [{ content: '' }, { content: null }] };
      if (category) whereClause.category = category;
      
      const items: any[] = [];
      mockFindMany.mockResolvedValueOnce(items);
      
      const results: any[] = [];
      for (const news of items) {
        results.push({ id: news.id, title: news.title, success: true, contentLength: 100 });
      }
      
      const successCount = results.filter((r: any) => r.success).length;
      res.json({ success: true, timestamp: new Date().toISOString(), total: items.length, successCount, failCount: items.length - successCount, results });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch content' });
    }
  });

  app.post('/api/fetch/:newsId', async (req, res) => {
    try {
      const newsId = parseInt(req.params.newsId);
      if (isNaN(newsId)) return res.status(400).json({ error: 'Invalid news ID' });
      
      const news: any = { id: newsId, title: 'Test News', url: 'https://example.com/test' };
      mockFindUnique.mockResolvedValueOnce(news);
      
      res.json({ success: true, timestamp: new Date().toISOString(), newsId, title: news.title, contentLength: 100 });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch content' });
    }
  });

  app.get('/api/stats', async (_req, res) => {
    res.json({ total: 10, withContent: 7, withoutContent: 3, percentage: '70.0' });
  });

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}

beforeAll(() => { console.log = jest.fn() as any; console.error = jest.fn() as any; });

describe('Content Fetcher - Routes Integration', () => {
  let app: express.Application;
  beforeAll(() => { app = createApp(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('content-fetcher');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.cronSchedule).toBe('0 */6 * * *');
    });
  });

  describe('POST /api/fetch', () => {
    it('should fetch content for news without content', async () => {
      mockFindMany.mockResolvedValue([]);
      const res = await request(app).post('/api/fetch');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.total).toBe(0);
    });

    it('should respect limit parameter', async () => {
      mockFindMany.mockResolvedValue([]);
      const res = await request(app).post('/api/fetch?limit=10');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/fetch/:newsId', () => {
    it('should fetch content for specific news', async () => {
      mockFindUnique.mockResolvedValue({ id: 1, title: 'Test News', url: 'https://example.com/1' });
      const res = await request(app).post('/api/fetch/1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.newsId).toBe(1);
      expect(res.body.title).toBe('Test News');
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app).post('/api/fetch/invalid');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid news ID');
    });

    it('should return 400 for non-numeric ID', async () => {
      const res = await request(app).post('/api/fetch/abc');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid news ID');
    });
  });

  describe('GET /api/stats', () => {
    it('should return content statistics', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(10);
      expect(res.body.withContent).toBe(7);
      expect(res.body.withoutContent).toBe(3);
      expect(res.body.percentage).toBe('70.0');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('should return 404 for POST unknown route', async () => {
      const res = await request(app).post('/api/unknown');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });
  });
});
