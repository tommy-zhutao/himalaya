import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/admin/news
 * Get news list with pagination and filters
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const category = req.query.category as string | undefined
    const sourceId = req.query.sourceId ? parseInt(req.query.sourceId as string) : undefined
    const search = req.query.search as string | undefined
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (category) where.category = category
    if (sourceId) where.sourceId = sourceId
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (startDate || endDate) {
      where.publishedAt = {}
      if (startDate) where.publishedAt.gte = startDate
      if (endDate) where.publishedAt.lte = endDate
    }

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        include: {
          source: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      }),
      prisma.news.count({ where }),
    ])

    res.json({
      success: true,
      data: news,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Error fetching news:', error)
    res.status(500).json({
      success: false,
      error: '获取新闻列表失败',
    })
  }
})

/**
 * GET /api/admin/news/:id
 * Get single news by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const news = await prisma.news.findUnique({
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

    if (!news) {
      return res.status(404).json({
        success: false,
        error: '新闻不存在',
      })
    }

    res.json({
      success: true,
      data: news,
    })
  } catch (error) {
    console.error('Error fetching news:', error)
    res.status(500).json({
      success: false,
      error: '获取新闻详情失败',
    })
  }
})

/**
 * PUT /api/admin/news/:id
 * Update news
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, summary, content, category, tags, imageUrl } = req.body

    // Check if news exists
    const existing = await prisma.news.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '新闻不存在',
      })
    }

    const news = await prisma.news.update({
      where: { id: parseInt(id) },
      data: {
        title: title || existing.title,
        summary: summary !== undefined ? summary : existing.summary,
        content: content !== undefined ? content : existing.content,
        category: category !== undefined ? category : existing.category,
        tags: tags !== undefined ? tags : existing.tags,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
      },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    res.json({
      success: true,
      data: news,
    })
  } catch (error) {
    console.error('Error updating news:', error)
    res.status(500).json({
      success: false,
      error: '更新新闻失败',
    })
  }
})

/**
 * DELETE /api/admin/news/:id
 * Delete news
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if news exists
    const existing = await prisma.news.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '新闻不存在',
      })
    }

    // Delete associated favorites first
    await prisma.userFavorite.deleteMany({
      where: { newsId: parseInt(id) },
    })

    // Delete news
    await prisma.news.delete({
      where: { id: parseInt(id) },
    })

    res.json({
      success: true,
      message: '新闻已删除',
    })
  } catch (error) {
    console.error('Error deleting news:', error)
    res.status(500).json({
      success: false,
      error: '删除新闻失败',
    })
  }
})

/**
 * POST /api/admin/news/:id/feature
 * Feature/unfeature news (boost view count)
 */
router.post('/:id/feature', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { featured } = req.body

    // Check if news exists
    const existing = await prisma.news.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '新闻不存在',
      })
    }

    // Boost view count for featured news
    const viewCount = featured ? existing.viewCount + 1000 : Math.max(0, existing.viewCount - 1000)

    const news = await prisma.news.update({
      where: { id: parseInt(id) },
      data: { viewCount },
    })

    res.json({
      success: true,
      data: news,
      message: featured ? '新闻已设为推荐' : '已取消推荐',
    })
  } catch (error) {
    console.error('Error featuring news:', error)
    res.status(500).json({
      success: false,
      error: '设置推荐失败',
    })
  }
})

export default router
