import express from 'express'
import request from 'supertest'

// Create proper jest mock for prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  newsSource: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  news: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  fetchLog: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  userFavorite: {
    deleteMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}

// Mock @prisma/client to return our mock
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}))

// Mock jsonwebtoken to control verify behavior
const mockJwtVerify = jest.fn()
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: mockJwtVerify,
}))

// Mock the prisma lib module to export our mock directly
jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Now import routes (after mocks)
import sourcesRoutes from '../../src/routes/sources.routes'
import logsRoutes from '../../src/routes/logs.routes'
import statsRoutes from '../../src/routes/stats.routes'
import usersRoutes from '../../src/routes/users.routes'
import newsRoutes from '../../src/routes/news.routes'

// Helper: create a test express app with all admin routes
function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/admin/sources', sourcesRoutes)
  app.use('/api/admin/logs', logsRoutes)
  app.use('/api/admin/stats', statsRoutes)
  app.use('/api/admin/users', usersRoutes)
  app.use('/api/admin/news', newsRoutes)
  return app
}

// Helper: generate a valid admin JWT token by making verify return a payload
function generateAdminToken(userId = 1, email = 'admin@test.com') {
  const token = `admin-token-${userId}`
  mockJwtVerify.mockReturnValue({
    userId,
    email,
    username: 'admin',
  })
  return token
}

// Helper: generate a non-admin JWT token
function generateUserToken(userId = 2, email = 'user@test.com') {
  const token = `user-token-${userId}`
  mockJwtVerify.mockReturnValue({
    userId,
    email,
    username: 'regularuser',
  })
  return token
}

// Helper: bearer header
function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// Mock admin user in DB
const mockAdminUser = {
  id: 1,
  email: 'admin@test.com',
  role: 'admin',
}

const mockRegularUser = {
  id: 2,
  email: 'user@test.com',
  role: 'user',
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ============================================================
// Auth middleware tests
// ============================================================
describe('Authentication & Authorization', () => {
  const app = createApp()

  it('should return 401 when no authorization header is provided', async () => {
    const res = await request(app).get('/api/admin/sources')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/未授权/)
  })

  it('should return 401 when token is invalid', async () => {
    mockJwtVerify.mockReturnValue(null)
    const res = await request(app)
      .get('/api/admin/sources')
      .set('Authorization', 'Bearer invalid-token')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/无效/)
  })

  it('should return 401 when user not found in DB', async () => {
    generateAdminToken(999)
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .get('/api/admin/sources')
      .set(authHeader(`admin-token-999`))
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/用户不存在/)
  })

  it('should return 403 when user is not admin', async () => {
    generateUserToken(2)
    mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser)
    const res = await request(app)
      .get('/api/admin/sources')
      .set(authHeader(`user-token-2`))
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/权限不足/)
  })

  it('should allow access when user is admin', async () => {
    generateAdminToken(1)
    mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser)
    mockPrisma.newsSource.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/api/admin/sources')
      .set(authHeader('admin-token-1'))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

// ============================================================
// Admin setup helper for subsequent tests
// ============================================================
function setupAdminAuth(userId = 1) {
  generateAdminToken(userId)
  mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser)
}

