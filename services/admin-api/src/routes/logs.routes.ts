import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/admin/logs
 * List fetch logs with pagination and filtering
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const sourceId = req.query.source_id ? parseInt(req.query.source_id as string) : undefined
    const status = req.query.status as string | undefined

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (sourceId) {
      where.sourceId = sourceId
    }
    if (status) {
      where.status = status
    }

    // Get total count
    const total = await prisma.fetchLog.count({ where })

    // Get logs with pagination
    const logs = await prisma.fetchLog.findMany({
      where,
      include: {
        source: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
    })

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({
      success: false,
      error: '获取抓取日志失败',
    })
  }
})

/**
 * GET /api/admin/logs/:id
 * Get a specific fetch log by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const log = await prisma.fetchLog.findUnique({
      where: { id: parseInt(id) },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            type: true,
            url: true,
          },
        },
      },
    })

    if (!log) {
      res.status(404).json({
        success: false,
        error: '日志不存在',
      })
      return
    }

    res.json({
      success: true,
      data: log,
    })
  } catch (error) {
    console.error('Error fetching log:', error)
    res.status(500).json({
      success: false,
      error: '获取日志详情失败',
    })
  }
})

export default router
