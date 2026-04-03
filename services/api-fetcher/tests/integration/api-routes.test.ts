/**
 * Integration tests for API Fetcher routes
 */

import request from 'supertest';
import express from 'express';

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    newsSource: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    news: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    fetchLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Mock axios
jest.mock('axios', () => {
  const mockAxios: any = {
    get: jest.fn(),
    post: jest.fn(),
    create: jest.fn(() => mockAxios),
    defaults: {},
  };
  return {
    __esModule: true,
    default: mockAxios,
    ...mockAxios,
  };
});

// Mock the fetcher module
const mockFetchAllAPI = jest.fn().mockResolvedValue([
  { sourceId: 1, sourceName: 'Source 1', success: true, itemsFetched: 10, itemsCreated: 5, itemsUpdated: 3, itemsSkipped: 2 },
]);
const mockFetchAPISource = jest.fn().mockResolvedValue({
  sourceId: 1, sourceName: 'Source 1', success: true, itemsFetched: 5, itemsCreated: 3, itemsUpdated: 1, itemsSkipped: 1,
});

jest.mock('../../src/lib/api-fetcher', () => ({
  fetchAllAPI: (...args: any[]) => mockFetchAllAPI(...args),
  fetchAPISource: (...args: any[]) => mockFetchAPISource(...args),
}));

import { prisma } from '../../src/lib/prisma';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-fetcher', timestamp: new Date().toISOString() });
});

// POST /api/fetch
app.post('/api/fetch', async (req, res) => {
  try {
    const { fetchAllAPI } = require('../../src/lib/api-fetcher');
    const results = await fetchAllAPI();
    res.json({ success: true, timestamp: new Date().toISOString(), results });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch from API sources' });
  }
});

// POST /api/fetch/:sourceId
app.post('/api/fetch/:sourceId', async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    if (isNaN(sourceId)) return res.status(400).json({ error: 'Invalid source ID' });
    const { fetchAPISource } = require('../../src/lib/api-fetcher');
    const result = await fetchAPISource(sourceId);
    res.json({ success: result.success, timestamp: new Date().toISOString(), result });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch from API source' });
  }
});

// GET /api/sources
app.get('/api/sources', async (req, res) => {
  try {
    const sources = await prisma.newsSource.findMany({
      where: { type: 'api' },
      orderBy: { name: 'asc' },
    });
    const safeSources = sources.map((s: any) => ({
      id: s.id, name: s.name, url: s.url, category: s.category,
      enabled: s.enabled, lastFetchedAt: s.lastFetchedAt,
      fetchCount: s.fetchCount, errorCount: s.errorCount,
    }));
    res.json({ data: safeSources });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// GET /api/logs
app.get('/api/logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const logs = await prisma.fetchLog.findMany({
      where: { source: { type: 'api' } },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    res.json({ data: logs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

describe('API Fetcher Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('api-fetcher');
    });
  });

  describe('GET /api/sources', () => {
    it('should return API sources', async () => {
      (prisma.newsSource.findMany as jest.Mock).mockResolvedValue([
        { id: 1, name: 'NewsAPI', url: 'https://newsapi.org', category: 'general', enabled: true, lastFetchedAt: null, fetchCount: 10, errorCount: 0 },
      ]);

      const res = await request(app).get('/api/sources').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('NewsAPI');
    });

    it('should handle database errors', async () => {
      (prisma.newsSource.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));
      const res = await request(app).get('/api/sources').expect(500);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/logs', () => {
    it('should return fetch logs with default limit', async () => {
      (prisma.fetchLog.findMany as jest.Mock).mockResolvedValue([
        { id: 1, status: 'success', itemsFetched: 10, startedAt: new Date() },
      ]);

      const res = await request(app).get('/api/logs').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(prisma.fetchLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 })
      );
    });

    it('should respect custom limit (capped at 100)', async () => {
      (prisma.fetchLog.findMany as jest.Mock).mockResolvedValue([]);

      await request(app).get('/api/logs?limit=200').expect(200);
      expect(prisma.fetchLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });

  describe('POST /api/fetch', () => {
    it('should trigger fetch for all sources', async () => {
      mockFetchAllAPI.mockResolvedValueOnce([
        { sourceId: 1, sourceName: 'S1', success: true, itemsFetched: 10, itemsCreated: 5, itemsUpdated: 3, itemsSkipped: 2 },
      ]);

      const res = await request(app).post('/api/fetch').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveLength(1);
    });

    it('should handle fetch errors', async () => {
      mockFetchAllAPI.mockRejectedValueOnce(new Error('Fetch failed'));

      const res = await request(app).post('/api/fetch').expect(500);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/fetch/:sourceId', () => {
    it('should trigger fetch for specific source', async () => {
      mockFetchAPISource.mockResolvedValueOnce({
        sourceId: 1, sourceName: 'S1', success: true, itemsFetched: 5, itemsCreated: 3, itemsUpdated: 1, itemsSkipped: 1,
      });

      const res = await request(app).post('/api/fetch/1').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.sourceId).toBe(1);
      expect(mockFetchAPISource).toHaveBeenCalledWith(1);
    });

    it('should reject invalid source ID', async () => {
      const res = await request(app).post('/api/fetch/abc').expect(400);
      expect(res.body.error).toContain('Invalid');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown').expect(404);
      expect(res.body.error).toBe('Not found');
    });
  });
});
