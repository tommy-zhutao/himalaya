import request from 'supertest'
import express from 'express'

// Must mock before importing the routes
jest.mock('../../src/lib/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  }
  return { prisma: mockPrisma }
})

// Import after mocking
import { prisma } from '../../src/lib/prisma'
import authRoutes from '../../src/routes/auth.routes'

// Setup Express app for testing
function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRoutes)
  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// Get mocked functions
const mockPrisma = prisma as any

describe('Auth Routes', () => {
  let app: express.Application

  beforeAll(() => {
    app = createApp()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Test1234',
    }

    it('should register a new user successfully', async () => {
      const createdUser = {
        id: 1,
        email: 'newuser@example.com',
        username: 'newuser',
        passwordHash: 'hashed',
        role: 'user',
        createdAt: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValueOnce(null) // email check
      mockPrisma.user.findUnique.mockResolvedValueOnce(null) // username check
      mockPrisma.user.create.mockResolvedValue(createdUser)

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      expect(res.body.user).toBeDefined()
      expect(res.body.user.email).toBe('newuser@example.com')
      expect(res.body.user.username).toBe('newuser')
      expect(res.body.token).toBeDefined()
      expect(res.body.token.accessToken).toBeDefined()
      expect(res.body.token.refreshToken).toBeDefined()
    })

    it('should return 400 if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'newuser@example.com',
        username: 'existing',
      })

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(400)

      expect(res.body.error).toContain('邮箱已被注册')
    })

    it('should return 400 if username already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null) // email check passes
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 2,
        email: 'other@example.com',
        username: 'newuser',
      })

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(400)

      expect(res.body.error).toContain('用户名已被使用')
    })

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400)

      expect(res.body.error).toContain('缺少必填字段')
    })

    it('should return 400 if email format is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'newuser',
          password: 'Test1234',
        })
        .expect(400)

      expect(res.body.error).toContain('邮箱格式不正确')
    })

    it('should return 400 if password is too weak', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'weak',
        })
        .expect(400)

      expect(res.body.error).toContain('密码强度不足')
      expect(res.body.details).toBeDefined()
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const bcrypt = require('bcrypt')
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234',
        })
        .expect(200)

      expect(res.body.user).toBeDefined()
      expect(res.body.user.email).toBe('test@example.com')
      expect(res.body.token).toBeDefined()
      expect(res.body.token.accessToken).toBeDefined()

      jest.restoreAllMocks()
    })

    it('should return 401 if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test1234',
        })
        .expect(401)

      expect(res.body.error).toContain('邮箱或密码错误')
    })

    it('should return 401 if password is incorrect', async () => {
      const bcrypt = require('bcrypt')
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
      })

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword1',
        })
        .expect(401)

      expect(res.body.error).toContain('邮箱或密码错误')

      jest.restoreAllMocks()
    })

    it('should return 400 if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400)

      expect(res.body.error).toContain('缺少必填字段')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const jwt = require('jsonwebtoken')
      const refreshToken = jwt.sign(
        { userId: 1, email: 'test@example.com', username: 'testuser' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
      })

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(res.body.token).toBeDefined()
      expect(res.body.token.accessToken).toBeDefined()
    })

    it('should return 400 if refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400)

      expect(res.body.error).toContain('缺少 refresh token')
    })

    it('should return 401 if refresh token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401)

      expect(res.body.error).toContain('无效的 refresh token')
    })

    it('should return 404 if user does not exist', async () => {
      const jwt = require('jsonwebtoken')
      const refreshToken = jwt.sign(
        { userId: 999, email: 'gone@example.com', username: 'gone' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(404)

      expect(res.body.error).toContain('用户不存在')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const jwt = require('jsonwebtoken')
      const token = jwt.sign(
        { userId: 1, email: 'test@example.com', username: 'testuser' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      )

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      })

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.user).toBeDefined()
      expect(res.body.user.email).toBe('test@example.com')
    })

    it('should return 401 if no authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401)

      expect(res.body.error).toContain('未授权')
    })

    it('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(res.body.error).toContain('无效的 token')
    })

    it('should return 404 if user does not exist', async () => {
      const jwt = require('jsonwebtoken')
      const token = jwt.sign(
        { userId: 999, email: 'gone@example.com', username: 'gone' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      )

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(res.body.error).toContain('用户不存在')
    })
  })
})
