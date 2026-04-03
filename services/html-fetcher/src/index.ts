import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { prisma } from './lib/prisma'
import { fetchAllHTML, fetchHTMLSource } from './lib/html-fetcher'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4010
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 */2 * * *' // Every 2 hours

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
    service: 'html-fetcher',
    timestamp: new Date().toISOString(),
    cronSchedule: CRON_SCHEDULE,
  })
})

/**
 * POST /api/fetch
 * Manually trigger HTML fetch for all sources
 */
app.post('/api/fetch', async (req, res) => {
  try {
    const maxNews = parseInt(req.query.max as string) || 10
    const results = await fetchAllHTML(maxNews)
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: any) {
    console.error('Error in manual fetch:', error)
    res.status(500).json({ error: 'Failed to fetch HTML' })
  }
})

/**
 * POST /api/fetch/:sourceId
 * Manually trigger HTML fetch for a specific source
 */
app.post('/api/fetch/:sourceId', async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId)
    const maxNews = parseInt(req.query.max as string) || 10

    if (isNaN(sourceId)) {
      return res.status(400).json({ error: 'Invalid source ID' })
    }

    const result = await fetchHTMLSource(sourceId, maxNews)
    res.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error: any) {
    console.error('Error in manual fetch:', error)
    res.status(500).json({ error: 'Failed to fetch HTML' })
  }
})

/**
 * GET /api/sources
 * List all HTML sources
 */
app.get('/api/sources', async (req, res) => {
  try {
    const sources = await prisma.newsSource.findMany({
      where: {
        type: 'html',
      },
      orderBy: {
        name: 'asc',
      },
    })

    res.json({ data: sources })
  } catch (error: any) {
    console.error('Error fetching sources:', error)
    res.status(500).json({ error: 'Failed to fetch sources' })
  }
})

/**
 * GET /api/stats
 * Get statistics about HTML fetching
 */
app.get('/api/stats', async (req, res) => {
  try {
    const totalSources = await prisma.newsSource.count({
      where: { type: 'html' },
    })
    const enabledSources = await prisma.newsSource.count({
      where: { type: 'html', enabled: true },
    })
    
    // 获取最近 24 小时的抓取统计
    const recentDate = new Date()
    recentDate.setHours(recentDate.getHours() - 24)
    
    const recentNews = await prisma.news.count({
      where: {
        createdAt: { gte: recentDate },
        source: { type: 'html' },
      },
    })

    res.json({
      totalSources,
      enabledSources,
      recentNews,
    })
  } catch (error: any) {
    console.error('Error getting stats:', error)
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

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
      console.log(`🚀 HTML Fetcher Service running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🔄 Cron schedule: ${CRON_SCHEDULE}`)
    })

    // Set up cron job
    if (cron.validate(CRON_SCHEDULE)) {
      cron.schedule(CRON_SCHEDULE, async () => {
        console.log('🕐 Cron job triggered - fetching HTML sources...')
        try {
          await fetchAllHTML(10)
        } catch (error) {
          console.error('Error in cron job:', error)
        }
      })
      console.log(`⏰ Cron job scheduled: ${CRON_SCHEDULE}`)
    } else {
      console.error(`❌ Invalid cron schedule: ${CRON_SCHEDULE}`)
    }

    // Initial fetch on startup (optional)
    if (process.env.FETCH_ON_STARTUP === 'true') {
      console.log('🚀 Starting initial HTML fetch...')
      setTimeout(async () => {
        try {
          await fetchAllHTML(5) // 初始只抓取5条
        } catch (error) {
          console.error('Error in initial fetch:', error)
        }
      }, 5000)
    }

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