// ============================================================
// Sources routes
// ============================================================
describe('Sources Routes', () => {
  const app = createApp()

  describe('GET /api/admin/sources', () => {
    it('should return list of sources', async () => {
      setupAdminAuth()
      const mockSources = [
        { id: 1, name: 'Hacker News', type: 'rss', url: 'https://news.ycombinator.com/rss', category: 'tech', enabled: true, createdAt: new Date() },
        { id: 2, name: 'TechCrunch', type: 'rss', url: 'https://techcrunch.com/feed', category: 'tech', enabled: true, createdAt: new Date() },
      ]
      mockPrisma.newsSource.findMany.mockResolvedValue(mockSources)

      const res = await request(app)
        .get('/api/admin/sources')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(mockPrisma.newsSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } })
      )
    })

    it('should return empty list when no sources', async () => {
      setupAdminAuth()
      mockPrisma.newsSource.findMany.mockResolvedValue([])

      const res = await request(app)
        .get('/api/admin/sources')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(0)
    })
  })

  describe('POST /api/admin/sources', () => {
    it('should create a new source', async () => {
      setupAdminAuth()
      mockPrisma.newsSource.findUnique.mockResolvedValue(null)
      const newSource = { id: 3, name: 'New Source', type: 'rss', url: 'https://example.com/rss', category: 'news', enabled: true, createdAt: new Date() }
      mockPrisma.newsSource.create.mockResolvedValue(newSource)

      const res = await request(app)
        .post('/api/admin/sources')
        .set(authHeader('admin-token-1'))
        .send({ name: 'New Source', type: 'rss', url: 'https://example.com/rss', category: 'news' })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe('New Source')
    })

    it('should return 400 when required fields are missing', async () => {
      setupAdminAuth()

      const res = await request(app)
        .post('/api/admin/sources')
        .set(authHeader('admin-token-1'))
        .send({ name: 'New Source' }) // missing type and url

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/缺少必填字段/)
    })

    it('should return 400 when URL already exists', async () => {
      setupAdminAuth()
      mockPrisma.newsSource.findUnique.mockResolvedValue({ id: 1, url: 'https://example.com/rss' })

      const res = await request(app)
        .post('/api/admin/sources')
        .set(authHeader('admin-token-1'))
        .send({ name: 'Duplicate', type: 'rss', url: 'https://example.com/rss' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/URL 已存在/)
    })
  })

  describe('PUT /api/admin/sources/:id', () => {
    it('should update a source', async () => {
      setupAdminAuth()
      const existing = { id: 1, name: 'Old Name', type: 'rss', url: 'https://example.com/rss', category: 'tech', enabled: true }
      mockPrisma.newsSource.findUnique.mockResolvedValue(existing)
      const updated = { ...existing, name: 'New Name', enabled: false }
      mockPrisma.newsSource.update.mockResolvedValue(updated)

      const res = await request(app)
        .put('/api/admin/sources/1')
        .set(authHeader('admin-token-1'))
        .send({ name: 'New Name', enabled: false })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe('New Name')
    })

    it('should return 404 when source does not exist', async () => {
      setupAdminAuth()
      mockPrisma.newsSource.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .put('/api/admin/sources/999')
        .set(authHeader('admin-token-1'))
        .send({ name: 'New Name' })

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/新闻源不存在/)
    })
  })

  describe('DELETE /api/admin/sources/:id', () => {
    it('should delete a source', async () => {
      setupAdminAuth()
      mockPrisma.newsSource.findUnique.mockResolvedValue({ id: 1, name: 'Source' })
      mockPrisma.newsSource.delete.mockResolvedValue({ id: 1 })

      const res = await request(app)
        .delete('/api/admin/sources/1')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/已删除/)
    })

    it('should return 404 when source does not exist', async () => {
      setupAdminAuth()
      mockPrisma.newsSource.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .delete('/api/admin/sources/999')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/新闻源不存在/)
    })
  })
})

