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
 * Calculate Jaccard similarity between two keyword arrays
 * Jaccard similarity = |A ∩ B| / |A ∪ B|
 */
function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
  if (!keywords1?.length || !keywords2?.length) return 0

  const set1 = new Set(keywords1.map(k => k.toLowerCase()))
  const set2 = new Set(keywords2.map(k => k.toLowerCase()))

  const intersection = new Set([...set1].filter(k => set2.has(k)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

/**
 * GET /api/news/recommendations
 * Get personalized recommendations based on user's reading history
 * Requires authentication via API Gateway (X-User-Id header)
 */
router.get('/recommendations', async (req, res) => {
  try {
    // Get user ID from header (set by API Gateway after auth)
    // Support both x-user-id (lowercase) and X-User-Id (capitalized)
    const userId = req.headers['x-user-id'] || req.headers['X-User-Id']
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20)

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Try to get from cache
    const cacheKey = `news:recommendations:${userId}:${limit}`
    const cached = await get<any>(cacheKey)
    if (cached) {
      console.log(`[Cache] hit: ${cacheKey}`)
      return res.json(cached)
    }
    console.log(`[Cache] miss: ${cacheKey}`)

    // Get user's reading history (recent 50 articles)
    const readHistory = await prisma.userReadHistory.findMany({
      where: { userId: Number(userId) },
      orderBy: { readAt: 'desc' },
      take: 50,
      include: {
        news: {
          select: {
            id: true,
            keywords: true,
            category: true,
            sourceId: true,
          },
        },
      },
    })

    // Get user's favorites (they indicate strong interest)
    const favorites = await prisma.userFavorite.findMany({
      where: { userId: Number(userId) },
      include: {
        news: {
          select: {
            id: true,
            keywords: true,
            category: true,
            sourceId: true,
          },
        },
      },
    })

    // Build user interest profile
    const readNewsIds = new Set(readHistory.map(h => h.newsId))
    const favoriteNewsIds = new Set(favorites.map(f => f.newsId))
    const allReadNewsIds = new Set([...readNewsIds, ...favoriteNewsIds])

    // Extract user's preferred keywords
    const keywordCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}
    const sourceCounts: Record<string, number> = {}

    // Weight favorites more heavily
    const processNews = (news: any, weight: number) => {
      const keywords = (news.keywords as string[]) || []
      keywords.forEach(k => {
        keywordCounts[k.toLowerCase()] = (keywordCounts[k.toLowerCase()] || 0) + weight
      })
      if (news.category) {
        categoryCounts[news.category] = (categoryCounts[news.category] || 0) + weight
      }
      if (news.sourceId) {
        sourceCounts[news.sourceId] = (sourceCounts[news.sourceId] || 0) + weight
      }
    }

    readHistory.forEach(h => processNews(h.news, 1))
    favorites.forEach(f => processNews(f.news, 3)) // Favorites have 3x weight

    // Get top keywords
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k]) => k)

    // If no reading history, return hot news
    if (allReadNewsIds.size === 0) {
      const hotNews = await prisma.news.findMany({
        where: { publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { viewCount: 'desc' },
        take: limit,
        include: {
          source: { select: { id: true, name: true, type: true } },
        },
      })
      const result = { data: hotNews, reason: 'hot' }
      await set(cacheKey, result, CACHE_TTL.HOT)
      return res.json(result)
    }

    // Find candidate news (exclude already read)
    const candidates = await prisma.news.findMany({
      where: {
        id: { notIn: [...allReadNewsIds] },
        publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      take: 200,
      include: {
        source: { select: { id: true, name: true, type: true } },
      },
    })

    // Score candidates
    const scoredNews = candidates.map(news => {
      const newsKeywords = ((news.keywords as string[]) || []).map(k => k.toLowerCase())
      let score = 0

      // 1. Keyword match (weight: 0.5)
      if (topKeywords.length > 0 && newsKeywords.length > 0) {
        const matchedKeywords = newsKeywords.filter(k => topKeywords.includes(k))
        score += (matchedKeywords.length / Math.min(topKeywords.length, newsKeywords.length)) * 0.5
      }

      // 2. Category preference (weight: 0.3)
      if (news.category && categoryCounts[news.category]) {
        const maxCategoryCount = Math.max(...Object.values(categoryCounts))
        score += (categoryCounts[news.category] / maxCategoryCount) * 0.3
      }

      // 3. Source preference (weight: 0.2)
      if (news.sourceId && sourceCounts[news.sourceId]) {
        const maxSourceCount = Math.max(...Object.values(sourceCounts))
        score += (sourceCounts[news.sourceId] / maxSourceCount) * 0.2
      }

      // 4. Quality bonus
      if (news.qualityScore && news.qualityScore > 80) {
        score += 0.1
      }

      // 5. Recency bonus
      const daysSincePublished = news.publishedAt
        ? (Date.now() - new Date(news.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
        : 30
      if (daysSincePublished < 1) score += 0.1
      else if (daysSincePublished < 3) score += 0.05

      return { news, score }
    })

    // Sort by score and take top results
    const recommendations = scoredNews
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.news)

    const result = { data: recommendations, reason: 'personalized' }

    // Cache for 5 minutes
    await set(cacheKey, result, CACHE_TTL.RELATED)

    res.json(result)
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    res.status(500).json({ error: 'Failed to fetch recommendations' })
  }
})

