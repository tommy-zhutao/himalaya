import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { prisma } from './lib/prisma'
import sourcesRoutes from './routes/sources.routes'
import logsRoutes from './routes/logs.routes'
import statsRoutes from './routes/stats.routes'
import usersRoutes from './routes/users.routes'
import newsRoutes from './routes/news.routes'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4003

// Middleware
app.use(cors())
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'admin-api',
    timestamp: new Date().toISOString(),
  })
})

// Routes
app.use('/api/admin/sources', sourcesRoutes)
app.use('/api/admin/logs', logsRoutes)
app.use('/api/admin/stats', statsRoutes)
app.use('/api/admin/users', usersRoutes)
app.use('/api/admin/news', newsRoutes)

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
      console.log(`🚀 Admin API Service running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`📚 API endpoints:`)
      console.log(`   - GET  /api/admin/sources - List all sources`)
      console.log(`   - POST /api/admin/sources - Create source`)
      console.log(`   - PUT  /api/admin/sources/:id - Update source`)
      console.log(`   - DELETE /api/admin/sources/:id - Delete source`)
      console.log(`   - GET  /api/admin/logs - List fetch logs`)
      console.log(`   - GET  /api/admin/stats - System statistics`)
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