// ============================================================
// News routes
// ============================================================
describe('News Routes', () => {
  const app = createApp()

  describe('GET /api/admin/news', () => {
    it('should return paginated news list', async () => {
      setupAdminAuth()
      const mockNews = [
        { id: 1, title: 'AI News 1', summary: 'Summary', publishedAt: new Date(), source: { id: 1, name: 'Hacker News', type: 'rss' } },
        { id: 2, title: 'AI News 2', summary: 'Summary', publishedAt: new Date(), source: { id: 1, name: 'Hacker News', type: 'rss' } },
      ]
      mockPrisma.news.findMany.mockResolvedValue(mockNews)
      mockPrisma.news.count.mockResolvedValue(2)

      const res = await request(app)
        .get('/api/admin/news')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.pagination).toBeDefined()
      expect(res.body.pagination.page).toBe(1)
      expect(res.body.pagination.total).toBe(2)
    })

    it('should support pagination parameters', async () => {
      setupAdminAuth()
      mockPrisma.news.findMany.mockResolvedValue([])
      mockPrisma.news.count.mockResolvedValue(0)

      const res = await request(app)
        .get('/api/admin/news?page=2&limit=5')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.pagination.page).toBe(2)
      expect(res.body.pagination.limit).toBe(5)
      expect(mockPrisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page-1)*limit = (2-1)*5
          take: 5,
        })
      )
    })

    it('should support category filter', async () => {
      setupAdminAuth()
      mockPrisma.news.findMany.mockResolvedValue([])
      mockPrisma.news.count.mockResolvedValue(0)

      const res = await request(app)
        .get('/api/admin/news?category=tech')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(mockPrisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'tech' }),
        })
      )
    })

    it('should support search filter', async () => {
      setupAdminAuth()
      mockPrisma.news.findMany.mockResolvedValue([])
      mockPrisma.news.count.mockResolvedValue(0)

      const res = await request(app)
        .get('/api/admin/news?search=GPT')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      const callArgs = mockPrisma.news.findMany.mock.calls[0][0]
      expect(callArgs.where.OR).toBeDefined()
    })
  })

  describe('GET /api/admin/news/:id', () => {
    it('should return a single news article', async () => {
      setupAdminAuth()
      const mockNews = { id: 1, title: 'AI News', summary: 'Summary', content: 'Content', source: { id: 1, name: 'HN', type: 'rss', url: 'https://hn.com' } }
      mockPrisma.news.findUnique.mockResolvedValue(mockNews)

      const res = await request(app)
        .get('/api/admin/news/1')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe('AI News')
    })

    it('should return 404 when news not found', async () => {
      setupAdminAuth()
      mockPrisma.news.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/admin/news/999')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/新闻不存在/)
    })
  })

  describe('PUT /api/admin/news/:id', () => {
    it('should update a news article', async () => {
      setupAdminAuth()
      const existing = { id: 1, title: 'Old Title', summary: 'Old', content: 'Old content', category: 'tech', tags: [], imageUrl: null }
      mockPrisma.news.findUnique.mockResolvedValue(existing)
      const updated = { ...existing, title: 'New Title', category: 'ai' }
      mockPrisma.news.update.mockResolvedValue(updated)

      const res = await request(app)
        .put('/api/admin/news/1')
        .set(authHeader('admin-token-1'))
        .send({ title: 'New Title', category: 'ai' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe('New Title')
    })

    it('should return 404 when news not found', async () => {
      setupAdminAuth()
      mockPrisma.news.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .put('/api/admin/news/999')
        .set(authHeader('admin-token-1'))
        .send({ title: 'Updated' })

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/新闻不存在/)
    })
  })

  describe('DELETE /api/admin/news/:id', () => {
    it('should delete a news article and its favorites', async () => {
      setupAdminAuth()
      mockPrisma.news.findUnique.mockResolvedValue({ id: 1 })
      mockPrisma.userFavorite.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.news.delete.mockResolvedValue({ id: 1 })

      const res = await request(app)
        .delete('/api/admin/news/1')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockPrisma.userFavorite.deleteMany).toHaveBeenCalledWith({
        where: { newsId: 1 },
      })
      expect(mockPrisma.news.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it('should return 404 when news not found', async () => {
      setupAdminAuth()
      mockPrisma.news.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .delete('/api/admin/news/999')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/新闻不存在/)
    })
  })

  describe('POST /api/admin/news/:id/feature', () => {
    it('should feature a news article', async () => {
      setupAdminAuth()
      mockPrisma.news.findUnique.mockResolvedValue({ id: 1, viewCount: 100 })
      mockPrisma.news.update.mockResolvedValue({ id: 1, viewCount: 1100 })

      const res = await request(app)
        .post('/api/admin/news/1/feature')
        .set(authHeader('admin-token-1'))
        .send({ featured: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should return 404 when news not found for featuring', async () => {
      setupAdminAuth()
      mockPrisma.news.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/admin/news/999/feature')
        .set(authHeader('admin-token-1'))
        .send({ featured: true })

      expect(res.status).toBe(404)
    })
  })
})

// ============================================================
// Users routes
// ============================================================
describe('Users Routes', () => {
  const app = createApp()

  describe('GET /api/admin/users', () => {
    it('should return paginated users list', async () => {
      setupAdminAuth()
      const mockUsers = [
        { id: 1, email: 'admin@test.com', username: 'admin', avatarUrl: null, role: 'admin', isActive: true, createdAt: new Date(), lastLoginAt: null, _count: { favorites: 0 } },
        { id: 2, email: 'user@test.com', username: 'user', avatarUrl: null, role: 'user', isActive: true, createdAt: new Date(), lastLoginAt: null, _count: { favorites: 5 } },
      ]
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      mockPrisma.user.count.mockResolvedValue(2)

      const res = await request(app)
        .get('/api/admin/users')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.pagination).toBeDefined()
      expect(res.body.pagination.total).toBe(2)
    })

    it('should support pagination', async () => {
      setupAdminAuth()
      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(50)

      const res = await request(app)
        .get('/api/admin/users?page=3&limit=10')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.pagination.page).toBe(3)
      expect(res.body.pagination.limit).toBe(10)
      expect(res.body.pagination.totalPages).toBe(5)
      expect(res.body.pagination.hasNext).toBe(true)
      expect(res.body.pagination.hasPrev).toBe(true)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should support search', async () => {
      setupAdminAuth()
      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(0)

      const res = await request(app)
        .get('/api/admin/users?search=john')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      const callArgs = mockPrisma.user.findMany.mock.calls[0][0]
      expect(callArgs.where.OR).toBeDefined()
    })
  })

  describe('GET /api/admin/users/:id', () => {
    it('should return a single user', async () => {
      setupAdminAuth()
      const mockUser = { id: 1, email: 'admin@test.com', username: 'admin', avatarUrl: null, preferences: {}, role: 'admin', isActive: true, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: null, _count: { favorites: 0 } }
      // Auth middleware call first, then route call
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce(mockUser)         // route handler

      const res = await request(app)
        .get('/api/admin/users/1')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.email).toBe('admin@test.com')
    })

    it('should return 404 when user not found', async () => {
      setupAdminAuth()
      // Auth middleware call first, then route call
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce(null)             // route handler: not found

      const res = await request(app)
        .get('/api/admin/users/999')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/用户不存在/)
    })
  })

  describe('PUT /api/admin/users/:id', () => {
    it('should update a user', async () => {
      setupAdminAuth()
      const existing = { id: 2, email: 'user@test.com', username: 'oldname', avatarUrl: null, role: 'user', isActive: true }
      // Auth middleware + route findUnique + duplicate username check
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce(existing)         // route handler: find user
        .mockResolvedValueOnce(null)             // duplicate username check: no duplicate
      const updated = { ...existing, username: 'newname', isActive: false }
      mockPrisma.user.update.mockResolvedValue(updated)

      const res = await request(app)
        .put('/api/admin/users/2')
        .set(authHeader('admin-token-1'))
        .send({ username: 'newname', isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.username).toBe('newname')
      expect(res.body.data.isActive).toBe(false)
    })

    it('should return 400 when username is duplicate', async () => {
      setupAdminAuth()
      const existing = { id: 2, email: 'user@test.com', username: 'oldname', avatarUrl: null, role: 'user', isActive: true }
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce(existing)         // route handler: find user
        .mockResolvedValueOnce({ id: 3 })        // route handler: duplicate check

      const res = await request(app)
        .put('/api/admin/users/2')
        .set(authHeader('admin-token-1'))
        .send({ username: 'takenname' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/用户名已被使用/)
    })

    it('should return 404 when user not found', async () => {
      setupAdminAuth()
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce(null)             // route handler: not found

      const res = await request(app)
        .put('/api/admin/users/999')
        .set(authHeader('admin-token-1'))
        .send({ username: 'test' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/users/:id', () => {
    it('should soft delete a user', async () => {
      setupAdminAuth()
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce({ id: 2, role: 'user' }) // route handler
      mockPrisma.user.update.mockResolvedValue({ id: 2, isActive: false })

      const res = await request(app)
        .delete('/api/admin/users/2')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/用户已禁用/)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        })
      )
    })

    it('should return 403 when trying to delete admin user', async () => {
      setupAdminAuth()
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce({ id: 1, role: 'admin' }) // route handler: same admin

      const res = await request(app)
        .delete('/api/admin/users/1')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(403)
      expect(res.body.error).toMatch(/不能删除管理员/)
    })

    it('should return 404 when user not found', async () => {
      setupAdminAuth()
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce(null)             // route handler: not found

      const res = await request(app)
        .delete('/api/admin/users/999')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/admin/users/:id/role', () => {
    it('should update user role', async () => {
      setupAdminAuth()
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce({ id: 2, role: 'user' }) // route handler
      mockPrisma.user.update.mockResolvedValue({ id: 2, email: 'user@test.com', username: 'user', role: 'admin' })

      const res = await request(app)
        .put('/api/admin/users/2/role')
        .set(authHeader('admin-token-1'))
        .send({ role: 'admin' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.role).toBe('admin')
    })

    it('should return 400 for invalid role', async () => {
      setupAdminAuth()
      // Auth call happens first
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdminUser)

      const res = await request(app)
        .put('/api/admin/users/2/role')
        .set(authHeader('admin-token-1'))
        .send({ role: 'superadmin' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/无效的角色/)
    })

    it('should return 403 when changing own role', async () => {
      setupAdminAuth(1)
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)   // auth middleware
        .mockResolvedValueOnce({ id: 1, role: 'admin' }) // route handler: same user

      const res = await request(app)
        .put('/api/admin/users/1/role')
        .set(authHeader('admin-token-1'))
        .send({ role: 'user' })

      expect(res.status).toBe(403)
      expect(res.body.error).toMatch(/不能修改自己的角色/)
    })
  })
})

// ============================================================
// Logs routes
// ============================================================
describe('Logs Routes', () => {
  const app = createApp()

  describe('GET /api/admin/logs', () => {
    it('should return paginated fetch logs', async () => {
      setupAdminAuth()
      const mockLogs = [
        { id: 1, status: 'success', itemsFetched: 10, itemsCreated: 8, itemsUpdated: 2, startedAt: new Date(), source: { id: 1, name: 'HN', type: 'rss' } },
        { id: 2, status: 'error', itemsFetched: 0, itemsCreated: 0, itemsUpdated: 0, startedAt: new Date(), source: { id: 2, name: 'TC', type: 'rss' } },
      ]
      mockPrisma.fetchLog.findMany.mockResolvedValue(mockLogs)
      mockPrisma.fetchLog.count.mockResolvedValue(2)

      const res = await request(app)
        .get('/api/admin/logs')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.pagination).toBeDefined()
    })

    it('should support pagination', async () => {
      setupAdminAuth()
      mockPrisma.fetchLog.findMany.mockResolvedValue([])
      mockPrisma.fetchLog.count.mockResolvedValue(100)

      const res = await request(app)
        .get('/api/admin/logs?page=2&limit=10')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.pagination.page).toBe(2)
      expect(res.body.pagination.limit).toBe(10)
      expect(res.body.pagination.total).toBe(100)
      expect(res.body.pagination.totalPages).toBe(10)
    })

    it('should support status filter', async () => {
      setupAdminAuth()
      mockPrisma.fetchLog.findMany.mockResolvedValue([])
      mockPrisma.fetchLog.count.mockResolvedValue(0)

      const res = await request(app)
        .get('/api/admin/logs?status=error')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      const callArgs = mockPrisma.fetchLog.findMany.mock.calls[0][0]
      expect(callArgs.where.status).toBe('error')
    })

    it('should support source_id filter', async () => {
      setupAdminAuth()
      mockPrisma.fetchLog.findMany.mockResolvedValue([])
      mockPrisma.fetchLog.count.mockResolvedValue(0)

      const res = await request(app)
        .get('/api/admin/logs?source_id=5')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      const callArgs = mockPrisma.fetchLog.findMany.mock.calls[0][0]
      expect(callArgs.where.sourceId).toBe(5)
    })
  })

  describe('GET /api/admin/logs/:id', () => {
    it('should return a single log', async () => {
      setupAdminAuth()
      const mockLog = { id: 1, status: 'success', startedAt: new Date(), source: { id: 1, name: 'HN', type: 'rss', url: 'https://hn.com' } }
      mockPrisma.fetchLog.findUnique.mockResolvedValue(mockLog)

      const res = await request(app)
        .get('/api/admin/logs/1')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should return 404 when log not found', async () => {
      setupAdminAuth()
      mockPrisma.fetchLog.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/api/admin/logs/999')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/日志不存在/)
    })
  })
})

