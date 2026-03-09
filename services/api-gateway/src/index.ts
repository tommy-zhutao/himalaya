import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { authMiddleware } from './middleware/auth.middleware'
import { loggingMiddleware } from './middleware/logging.middleware'
import { createRateLimiter } from './middleware/rateLimit.middleware'
import { proxyService } from './proxy/proxy'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors())
app.use(express.json())
app.use(loggingMiddleware)

// Rate limiting (optional - requires Redis)
if (process.env.REDIS_URL) {
  app.use(
    createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
    })
  )
}

// Health check
app.get('/.well-known/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  })
})

// Authentication middleware (applied to all API routes)
app.use('/api/*', authMiddleware)

// Proxy routes to downstream services

// News API routes
app.all('/api/news*', async (req, res) => {
  await proxyService.proxyRequest('news', req, res)
})

// User API routes (auth + users)
app.all('/api/auth*', async (req, res) => {
  await proxyService.proxyRequest('user', req, res)
})

app.all('/api/users*', async (req, res) => {
  await proxyService.proxyRequest('user', req, res)
})

// Admin API routes
app.all('/api/admin*', async (req, res) => {
  await proxyService.proxyRequest('admin', req, res)
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  })
})

// Start server
async function start() {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 API Gateway running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`📡 Proxying to:`)
      console.log(`   - News API: ${process.env.NEWS_API_URL || 'http://localhost:4001'}`)
      console.log(`   - User API: ${process.env.USER_API_URL || 'http://localhost:4002'}`)
      console.log(`   - Admin API: ${process.env.ADMIN_API_URL || 'http://localhost:4003'}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  process.exit(0)
})

start()
