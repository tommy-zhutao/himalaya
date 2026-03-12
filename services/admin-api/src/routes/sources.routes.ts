import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * POST /api/admin/sources/test
 * Test a news source connection
 */
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const { url, type } = req.body

    if (!url) {
      res.status(400).json({
        success: false,
        message: 'URL 是必需的',
      })
      return
    }

    // Test the connection
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'AI-News-Hub/1.0',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        res.json({
          success: false,
          message: `HTTP 错误: ${response.status} ${response.statusText}`,
        })
        return
      }

      // For RSS, check if content is XML
      const contentType = response.headers.get('content-type') || ''
      if (type === 'rss' && !contentType.includes('xml') && !contentType.includes('rss')) {
        // Try to fetch content and check
        const text = await response.text()
        if (!text.includes('<rss') && !text.includes('<feed')) {
          res.json({
            success: false,
            message: 'URL 内容不是有效的 RSS/Atom 格式',
          })
          return
        }
      }

      res.json({
        success: true,
        message: '连接成功',
      })
    } catch (fetchError: any) {
      let message = '连接失败'
      if (fetchError.name === 'TimeoutError' || fetchError.message?.includes('timeout')) {
        message = '连接超时，请检查 URL 是否可访问'
      } else if (fetchError.code === 'ENOTFOUND') {
        message = '域名不存在'
      } else if (fetchError.code === 'ECONNREFUSED') {
        message = '连接被拒绝'
      }
      res.json({
        success: false,
        message,
      })
    }
  } catch (error) {
    console.error('Error testing source:', error)
    res.status(500).json({
      success: false,
      message: '测试失败',
    })
  }
})

/**
 * GET /api/admin/sources
 * List all news sources
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const sources = await prisma.newsSource.findMany({
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      success: true,
      data: sources,
    })
  } catch (error) {
    console.error('Error fetching sources:', error)
    res.status(500).json({
      success: false,
      error: '获取新闻源失败',
    })
  }
})

/**
 * POST /api/admin/sources
 * Create a new news source
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, url, category, enabled } = req.body

    // Validate required fields
    if (!name || !type || !url) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段: name, type, url',
      })
      return
    }

    // Check if URL already exists
    const existing = await prisma.newsSource.findUnique({
      where: { url },
    })

    if (existing) {
      res.status(400).json({
        success: false,
        error: '该 URL 已存在',
      })
      return
    }

    const source = await prisma.newsSource.create({
      data: {
        name,
        type,
        url,
        category: category || null,
        enabled: enabled !== undefined ? enabled : true,
      },
    })

    res.status(201).json({
      success: true,
      data: source,
    })
  } catch (error) {
    console.error('Error creating source:', error)
    res.status(500).json({
      success: false,
      error: '创建新闻源失败',
    })
  }
})

/**
 * PUT /api/admin/sources/:id
 * Update a news source
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, type, url, category, enabled } = req.body

    // Check if source exists
    const existing = await prisma.newsSource.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existing) {
      res.status(404).json({
        success: false,
        error: '新闻源不存在',
      })
      return
    }

    // If URL is being changed, check for duplicates
    if (url && url !== existing.url) {
      const duplicateUrl = await prisma.newsSource.findUnique({
        where: { url },
      })
      if (duplicateUrl) {
        res.status(400).json({
          success: false,
          error: '该 URL 已被其他新闻源使用',
        })
        return
      }
    }

    const source = await prisma.newsSource.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existing.name,
        type: type || existing.type,
        url: url || existing.url,
        category: category !== undefined ? category : existing.category,
        enabled: enabled !== undefined ? enabled : existing.enabled,
      },
    })

    res.json({
      success: true,
      data: source,
    })
  } catch (error) {
    console.error('Error updating source:', error)
    res.status(500).json({
      success: false,
      error: '更新新闻源失败',
    })
  }
})

/**
 * DELETE /api/admin/sources/:id
 * Delete a news source
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if source exists
    const existing = await prisma.newsSource.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existing) {
      res.status(404).json({
        success: false,
        error: '新闻源不存在',
      })
      return
    }

    await prisma.newsSource.delete({
      where: { id: parseInt(id) },
    })

    res.json({
      success: true,
      message: '新闻源已删除',
    })
  } catch (error) {
    console.error('Error deleting source:', error)
    res.status(500).json({
      success: false,
      error: '删除新闻源失败',
    })
  }
})

export default router
