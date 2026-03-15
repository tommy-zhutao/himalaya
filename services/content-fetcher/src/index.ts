import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { prisma } from './lib/prisma'
import { fetchFullContent, FetchContentResult } from './lib/content-fetcher'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4007
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 */6 * * *' // Every 6 hours

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'content-fetcher',
    timestamp: new Date().toISOString(),
    cronSchedule: CRON_SCHEDULE,
  })
})

/**
 * POST /api/fetch
 * Fetch full content for news that don't have content
 */
app.post('/api/fetch', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const category = req.query.category as string

    // Find news without content
    const whereClause: any = {
      OR: [
        { content: '' },
        { content: null },
      ],
    }

    if (category) {
      whereClause.category = category
    }

    const newsWithoutContent = await prisma.news.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        url: true,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`Found ${newsWithoutContent.length} news without content`)

    const results: Array<{
      id: number
      title: string
      success: boolean
      contentLength: number
      error?: string
    }> = []

    for (const news of newsWithoutContent) {
      try {
        const content = await fetchFullContent(news.url)

        if (content.success && content.content) {
          // Update news with full content
          await prisma.news.update({
            where: { id: news.id },
            data: {
              content: content.content,
              summary: content.summary || undefined,
              imageUrl: content.imageUrl || undefined,
            },
          })

          results.push({
            id: news.id,
            title: news.title,
            success: true,
            contentLength: content.content.length,
          })

          console.log(`✅ Updated: ${news.title.substring(0, 50)}...`)
        } else {
          results.push({
            id: news.id,
            title: news.title,
            success: false,
            contentLength: 0,
            error: content.error || 'Content too short',
          })
        }

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500))

      } catch (error: any) {
        results.push({
          id: news.id,
          title: news.title,
          success: false,
          contentLength: 0,
          error: error.message,
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      total: newsWithoutContent.length,
      successCount,
      failCount: newsWithoutContent.length - successCount,
      results,
    })

  } catch (error: any) {
    console.error('Error in content fetch:', error)
    res.status(500).json({ error: 'Failed to fetch content' })
  }
})

/**
 * POST /api/fetch/:newsId
 * Fetch full content for a specific news
 */
app.post('/api/fetch/:newsId', async (req, res) => {
  try {
    const newsId = parseInt(req.params.newsId)

    if (isNaN(newsId)) {
      return res.status(400).json({ error: 'Invalid news ID' })
    }

    const news = await prisma.news.findUnique({
      where: { id: newsId },
      select: { id: true, title: true, url: true },
    })

    if (!news) {
      return res.status(404).json({ error: 'News not found' })
    }

    const content = await fetchFullContent(news.url)

    if (content.success && content.content) {
      await prisma.news.update({
        where: { id: newsId },
        data: {
          content: content.content,
          summary: content.summary || undefined,
          imageUrl: content.imageUrl || undefined,
        },
      })
    }

    res.json({
      success: content.success,
      timestamp: new Date().toISOString(),
      newsId,
      title: news.title,
      contentLength: content.content?.length || 0,
      error: content.error,
    })

  } catch (error: any) {
    console.error('Error in content fetch:', error)
    res.status(500).json({ error: 'Failed to fetch content' })
  }
})

/**
 * GET /api/stats
 * Get statistics about content fetching
 */
app.get('/api/stats', async (req, res) => {
  try {
    const total = await prisma.news.count()
    const withContent = await prisma.news.count({
      where: {
        AND: [
          { content: { not: '' } },
          { content: { not: null } },
        ],
      },
    })
    const withoutContent = total - withContent

    res.json({
      total,
      withContent,
      withoutContent,
      percentage: total > 0 ? ((withContent / total) * 100).toFixed(1) : 0,
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
      console.log(`🚀 Content Fetcher Service running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🔄 Cron schedule: ${CRON_SCHEDULE}`)
    })

    // Set up cron job for automatic content fetching
    if (cron.validate(CRON_SCHEDULE)) {
      cron.schedule(CRON_SCHEDULE, async () => {
        console.log('🕐 Cron job triggered - fetching missing content...')
        try {
          // Fetch content for up to 100 news items without content
          const newsWithoutContent = await prisma.news.findMany({
            where: {
              OR: [
                { content: '' },
                { content: null },
              ],
            },
            select: { id: true, url: true },
            take: 100,
            orderBy: { createdAt: 'desc' },
          })

          for (const news of newsWithoutContent) {
            const content = await fetchFullContent(news.url)
            if (content.success && content.content) {
              await prisma.news.update({
                where: { id: news.id },
                data: {
                  content: content.content,
                  summary: content.summary || undefined,
                  imageUrl: content.imageUrl || undefined,
                },
              })
            }
            await new Promise(resolve => setTimeout(resolve, 1500))
          }

          console.log('✅ Cron job completed')
        } catch (error) {
          console.error('Error in cron job:', error)
        }
      })
      console.log(`⏰ Cron job scheduled: ${CRON_SCHEDULE}`)
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
