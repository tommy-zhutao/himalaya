import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { prisma } from './lib/prisma'
import authRoutes from './routes/auth.routes'
import favoritesRoutes from './routes/favorites.routes'
import usersRoutes from './routes/users.routes'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4002

// Middleware
app.use(cors())
// 增加 JSON 请求体大小限制到 10MB，支持头像上传
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'user-api',
    timestamp: new Date().toISOString(),
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users/favorites', favoritesRoutes)
app.use('/api/users', usersRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

// Start server
async function start() {
  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected')

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 User API Service running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

start()