/**
 * POST /api/news/:id/read
 * Record that user has read a news article
 */
router.post('/:id/read', async (req, res) => {
  try {
    const newsId = parseInt(req.params.id)
    const userId = req.headers['x-user-id']
    const duration = req.body.duration // Optional: reading duration in seconds

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (isNaN(newsId)) {
      return res.status(400).json({ error: 'Invalid news ID' })
    }

    // Check if news exists
    const news = await prisma.news.findUnique({ where: { id: newsId } })
    if (!news) {
      return res.status(404).json({ error: 'News not found' })
    }

    // Upsert read history
    await prisma.userReadHistory.upsert({
      where: {
        userId_newsId: {
          userId: Number(userId),
          newsId,
        },
      },
      update: {
        readAt: new Date(),
        duration: duration || undefined,
      },
      create: {
        userId: Number(userId),
        newsId,
        duration: duration || undefined,
      },
    })

    res.json({ success: true, message: 'Read history recorded' })
  } catch (error) {
    console.error('Error recording read history:', error)
    res.status(500).json({ error: 'Failed to record read history' })
  }
})

/**
 * GET /api/news/trending-topics
 * Get trending topics based on keyword frequency
 */
router.get('/trending-topics', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30)
    const days = parseInt(req.query.days as string) || 3

    // Try to get from cache
    const cacheKey = `news:trending:${limit}:${days}`
    const cached = await get<any>(cacheKey)
    if (cached) {
      console.log(`[Cache] hit: ${cacheKey}`)
      return res.json(cached)
    }
    console.log(`[Cache] miss: ${cacheKey}`)

    // Get recent news with keywords
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const recentNews = await prisma.news.findMany({
      where: {
        publishedAt: { gte: startDate },
        NOT: { keywords: { equals: [] } },
      },
      select: {
        id: true,
        title: true,
        keywords: true,
        category: true,
        viewCount: true,
        publishedAt: true,
      },
      take: 500,
    })

    // Count keyword frequency
    const keywordCounts: Record<string, { count: number; newsIds: number[]; totalViews: number }> = {}

    for (const news of recentNews) {
      const keywords = (news.keywords as string[]) || []
      for (const keyword of keywords) {
        const key = keyword.toLowerCase()
        if (!keywordCounts[key]) {
          keywordCounts[key] = { count: 0, newsIds: [], totalViews: 0 }
        }
        keywordCounts[key].count++
        keywordCounts[key].newsIds.push(news.id)
        keywordCounts[key].totalViews += news.viewCount || 0
      }
    }

    // Score topics by frequency and views
    const topics = Object.entries(keywordCounts)
      .map(([keyword, data]) => ({
        keyword,
        count: data.count,
        avgViews: Math.round(data.totalViews / data.count),
        score: data.count * 0.6 + (data.totalViews / data.count) * 0.4,
        newsIds: data.newsIds.slice(0, 5), // Top 5 related news
      }))
      .filter(t => t.count >= 2) // At least 2 occurrences
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    const result = {
      data: topics,
      period: { days, start: startDate, end: new Date() },
      total: topics.length,
    }

    // Cache for 10 minutes
    await set(cacheKey, result, CACHE_TTL.RELATED)

    res.json(result)
  } catch (error) {
    console.error('Error fetching trending topics:', error)
    res.status(500).json({ error: 'Failed to fetch trending topics' })
  }
})

/**
 * GET /api/news/related/:id
 * Get related news by keywords similarity, category, and source
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

    // Get candidate news (same category, source, or recent)
    const candidates = await prisma.news.findMany({
      where: {
        id: { not: id },
        OR: [
          ...(original.category ? [{ category: original.category }] : []),
          ...(original.sourceId ? [{ sourceId: original.sourceId }] : []),
          { publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Recent 7 days
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 100, // Get more candidates for similarity calculation
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

    // Get original keywords
    const originalKeywords = (original.keywords as string[]) || []

    // Calculate similarity scores
    const scoredNews = candidates.map(news => {
      const newsKeywords = (news.keywords as string[]) || []
      let score = 0

      // 1. Keyword similarity (weight: 0.5)
      if (originalKeywords.length > 0 && newsKeywords.length > 0) {
        score += calculateKeywordSimilarity(originalKeywords, newsKeywords) * 0.5
      }

      // 2. Same category (weight: 0.3)
      if (original.category && news.category === original.category) {
        score += 0.3
      }

      // 3. Same source (weight: 0.2)
      if (original.sourceId && news.sourceId === original.sourceId) {
        score += 0.2
      }

      // 4. Bonus for quality score
      if (news.qualityScore && news.qualityScore > 70) {
        score += 0.1
      }

      return { news, score }
    })

    // Sort by score and take top results
    const related = scoredNews
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.news)

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
