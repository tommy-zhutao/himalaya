// Integration tests for API Gateway routes
// We test the Express app without starting the server, using supertest

import express, { Express } from 'express';
import request from 'supertest';
import cors from 'cors';
import compression from 'compression';
import jwt from 'jsonwebtoken';

// Import middleware
import { authMiddleware } from '../../src/middleware/auth.middleware';
import { loggingMiddleware } from '../../src/middleware/logging.middleware';

// Mock proxy module - avoids actual upstream calls
jest.mock('../../src/proxy/proxy', () => ({
  proxyService: {
    proxyRequest: jest.fn().mockImplementation(async (serviceName: string, req: any, res: any) => {
      // Simulate successful proxy responses based on service
      const responses: Record<string, any> = {
        news: { articles: [{ id: 1, title: 'Test Article' }], total: 1 },
        user: { user: { id: 1, username: 'testuser' } },
        admin: { stats: { users: 10 } },
      };
      res.status(200).json(responses[serviceName] || { ok: true });
    }),
  },
}));

// Mock ioredis so rate limiter constructor doesn't try to connect
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  })),
}));

import { proxyService } from '../../src/proxy/proxy';

// Build a test app that mirrors the real one
function createTestApp(): Express {
  const app = express();
  app.use(cors());
  app.use(compression({ filter: () => false })); // disable in test
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(loggingMiddleware);

  // No rate limiter in test (REDIS_URL is empty)

  // Health checks
  app.get('/.well-known/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
  });
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
  });

  // News API routes
  app.all('/api/news/recommendations', authMiddleware, async (req, res) => {
    await proxyService.proxyRequest('news', req, res);
  });
  app.all('/api/news/:id/read', authMiddleware, async (req, res) => {
    await proxyService.proxyRequest('news', req, res);
  });
  app.all('/api/news*', async (req, res) => {
    await proxyService.proxyRequest('news', req, res);
  });

  // Auth routes
  app.all('/api/auth*', async (req, res) => {
    await proxyService.proxyRequest('user', req, res);
  });

  // Protected routes
  app.use('/api/users*', authMiddleware);
  app.use('/api/admin*', authMiddleware);

  app.all('/api/users*', async (req, res) => {
    await proxyService.proxyRequest('user', req, res);
  });
  app.all('/api/admin*', async (req, res) => {
    await proxyService.proxyRequest('admin', req, res);
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  });

  return app;
}

const app = createTestApp();

function generateValidToken(extra = {}) {
  return jwt.sign(
    { userId: 1, email: 'test@test.com', username: 'testuser', role: 'user', ...extra },
    process.env.JWT_SECRET!
  );
}

describe('API Gateway Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('api-gateway');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /.well-known/health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/.well-known/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('News API proxy (public routes)', () => {
    it('should proxy GET /api/news to news service', async () => {
      const res = await request(app).get('/api/news');
      expect(res.status).toBe(200);
      expect(res.body.articles).toBeDefined();
      expect(proxyService.proxyRequest).toHaveBeenCalledWith('news', expect.any(Object), expect.any(Object));
    });

    it('should proxy GET /api/news with query params', async () => {
      const res = await request(app).get('/api/news?page=1&limit=10');
      expect(res.status).toBe(200);
    });
  });

  describe('News API proxy (protected routes)', () => {
    it('should return 401 for /api/news/recommendations without token', async () => {
      const res = await request(app).get('/api/news/recommendations');
      expect(res.status).toBe(401);
    });

    it('should proxy /api/news/recommendations with valid token', async () => {
      const token = generateValidToken();
      const res = await request(app)
        .get('/api/news/recommendations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(proxyService.proxyRequest).toHaveBeenCalledWith('news', expect.any(Object), expect.any(Object));
    });

    it('should return 401 for /api/news/123/read without token', async () => {
      const res = await request(app).post('/api/news/123/read');
      expect(res.status).toBe(401);
    });

    it('should proxy /api/news/:id/read with valid token', async () => {
      const token = generateValidToken();
      const res = await request(app)
        .post('/api/news/42/read')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Auth API proxy (public)', () => {
    it('should proxy POST /api/auth/login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password' });
      expect(res.status).toBe(200);
      expect(proxyService.proxyRequest).toHaveBeenCalledWith('user', expect.any(Object), expect.any(Object));
    });

    it('should proxy POST /api/auth/register', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com', password: 'password', username: 'newuser' });
      expect(res.status).toBe(200);
    });
  });

  describe('User API proxy (protected)', () => {
    it('should return 401 for /api/users without token', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('should proxy GET /api/users with valid token', async () => {
      const token = generateValidToken();
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Admin API proxy (protected)', () => {
    it('should return 401 for /api/admin without token', async () => {
      const res = await request(app).get('/api/admin');
      expect(res.status).toBe(401);
    });

    it('should proxy GET /api/admin with valid token', async () => {
      const token = generateValidToken();
      const res = await request(app)
        .get('/api/admin')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });

    it('should return 404 for any unmatched path', async () => {
      const res = await request(app).get('/random/path');
      expect(res.status).toBe(404);
    });
  });
});
