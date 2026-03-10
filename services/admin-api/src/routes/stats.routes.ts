import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Get total news count
    const totalNews = await prisma.news.count()

    // Get total users count
    const totalUsers = await prisma.user.count()

    // Get today's news count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayNews = await prisma.news.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    })

    // Get news sources with stats
    const sources = await prisma.newsSource.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
        lastFetchedAt: true,
        fetchCount: true,
        errorCount: true,
        _count: {
          select: {
            news: true,
            fetchLogs: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Get recent fetch logs summary
    const recentLogs = await prisma.fetchLog.findMany({
      where: {
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: {
        status: true,
        itemsFetched: true,
        itemsCreated: true,
        itemsUpdated: true,
      },
    })

    // Calculate fetch stats
    const fetchStats = {
      totalFetches: recentLogs.length,
      successful: recentLogs.filter((log) => log.status === 'success').length,
      failed: recentLogs.filter((log) => log.status === 'error').length,
      totalItemsFetched: recentLogs.reduce((sum, log) => sum + log.itemsFetched, 0),
      totalItemsCreated: recentLogs.reduce((sum, log) => sum + log.itemsCreated, 0),
      totalItemsUpdated: recentLogs.reduce((sum, log) => sum + log.itemsUpdated, 0),
    }

    // Get user stats
    const activeUsers = await prisma.user.count({
      where: {
        isActive: true,
      },
    })

    const adminCount = await prisma.user.count({
      where: {
        role: 'admin',
      },
    })

    res.json({
      success: true,
      data: {
        overview: {
          totalNews,
          totalUsers,
          todayNews,
          activeUsers,
          adminCount,
        },
        sources: sources.map((source) => ({
          id: source.id,
          name: source.name,
          type: source.type,
          enabled: source.enabled,
          lastFetchedAt: source.lastFetchedAt,
          fetchCount: source.fetchCount,
          errorCount: source.errorCount,
          newsCount: source._count.news,
          logsCount: source._count.fetchLogs,
        })),
        fetchStats,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({
      success: false,
      error: '获取统计数据失败',
    })
  }
})

export default router
