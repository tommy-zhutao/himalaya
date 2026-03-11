import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cron from 'node-cron'
import Redis from 'ioredis'
import {
  defaultConfig,
  triggerRSSFetch,
  triggerAPIFetch,
  triggerAllFetchers,
  checkFetchersHealth,
} from './lib/scheduler'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4006
const SCHEDULER_ID = process.env.SCHEDULER_ID || 'scheduler-1'

// Redis for distributed lock and state
let redis: Redis | null = null

// Scheduler config
const config = {
  ...defaultConfig,
  rssFetcherUrl: process.env.RSS_FETCHER_URL || 'http://rss-fetcher:4004',
  apiFetcherUrl: process.env.API_FETCHER_URL || 'http://api-fetcher:4005',
  rssCronSchedule: process.env.RSS_CRON_SCHEDULE || '*/15 * * * *',
  apiCronSchedule: process.env.API_CRON_SCHEDULE || '0 * * * *',
}

// Middleware
app.use(cors())
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', async (req, res) => {
  const fetchersHealth = await checkFetchersHealth(config)
  
  res.json({
    status: 'ok',
    service: 'scheduler',
    schedulerId: SCHEDULER_ID,
    timestamp: new Date().toISOString(),
    config: {
      rssCron: config.rssCronSchedule,
      apiCron: config.apiCronSchedule,
    },
    fetchers: fetchersHealth,
  })
})

/**
 * POST /api/schedule/rss
 * Manually trigger RSS fetch
 */
app.post('/api/schedule/rss', async (req, res) => {
  try {
    const result = await triggerRSSFetch(config)
    res.json(result)
  } catch (error: any) {
    console.error('Error triggering RSS fetch:', error)
    res.status(500).json({ error: 'Failed to trigger RSS fetch' })
  }
})

/**
 * POST /api/schedule/api
 * Manually trigger API fetch
 */
app.post('/api/schedule/api', async (req, res) => {
  try {
    const result = await triggerAPIFetch(config)
    res.json(result)
  } catch (error: any) {
    console.error('Error triggering API fetch:', error)
    res.status(500).json({ error: 'Failed to trigger API fetch' })
  }
})

/**
 * POST /api/schedule/all
 * Manually trigger all fetchers
 */
app.post('/api/schedule/all', async (req, res) => {
  try {
    const results = await triggerAllFetchers(config)
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: any) {
    console.error('Error triggering all fetchers:', error)
    res.status(500).json({ error: 'Failed to trigger fetchers' })
  }
})

/**
 * GET /api/schedule/status
 * Get scheduler status
 */
app.get('/api/schedule/status', async (req, res) => {
  const fetchersHealth = await checkFetchersHealth(config)
  
  res.json({
    schedulerId: SCHEDULER_ID,
    config: {
      rssFetcherUrl: config.rssFetcherUrl,
      apiFetcherUrl: config.apiFetcherUrl,
      rssCronSchedule: config.rssCronSchedule,
      apiCronSchedule: config.apiCronSchedule,
    },
    fetchers: fetchersHealth,
    redis: redis ? 'connected' : 'not configured',
  })
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

// Distributed lock helper
async function acquireLock(key: string, ttl: number = 60): Promise<boolean> {
  if (!redis) return true // No Redis, skip locking
  
  const lockKey = `scheduler:lock:${key}`
  const result = await redis.set(lockKey, SCHEDULER_ID, 'EX', ttl, 'NX')
  return result === 'OK'
}

async function releaseLock(key: string): Promise<void> {
  if (!redis) return
  
  const lockKey = `scheduler:lock:${key}`
  await redis.del(lockKey)
}

// Start server
async function start() {
  try {
    // Initialize Redis if configured
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL)
      redis.on('connect', () => console.log('✅ Redis connected'))
      redis.on('error', (err) => console.error('Redis error:', err))
    }

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Scheduler Service running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`📡 RSS Fetcher: ${config.rssFetcherUrl}`)
      console.log(`🔌 API Fetcher: ${config.apiFetcherUrl}`)
    })

    // Set up RSS cron job
    if (cron.validate(config.rssCronSchedule)) {
      cron.schedule(config.rssCronSchedule, async () => {
        console.log('🕐 RSS cron job triggered')
        
        const locked = await acquireLock('rss-fetch', 300) // 5 min lock
        if (!locked) {
          console.log('⚠️  RSS fetch already in progress, skipping')
          return
        }
        
        try {
          await triggerRSSFetch(config)
        } catch (error) {
          console.error('Error in RSS cron job:', error)
        } finally {
          await releaseLock('rss-fetch')
        }
      })
      console.log(`⏰ RSS cron job scheduled: ${config.rssCronSchedule}`)
    } else {
      console.error(`❌ Invalid RSS cron schedule: ${config.rssCronSchedule}`)
    }

    // Set up API cron job
    if (cron.validate(config.apiCronSchedule)) {
      cron.schedule(config.apiCronSchedule, async () => {
        console.log('🕐 API cron job triggered')
        
        const locked = await acquireLock('api-fetch', 300) // 5 min lock
        if (!locked) {
          console.log('⚠️  API fetch already in progress, skipping')
          return
        }
        
        try {
          await triggerAPIFetch(config)
        } catch (error) {
          console.error('Error in API cron job:', error)
        } finally {
          await releaseLock('api-fetch')
        }
      })
      console.log(`⏰ API cron job scheduled: ${config.apiCronSchedule}`)
    } else {
      console.error(`❌ Invalid API cron schedule: ${config.apiCronSchedule}`)
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  if (redis) await redis.quit()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  if (redis) await redis.quit()
  process.exit(0)
})

start()
