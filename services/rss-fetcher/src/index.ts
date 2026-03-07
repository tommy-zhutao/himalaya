import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { prisma } from './lib/prisma'
import { fetchAllRSS, fetchRSSFeed } from './lib/rss-fetcher'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4004
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/15 * * * *' // Every 15 minutes

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
    service: 'rss-fetcher',
    timestamp: new Date().toISOString(),
    cronSchedule: CRON_SCHEDULE,
  })
})

/**
 * POST /api/fetch
 * Manually trigger RSS fetch for all sources
 */
app.post('/api/fetch', async (req, res) => {
  try {
    const results = await fetchAllRSS()
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: any) {
    console.error('Error in manual fetch:', error)
    res.status(500).json({ error: 'Failed to fetch RSS' })
  }
})

/**
 * POST /api/fetch/:sourceId
 * Manually trigger RSS fetch for a specific source
 */
app.post('/api/fetch/:sourceId', async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId)

    if (isNaN(sourceId)) {
      return res.status(400).json({ error: 'Invalid source ID' })
    }

    const result = await fetchRSSFeed(sourceId)
    res.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error: any) {
    console.error('Error in manual fetch:', error)
    res.status(500).json({ error: 'Failed to fetch RSS' })
  }
})

/**
 * GET /api/sources
 * List all RSS sources
 */
app.get('/api/sources', async (req, res) => {
  try {
    const sources = await prisma.newsSource.findMany({
      where: {
        type: 'rss',
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
 * GET /api/logs
 * Get recent fetch logs
 */
app.get('/api/logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

    const logs = await prisma.fetchLog.findMany({
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    })

    res.json({ data: logs })
  } catch (error: any) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ error: 'Failed to fetch logs' })
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
      console.log(`🚀 RSS Fetcher Service running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🔄 Cron schedule: ${CRON_SCHEDULE}`)
    })

    // Set up cron job
    if (cron.validate(CRON_SCHEDULE)) {
      cron.schedule(CRON_SCHEDULE, async () => {
        console.log('🕐 Cron job triggered')
        try {
          await fetchAllRSS()
        } catch (error) {
          console.error('Error in cron job:', error)
        }
      })
      console.log(`⏰ Cron job scheduled: ${CRON_SCHEDULE}`)
    } else {
      console.error(`❌ Invalid cron schedule: ${CRON_SCHEDULE}`)
    }

    // Initial fetch on startup (optional, can be disabled)
    if (process.env.FETCH_ON_STARTUP !== 'false') {
      console.log('🚀 Starting initial RSS fetch...')
      setTimeout(async () => {
        try {
          await fetchAllRSS()
        } catch (error) {
          console.error('Error in initial fetch:', error)
        }
      }, 5000) // Wait 5 seconds after startup
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
