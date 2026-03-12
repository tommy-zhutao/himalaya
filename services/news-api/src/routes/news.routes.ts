import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { get, set, initRedis, closeRedis } from '../cache/redis'

const router = Router()

// Initialize Redis on module load
initRedis()

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  LIST: 5 * 60,      // 5 minutes
  DETAIL: 10 * 60,   // 10 minutes
  SEARCH: 2 * 60,    // 2 minutes
  HOT: 5 * 60,       // 5 minutes
  RELATED: 5 * 60,   // 5 minutes
}

/**
 * Generate cache key for news list
 */
function getListCacheKey(page: number, limit: number, category: string | undefined, sort: string): string {
  return `news:list:${page}:${limit}:${category || 'all'}:${sort}`
}

/**
 * GET /api/news/search
 * Search news by title, summary or content
 *
 * Query params:
 * - q: search query (required)
 * - page: page number (default: 1)
 * - limit: items per page (default: 20)
 * - category: filter by category (optional)
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query

    if (!q || typeof q !== 'string' || q.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' })
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const category = req.query.category as string | undefined

    // Try to get from cache
    const cacheKey = `news:search:${q}:${page}:${limit}:${category || 'all'}`
    const cached = await get<any>(cacheKey)
    if (cached) {
      console.log(`[Cache] hit: ${cacheKey}`)
      return res.json(cached)
    }
    console.log(`[Cache] miss: ${cacheKey}`)

    const skip = (page - 1) * limit

    // Build where clause with full-text search
    const where: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ],
    }

    if (category) where.category = category

    // Fetch search results
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

    const result = {
      query: q,
      data: news,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }

    // Cache the result
    await set(cacheKey, result, CACHE_TTL.SEARCH)

    res.json(result)
  } catch (error) {
    console.error('Error searching news:', error)
    res.status(500).json({ error: 'Failed to search news' })
  }
})

/**
 * GET /api/news/hot
 * Get hot news (most viewed)
 */
router.get('/hot', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)
    const days = parseInt(req.query.days as string) || 7

    // Try to get from cache
    const cacheKey = `news:hot:${limit}:${days}`
    const cached = await get<any>(cacheKey)
    if (cached) {
      console.log(`[Cache] hit: ${cacheKey}`)
      return res.json(cached)
    }
    console.log(`[Cache] miss: ${cacheKey}`)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const news = await prisma.news.findMany({
      where: {
        publishedAt: {
          gte: startDate,
        },
      },
      orderBy: { viewCount: 'desc' },
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
    })

    const result = { data: news }

    // Cache the result
    await set(cacheKey, result, CACHE_TTL.HOT)

    res.json(result)
  } catch (error) {
    console.error('Error fetching hot news:', error)
    res.status(500).json({ error: 'Failed to fetch hot news' })
  }
})

/**
 * GET /api/news/related/:id
 * Get related news by category or source
 */
router.get('/related/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20)

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid news ID' })
    }

    // Try to get from cache
    const cacheKey = `news:related:${id}:${limit}`
    const cached = await get<any>(cacheKey)
    if (cached) {
      console.log(`[Cache] hit: ${cacheKey}`)
      return res.json(cached)
    }
    console.log(`[Cache] miss: ${cacheKey}`)

    // Get original news first
    const original = await prisma.news.findUnique({
      where: { id },
    })

    if (!original) {
      return res.status(404).json({ error: 'News not found' })
    }

    // Build where clause for related news
    const where: any = {
      id: { not: id }, // Exclude original news
    }

    // Try to find related news by category first
    if (original.category) {
      where.category = original.category
    } else if (original.sourceId) {
      // Fallback to same source
      where.sourceId = original.sourceId
    }

    // If neither category nor source is available, return empty
    if (!where.category && !where.sourceId) {
      const emptyResult = { data: [] }
      await set(cacheKey, emptyResult, CACHE_TTL.RELATED)
      return res.json(emptyResult)
    }

    const related = await prisma.news.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
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
    })

    const result = { data: related }

    // Cache the result
    await set(cacheKey, result, CACHE_TTL.RELATED)

    res.json(result)
  } catch (error) {
    console.error('Error fetching related news:', error)
    res.status(500).json({ error: 'Failed to fetch related news' })
  }
})

/**
 * GET /api/news
 * Get news list with pagination, filtering, and sorting
 *
 * Query params:
 * - page: page number (default: 1)
 * - limit: items per page (default: 20)
 * - category: filter by category (optional)
 * - sourceId: filter by source id (optional)
 * - sort: sort by 'latest' or 'hot' (default: 'latest')
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100) // Max 100
    const category = req.query.category as string | undefined
    const sourceId = req.query.sourceId ? parseInt(req.query.sourceId as string) : undefined
    const sort = (req.query.sort as string) || 'latest'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (category) where.category = category
    if (sourceId) where.sourceId = sourceId

    // Build order by clause
    const orderBy: any = {}
    if (sort === 'hot') {
      orderBy.viewCount = 'desc'
    } else {
      orderBy.publishedAt = 'desc'
    }

    // Try to get from cache
    const cacheKey = getListCacheKey(page, limit, category, sort)
    const cached = await get<any>(cacheKey)
    if (cached) {
      console.log(`[Cache] hit: ${cacheKey}`)
      return res.json(cached)
    }
    console.log(`[Cache] miss: ${cacheKey}`)

    // Fetch news with pagination
    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy,
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

    const result = {
      data: news,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }

    // Cache the result
    await set(cacheKey, result, CACHE_TTL.LIST)

    res.json(result)
  } catch (error) {
    console.error('Error fetching news:', error)
    res.status(500).json({ error: 'Failed to fetch news' })
  }
})

/**
 * GET /api/news/:id
 * Get single news by id
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid news ID' })
    }

    // Try to get from cache
    const cacheKey = `news:detail:${id}`
    const cached = await get<any>(cacheKey)
    if (cached) {
      console.log(`[Cache] hit: ${cacheKey}`)
      // Still increment view count even for cached results
      await prisma.news.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }).catch(() => {}) // Ignore errors
      return res.json(cached)
    }
    console.log(`[Cache] miss: ${cacheKey}`)

    const news = await prisma.news.findUnique({
      where: { id },
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
      return res.status(404).json({ error: 'News not found' })
    }

    // Increment view count
    await prisma.news.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    const result = { data: news }

    // Cache the result
    await set(cacheKey, result, CACHE_TTL.DETAIL)

    res.json(result)
  } catch (error) {
    console.error('Error fetching news detail:', error)
    res.status(500).json({ error: 'Failed to fetch news detail' })
  }
})

export default router