// ============================================================
// Stats (Dashboard) routes
// ============================================================
describe('Stats (Dashboard) Routes', () => {
  const app = createApp()

  describe('GET /api/admin/stats', () => {
    it('should return dashboard statistics', async () => {
      setupAdminAuth()
      mockPrisma.news.count
        .mockResolvedValueOnce(500) // totalNews
        .mockResolvedValueOnce(25)  // todayNews
      mockPrisma.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(80)  // activeUsers
        .mockResolvedValueOnce(3)   // adminCount
      mockPrisma.newsSource.findMany.mockResolvedValue([
        { id: 1, name: 'HN', type: 'rss', enabled: true, lastFetchedAt: new Date(), fetchCount: 10, errorCount: 1, _count: { news: 50, fetchLogs: 10 } },
      ])
      mockPrisma.fetchLog.findMany.mockResolvedValue([
        { status: 'success', itemsFetched: 10, itemsCreated: 8, itemsUpdated: 2 },
        { status: 'error', itemsFetched: 0, itemsCreated: 0, itemsUpdated: 0 },
      ])

      const res = await request(app)
        .get('/api/admin/stats')
        .set(authHeader('admin-token-1'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.overview).toBeDefined()
      expect(res.body.data.overview.totalNews).toBe(500)
      expect(res.body.data.overview.totalUsers).toBe(100)
      expect(res.body.data.overview.todayNews).toBe(25)
      expect(res.body.data.overview.activeUsers).toBe(80)
      expect(res.body.data.overview.adminCount).toBe(3)
      expect(res.body.data.sources).toBeDefined()
      expect(res.body.data.sources).toHaveLength(1)
      expect(res.body.data.fetchStats).toBeDefined()
      expect(res.body.data.fetchStats.totalFetches).toBe(2)
      expect(res.body.data.fetchStats.successful).toBe(1)
      expect(res.body.data.fetchStats.failed).toBe(1)
    })
  })
})

// ============================================================
// Source test endpoint
// ============================================================
describe('POST /api/admin/sources/test', () => {
  const app = createApp()

  it('should return 400 when URL is missing', async () => {
    setupAdminAuth()

    const res = await request(app)
      .post('/api/admin/sources/test')
      .set(authHeader('admin-token-1'))
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/URL 是必需的/)
  })
})
