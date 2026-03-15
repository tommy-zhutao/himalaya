import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// All favorites routes require authentication
router.use(requireAuth)

/**
 * GET /api/users/favorites
 * Get user's favorite news list with pagination
 * Query params: page (default 1), limit (default 20)
 */
router.get('/', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.userId

    // Parse pagination params
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit

    // Get total count for pagination info
    const totalCount = await prisma.userFavorite.count({
      where: { userId },
    })

    // Get favorites with news details
    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      include: {
        news: {
          include: {
            source: {
              select: {
                id: true,
                name: true,
                type: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    })

    // Transform response
    const newsList = favorites.map((fav) => ({
      id: fav.news.id,
      title: fav.news.title,
      summary: fav.news.summary,
      content: fav.news.content,
      author: fav.news.author,
      url: fav.news.url,
      imageUrl: fav.news.imageUrl,
      category: fav.news.category,
      tags: fav.news.tags,
      publishedAt: fav.news.publishedAt,
      viewCount: fav.news.viewCount,
      likeCount: fav.news.likeCount,
      shareCount: fav.news.shareCount,
      source: fav.news.source,
      favoritedAt: fav.createdAt,
    }))

    res.json({
      data: newsList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error: any) {
    console.error('Get favorites error:', error)
    res.status(500).json({
      error: '获取收藏列表失败',
      message: error.message,
    })
  }
})

/**
 * GET /api/users/favorites/check/:id
 * Check if a news is in user's favorites
 */
router.get('/check/:id', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.userId
    const newsId = parseInt(req.params.id)

    if (isNaN(newsId)) {
      return res.status(400).json({
        error: '无效的新闻 ID',
      })
    }

    const favorite = await prisma.userFavorite.findUnique({
      where: {
        userId_newsId: {
          userId,
          newsId,
        },
      },
    })

    res.json({
      isFavorite: !!favorite,
    })
  } catch (error: any) {
    console.error('Check favorite error:', error)
    res.status(500).json({
      error: '检查收藏状态失败',
      message: error.message,
    })
  }
})

/**
 * POST /api/users/favorites/:id
 * Add a news to favorites (idempotent)
 */
router.post('/:id', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.userId
    const newsId = parseInt(req.params.id)

    if (isNaN(newsId)) {
      return res.status(400).json({
        error: '无效的新闻 ID',
      })
    }

    // Check if news exists
    const news = await prisma.news.findUnique({
      where: { id: newsId },
    })

    if (!news) {
      return res.status(404).json({
        error: '新闻不存在',
      })
    }

    // Check if already favorited (idempotent)
    const existingFavorite = await prisma.userFavorite.findUnique({
      where: {
        userId_newsId: {
          userId,
          newsId,
        },
      },
    })

    if (existingFavorite) {
      // Already favorited, return success (idempotent)
      return res.json({
        message: '已收藏',
        favorite: {
          id: existingFavorite.id,
          newsId: existingFavorite.newsId,
          createdAt: existingFavorite.createdAt,
        },
      })
    }

    // Create favorite
    const favorite = await prisma.userFavorite.create({
      data: {
        userId,
        newsId,
      },
    })

    res.status(201).json({
      message: '收藏成功',
      favorite: {
        id: favorite.id,
        newsId: favorite.newsId,
        createdAt: favorite.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Add favorite error:', error)
    res.status(500).json({
      error: '收藏失败',
      message: error.message,
    })
  }
})

/**
 * DELETE /api/users/favorites/:id
 * Remove a news from favorites
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.userId
    const newsId = parseInt(req.params.id)

    if (isNaN(newsId)) {
      return res.status(400).json({
        error: '无效的新闻 ID',
      })
    }

    // Find and delete favorite
    const favorite = await prisma.userFavorite.findUnique({
      where: {
        userId_newsId: {
          userId,
          newsId,
        },
      },
    })

    if (!favorite) {
      return res.status(404).json({
        error: '未找到该收藏',
      })
    }

    await prisma.userFavorite.delete({
      where: {
        id: favorite.id,
      },
    })

    res.json({
      message: '取消收藏成功',
    })
  } catch (error: any) {
    console.error('Remove favorite error:', error)
    res.status(500).json({
      error: '取消收藏失败',
      message: error.message,
    })
  }
})

export default router
