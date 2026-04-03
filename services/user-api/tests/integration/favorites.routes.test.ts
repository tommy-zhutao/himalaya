import request from 'supertest'
import express from 'express'

// Must mock before importing the routes
jest.mock('../../src/lib/prisma', () => {
  const mockPrisma = {
    userFavorite: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    news: {
      findUnique: jest.fn(),
    },
  }
  return { prisma: mockPrisma }
})

// Import after mocking
import { prisma } from '../../src/lib/prisma'
import favoritesRoutes from '../../src/routes/favorites.routes'

// Setup Express app for testing
function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/users/favorites', favoritesRoutes)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

const mockPrisma = prisma as any

// Helper to generate a valid JWT for testing
function generateTestToken(payload = { userId: 1, email: 'test@example.com', username: 'testuser' }) {
  const jwt = require('jsonwebtoken')
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })
}

describe('Favorites Routes', () => {
  let app: express.Application

  beforeAll(() => {
    app = createApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users/favorites', () => {
    it('should return favorites list with pagination', async () => {
      const token = generateTestToken()

      mockPrisma.userFavorite.count.mockResolvedValue(25)
      mockPrisma.userFavorite.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 1,
          newsId: 100,
          createdAt: new Date(),
          news: {
            id: 100,
            title: 'Test News',
            summary: 'Summary',
            content: 'Content',
            author: 'Author',
            url: 'https://example.com/news',
            imageUrl: null,
            category: 'AI',
            tags: ['test'],
            publishedAt: new Date(),
            viewCount: 10,
            likeCount: 5,
            shareCount: 2,
            source: {
              id: 1,
              name: 'Test Source',
              type: 'rss',
              category: 'AI',
            },
          },
        },
      ])

      const res = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.data).toBeDefined()
      expect(res.body.data).toHaveLength(1)
      expect(res.body.pagination).toBeDefined()
      expect(res.body.pagination.total).toBe(25)
    })

    it('should return 401 if no authorization header', async () => {
      const res = await request(app)
        .get('/api/users/favorites')
        .expect(401)

      expect(res.body.error).toContain('未授权')
    })

    it('should support pagination query params', async () => {
      const token = generateTestToken()

      mockPrisma.userFavorite.count.mockResolvedValue(100)
      mockPrisma.userFavorite.findMany.mockResolvedValue([])

      const res = await request(app)
        .get('/api/users/favorites?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.pagination.page).toBe(2)
      expect(res.body.pagination.limit).toBe(10)
    })
  })

  describe('GET /api/users/favorites/check/:id', () => {
    it('should return true if news is favorited', async () => {
      const token = generateTestToken()

      mockPrisma.userFavorite.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        newsId: 100,
        createdAt: new Date(),
      })

      const res = await request(app)
        .get('/api/users/favorites/check/100')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.isFavorite).toBe(true)
    })

    it('should return false if news is not favorited', async () => {
      const token = generateTestToken()

      mockPrisma.userFavorite.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/users/favorites/check/200')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.isFavorite).toBe(false)
    })

    it('should return 400 for invalid news ID', async () => {
      const token = generateTestToken()

      const res = await request(app)
        .get('/api/users/favorites/check/abc')
        .set('Authorization', `Bearer ${token}`)
        .expect(400)

      expect(res.body.error).toContain('无效的新闻 ID')
    })
  })

  describe('POST /api/users/favorites/:id', () => {
    it('should add a news to favorites', async () => {
      const token = generateTestToken()

      mockPrisma.news.findUnique.mockResolvedValue({
        id: 100,
        title: 'Test News',
      })

      mockPrisma.userFavorite.findUnique.mockResolvedValue(null)

      mockPrisma.userFavorite.create.mockResolvedValue({
        id: 1,
        userId: 1,
        newsId: 100,
        createdAt: new Date(),
      })

      const res = await request(app)
        .post('/api/users/favorites/100')
        .set('Authorization', `Bearer ${token}`)
        .expect(201)

      expect(res.body.message).toContain('收藏成功')
      expect(res.body.favorite.newsId).toBe(100)
    })

    it('should return idempotent success if already favorited', async () => {
      const token = generateTestToken()

      mockPrisma.news.findUnique.mockResolvedValue({ id: 100, title: 'Test' })
      mockPrisma.userFavorite.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        newsId: 100,
        createdAt: new Date(),
      })

      const res = await request(app)
        .post('/api/users/favorites/100')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.message).toContain('已收藏')
    })

    it('should return 404 if news does not exist', async () => {
      const token = generateTestToken()

      mockPrisma.news.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/users/favorites/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(res.body.error).toContain('新闻不存在')
    })

    it('should return 400 for invalid news ID', async () => {
      const token = generateTestToken()

      const res = await request(app)
        .post('/api/users/favorites/abc')
        .set('Authorization', `Bearer ${token}`)
        .expect(400)

      expect(res.body.error).toContain('无效的新闻 ID')
    })
  })

  describe('DELETE /api/users/favorites/:id', () => {
    it('should remove a news from favorites', async () => {
      const token = generateTestToken()

      mockPrisma.userFavorite.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        newsId: 100,
        createdAt: new Date(),
      })

      mockPrisma.userFavorite.delete.mockResolvedValue({
        id: 1,
        userId: 1,
        newsId: 100,
        createdAt: new Date(),
      })

      const res = await request(app)
        .delete('/api/users/favorites/100')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.message).toContain('取消收藏成功')
    })

    it('should return 404 if favorite does not exist', async () => {
      const token = generateTestToken()

      mockPrisma.userFavorite.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .delete('/api/users/favorites/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(res.body.error).toContain('未找到该收藏')
    })

    it('should return 400 for invalid news ID', async () => {
      const token = generateTestToken()

      const res = await request(app)
        .delete('/api/users/favorites/abc')
        .set('Authorization', `Bearer ${token}`)
        .expect(400)

      expect(res.body.error).toContain('无效的新闻 ID')
    })
  })
})
