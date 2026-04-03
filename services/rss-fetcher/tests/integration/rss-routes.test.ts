/**
 * Integration tests for RSS Fetcher Express routes
 */

// --- Mocks before imports ---

const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    newsSource: { findUnique: mockFindUnique, findMany: mockFindMany, update: mockUpdate },
    news: { findUnique: mockFindUnique, findMany: mockFindMany, create: mockCreate, update: mockUpdate },
    fetchLog: { create: mockCreate, findMany: mockFindMany },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('../../src/lib/ai-client', () => ({
  analyzeNews: jest.fn().mockResolvedValue(null),
  analyzeNewsBatch: jest.fn().mockResolvedValue(new Map()),
}));

jest.mock('rss-parser', () => ({
  __esModule: true,
  default: class MockParser {
    constructor(opts?: any) {}
    async parseURL() { return { title: 'Test', link: 'https://example.com', items: [] }; }
  },
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
  validate: jest.fn().mockReturnValue(true),
}));

// --- Imports ---

import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { fetchAllRSS, fetchRSSFeed } from '../../src/lib/rss-fetcher';

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'rss-fetcher', timestamp: new Date().toISOString(), cronSchedule: '*/15 * * * *' });
  });

  app.post('/api/fetch', async (_req, res) => {
    try {
      const results = await fetchAllRSS();
      res.json({ success: true, timestamp: new Date().toISOString(), results });
    } catch { res.status(500).json({ error: 'Failed to fetch RSS' }); }
  });

  app.post('/api/fetch/:sourceId', async (req, res) => {
    try {
      const sourceId = parseInt(req.params.sourceId);
      if (isNaN(sourceId)) return res.status(400).json({ error: 'Invalid source ID' });
      const result = await fetchRSSFeed(sourceId);
      res.json({ success: result.success, timestamp: new Date().toISOString(), result });
    } catch { res.status(500).json({ error: 'Failed to fetch RSS' }); }
  });

  app.get('/api/sources', async (_req, res) => {
    try {
      const sources = await mockFindMany({ where: { type: 'rss' }, orderBy: { name: 'asc' } });
      res.json({ data: sources });
    } catch { res.status(500).json({ error: 'Failed to fetch sources' }); }
  });

  app.get('/api/logs', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const logs = await mockFindMany({ orderBy: { startedAt: 'desc' }, take: limit });
      res.json({ data: logs });
    } catch { res.status(500).json({ error: 'Failed to fetch logs' }); }
  });

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}

beforeAll(() => { console.log = jest.fn() as any; console.error = jest.fn() as any; });

describe('RSS Fetcher - Routes Integration', () => {
  let app: express.Application;
  beforeAll(() => { app = createApp(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('rss-fetcher');
      expect(res.body.cronSchedule).toBe('*/15 * * * *');
    });
  });

  describe('POST /api/fetch', () => {
    it('should trigger fetch and return results', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 1 });
      const res = await request(app).post('/api/fetch');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toEqual([]);
    });

    it('should handle DB errors', async () => {
      mockFindMany.mockRejectedValue(new Error('DB Error'));
      const res = await request(app).post('/api/fetch');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/fetch/:sourceId', () => {
    it('should fetch a specific source', async () => {
      let count = 0;
      mockFindUnique.mockImplementation(() => {
        count++;
        if (count === 1) return Promise.resolve({ id: 1, name: 'Feed', url: 'https://example.com', type: 'rss', enabled: true, category: 'tech' });
        return Promise.resolve(null);
      });
      mockFindMany.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 1 });
      mockUpdate.mockResolvedValue({});

      const res = await request(app).post('/api/fetch/1');
      expect(res.status).toBe(200);
      expect(res.body.result.sourceName).toBe('Feed');
    });

    it('should return 400 for invalid source ID', async () => {
      const res = await request(app).post('/api/fetch/invalid');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid source ID');
    });

    it('should return 500 when source not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      const res = await request(app).post('/api/fetch/999');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/sources', () => {
    it('should return sources list', async () => {
      mockFindMany.mockResolvedValue([{ id: 1, name: 'Feed A' }]);
      const res = await request(app).get('/api/sources');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/logs', () => {
    it('should return logs', async () => {
      mockFindMany.mockResolvedValue([{ id: 1, status: 'success' }]);
      const res = await request(app).get('/api/logs');
      expect(res.status).toBe(200);
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
