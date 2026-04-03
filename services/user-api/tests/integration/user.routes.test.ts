import request from 'supertest'
import express from 'express'

// Must mock before importing the routes
jest.mock('../../src/lib/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }
  return { prisma: mockPrisma }
})

// Import after mocking
import { prisma } from '../../src/lib/prisma'
import usersRoutes from '../../src/routes/users.routes'

// Setup Express app for testing
function createApp() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use('/api/users', usersRoutes)
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

describe('User Routes', () => {
  let app: express.Application

  beforeAll(() => {
    app = createApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users/me', () => {
    it('should return user info with valid token', async () => {
      const token = generateTestToken()

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: { theme: 'dark' },
        role: 'user',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        _count: { favorites: 5 },
      })

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.user).toBeDefined()
      expect(res.body.user.email).toBe('test@example.com')
      expect(res.body.user.username).toBe('testuser')
      expect(res.body.user._count.favorites).toBe(5)
    })

    it('should return 401 if no authorization header', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .expect(401)

      expect(res.body.error).toContain('未授权')
    })

    it('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(res.body.error).toContain('无效的 token')
    })

    it('should return 404 if user does not exist', async () => {
      const token = generateTestToken({ userId: 999, email: 'gone@example.com', username: 'gone' })
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(res.body.error).toContain('用户不存在')
    })
  })

  describe('PUT /api/users/me', () => {
    it('should update username successfully', async () => {
      const token = generateTestToken()

      // First call: get existing user; Second call: check duplicate username (null = not taken)
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 1,
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hashed',
        })
        .mockResolvedValueOnce(null) // no duplicate username

      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'newusername',
        avatarUrl: null,
        preferences: null,
        role: 'user',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      })

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'newusername' })
        .expect(200)

      expect(res.body.user.username).toBe('newusername')
    })

    it('should return 400 if username is already taken', async () => {
      const token = generateTestToken()

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 1,
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hashed',
        })
        .mockResolvedValueOnce({
          id: 2,
          email: 'other@example.com',
          username: 'takenname',
        })

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'takenname' })
        .expect(400)

      expect(res.body.error).toContain('用户名已被使用')
    })

    it('should update avatarUrl', async () => {
      const token = generateTestToken()

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed',
      })

      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        preferences: null,
        role: 'user',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      })

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatarUrl: 'https://example.com/new-avatar.jpg' })
        .expect(200)

      expect(res.body.user.avatarUrl).toBe('https://example.com/new-avatar.jpg')
    })

    it('should return 401 if no authorization header', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .send({ username: 'newname' })
        .expect(401)

      expect(res.body.error).toContain('未授权')
    })
  })
})
