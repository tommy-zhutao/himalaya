/**
 * Integration tests for HTML Fetcher Express routes
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
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('../../src/lib/ai-client', () => ({
  analyzeNews: jest.fn().mockResolvedValue(null),
}));

jest.mock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: Buffer.from('<html></html>'), headers: {} }) }));

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
  validate: jest.fn().mockReturnValue(true),
}));

// --- Imports ---

import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { fetchAllHTML, fetchHTMLSource } from '../../src/lib/html-fetcher';

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'html-fetcher', timestamp: new Date().toISOString(), cronSchedule: '*/30 * * * *' });
  });

  app.post('/api/fetch', async (_req, res) => {
    try {
      const results = await fetchAllHTML();
      res.json({ success: true, timestamp: new Date().toISOString(), results });
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch HTML' }); }
  });

  app.post('/api/fetch/:sourceId', async (req, res) => {
    try {
      const sourceId = parseInt(req.params.sourceId);
      if (isNaN(sourceId)) return res.status(400).json({ error: 'Invalid source ID' });
      const result = await fetchHTMLSource(sourceId);
      res.json({ success: result.success, timestamp: new Date().toISOString(), result });
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch HTML' }); }
  });

  app.get('/api/sources', async (_req, res) => {
    try {
      const sources = await mockFindMany({ where: { type: 'html' }, orderBy: { name: 'asc' } });
      const safeSources = sources.map((s: any) => ({ id: s.id, name: s.name, url: s.url, enabled: s.enabled }));
      res.json({ data: safeSources });
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch sources' }); }
  });

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}

beforeAll(() => { console.log = jest.fn() as any; console.error = jest.fn() as any; });

describe('HTML Fetcher - Routes Integration', () => {
  let app: express.Application;
  beforeAll(() => { app = createApp(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('html-fetcher');
    });
  });

  describe('POST /api/fetch', () => {
    it('should trigger fetch and return results', async () => {
      mockFindMany.mockResolvedValue([]);
      const res = await request(app).post('/api/fetch');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle errors', async () => {
      mockFindMany.mockRejectedValue(new Error('DB Error'));
      const res = await request(app).post('/api/fetch');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/fetch/:sourceId', () => {
    it('should fetch specific source', async () => {
      mockFindUnique.mockImplementation((args?: any) => {
        if (args?.where?.id === 1) return Promise.resolve({ id: 1, name: 'HTML', url: 'https://html.example.com', type: 'html', enabled: true, category: 'tech' });
        return Promise.resolve(null);
      });
      mockFindMany.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 1 });
      mockUpdate.mockResolvedValue({});
      const res = await request(app).post('/api/fetch/1');
      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app).post('/api/fetch/invalid');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/sources', () => {
    it('should return sources', async () => {
      mockFindMany.mockResolvedValue([{ id: 1, name: 'HTML Source', url: 'https://html.example.com', enabled: true }]);
      const res = await request(app).get('/api/sources');
      expect(res.status).toBe(200);
    });
  });

  describe('404 handler', () => {
    it('should return 404', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
