import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { prisma } from './lib/prisma'
import { fetchAllAPI, fetchAPISource } from './lib/api-fetcher'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4005
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 * * * *' // Every hour

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
    service: 'api-fetcher',
    timestamp: new Date().toISOString(),
    cronSchedule: CRON_SCHEDULE,
  })
})

/**
 * POST /api/fetch
 * Manually trigger API fetch for all sources
 */
app.post('/api/fetch', async (req, res) => {
  try {
    const results = await fetchAllAPI()
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: any) {
    console.error('Error in manual fetch:', error)
    res.status(500).json({ error: 'Failed to fetch from API sources' })
  }
})

/**
 * POST /api/fetch/:sourceId
 * Manually trigger API fetch for a specific source
 */
app.post('/api/fetch/:sourceId', async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId)

    if (isNaN(sourceId)) {
      return res.status(400).json({ error: 'Invalid source ID' })
    }

    const result = await fetchAPISource(sourceId)
    res.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error: any) {
    console.error('Error in manual fetch:', error)
    res.status(500).json({ error: 'Failed to fetch from API source' })
  }
})

/**
 * GET /api/sources
 * List all API sources
 */
app.get('/api/sources', async (req, res) => {
  try {
    const sources = await prisma.newsSource.findMany({
      where: {
        type: 'api',
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Hide sensitive config data
    const safeSources = sources.map(s => ({
      id: s.id,
      name: s.name,
      url: s.url,
      category: s.category,
      enabled: s.enabled,
      lastFetchedAt: s.lastFetchedAt,
      fetchCount: s.fetchCount,
      errorCount: s.errorCount,
    }))

    res.json({ data: safeSources })
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
      where: {
        source: {
          type: 'api',
        },
      },
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
      console.log(`🚀 API Fetcher Service running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🔄 Cron schedule: ${CRON_SCHEDULE}`)
    })

    // Set up cron job
    if (cron.validate(CRON_SCHEDULE)) {
      cron.schedule(CRON_SCHEDULE, async () => {
        console.log('🕐 Cron job triggered')
        try {
          await fetchAllAPI()
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
      console.log('🚀 Starting initial API fetch...')
      setTimeout(async () => {
        try {
          await fetchAllAPI()
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
