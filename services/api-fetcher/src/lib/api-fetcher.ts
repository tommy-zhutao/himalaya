import axios from 'axios'
import { prisma } from './prisma'
import { analyzeNews } from './ai-client'

export interface FetchResult {
  sourceId: number
  sourceName: string
  success: boolean
  itemsFetched: number
  itemsCreated: number
  itemsUpdated: number
  itemsSkipped: number  // Duplicates skipped
  errorMessage?: string
}

/**
 * Calculate title similarity using word overlap
 * Returns a value between 0 and 1 (1 = identical)
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const s1 = title1.toLowerCase().trim()
  const s2 = title2.toLowerCase().trim()
  
  if (s1 === s2) return 1
  
  const words1 = new Set(s1.split(/\s+/))
  const words2 = new Set(s2.split(/\s+/))
  
  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])
  
  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * Check for duplicate news by title similarity
 */
async function checkDuplicate(title: string, sourceId: number): Promise<{ id: number; title: string; similarity: number } | null> {
  const recentDate = new Date()
  recentDate.setDate(recentDate.getDate() - 7)
  
  const recentNews = await prisma.news.findMany({
    where: { createdAt: { gte: recentDate } },
    select: { id: true, title: true, sourceId: true },
    take: 500,
  })
  
  let bestMatch: { id: number; title: string; similarity: number } | null = null
  
  for (const news of recentNews) {
    const similarity = calculateTitleSimilarity(title, news.title)
    const threshold = news.sourceId === sourceId ? 0.6 : 0.7
    
    if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
      bestMatch = { id: news.id, title: news.title, similarity }
    }
  }
  
  return bestMatch
}

interface NewsAPIArticle {
  title: string
  description?: string
  content?: string
  url: string
  urlToImage?: string
  author?: string
  publishedAt?: string
  source?: {
    id?: string
    name: string
  }
}

interface GNewsArticle {
  title: string
  description?: string
  content?: string
  url: string
  image?: string
  author?: string
  publishedAt?: string
  source?: {
    name: string
    url: string
  }
}

/**
 * Fetch news from NewsAPI
 */
async function fetchFromNewsAPI(source: any): Promise<{ articles: any[], error?: string }> {
  const apiKey = source.config?.apiKey || process.env.NEWSAPI_KEY
  
  if (!apiKey) {
    return { articles: [], error: 'NewsAPI key not configured' }
  }

  try {
    const params = source.config?.params || {
      language: 'en',
      pageSize: 100,
    }

    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        ...params,
        apiKey,
      },
      timeout: 15000,
    })

    return { articles: response.data.articles || [] }
  } catch (error: any) {
    return { 
      articles: [], 
      error: error.response?.data?.message || error.message 
    }
  }
}

/**
 * Fetch news from GNews
 */
async function fetchFromGNews(source: any): Promise<{ articles: any[], error?: string }> {
  const apiKey = source.config?.apiKey || process.env.GNEWS_API_KEY
  
  if (!apiKey) {
    return { articles: [], error: 'GNews API key not configured' }
  }

  try {
    const params = source.config?.params || {
      lang: 'en',
      max: 100,
    }

    const response = await axios.get('https://gnews.io/api/v4/top-headlines', {
      params: {
        ...params,
        token: apiKey,
      },
      timeout: 15000,
    })

    return { articles: response.data.articles || [] }
  } catch (error: any) {
    return { 
      articles: [], 
      error: error.response?.data?.message || error.message 
    }
  }
}

/**
 * Fetch news from any configured API source
 */
async function fetchFromAPI(source: any): Promise<{ articles: any[], error?: string }> {
  const apiKey = source.config?.apiKey || source.config?.headers?.['X-API-Key']
  const headers = source.config?.headers || {}
  const params = source.config?.params || {}

  if (apiKey) {
    headers['X-API-Key'] = apiKey
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  try {
    const response = await axios.get(source.url, {
      params,
      headers,
      timeout: 15000,
    })

    // Try to extract articles from response
    let articles = response.data.articles || response.data.data || response.data.news || []
    
    // Handle nested data structures
    if (response.data.results && Array.isArray(response.data.results)) {
      articles = response.data.results
    }

    return { articles }
  } catch (error: any) {
    return { 
      articles: [], 
      error: error.response?.data?.message || error.message 
    }
  }
}

/**
 * Normalize article data from different APIs
 */
function normalizeArticle(article: any, source: any): any {
  // Handle different API response formats
  const normalized: any = {
    title: article.title || 'Untitled',
    url: article.url || article.link,
    summary: article.description || article.summary || '',
    content: article.content || '',
    author: article.author || article.source?.name || source.name,
    publishedAt: article.publishedAt || article.published_at || new Date(),
    category: source.category || 'general',
    tags: [],
    sourceId: source.id,
  }

  // Handle image URL
  normalized.imageUrl = article.urlToImage || article.image || article.imageUrl || null

  // Ensure URL exists
  if (!normalized.url) {
    return null
  }

  return normalized
}

/**
 * Fetch from a single API source
 */
export async function fetchAPISource(sourceId: number): Promise<FetchResult> {
  const source = await prisma.newsSource.findUnique({
    where: { id: sourceId },
  })

  if (!source) {
    throw new Error(`News source with id ${sourceId} not found`)
  }

  if (!source.enabled) {
    return {
      sourceId,
      sourceName: source.name,
      success: false,
      itemsFetched: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errorMessage: 'Source is disabled',
    }
  }

  const result: FetchResult = {
    sourceId,
    sourceName: source.name,
    success: true,
    itemsFetched: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsSkipped: 0,
  }

  const startTime = Date.now()

  try {
    console.log(`🔌 Fetching API: ${source.name} (${source.url})`)

    // Fetch articles based on source type
    let fetchResult: { articles: any[], error?: string }
    
    if (source.name.toLowerCase().includes('newsapi') || source.url.includes('newsapi.org')) {
      fetchResult = await fetchFromNewsAPI(source)
    } else if (source.name.toLowerCase().includes('gnews') || source.url.includes('gnews.io')) {
      fetchResult = await fetchFromGNews(source)
    } else {
      fetchResult = await fetchFromAPI(source)
    }

    if (fetchResult.error) {
      throw new Error(fetchResult.error)
    }

    const articles = fetchResult.articles

    if (!articles || articles.length === 0) {
      console.log(`⚠️  No articles found from: ${source.name}`)
      return result
    }

    result.itemsFetched = articles.length

    for (const article of articles) {
      const newsData = normalizeArticle(article, source)
      
      if (!newsData) {
        continue
      }

      // Check if news already exists (by URL)
      const existing = await prisma.news.findUnique({
        where: { url: newsData.url },
      })

      if (existing) {
        // Update existing news
        await prisma.news.update({
          where: { id: existing.id },
          data: newsData,
        })
        result.itemsUpdated++
      } else {
        // Check for duplicate by title similarity
        const duplicate = await checkDuplicate(newsData.title, source.id)
        
        if (duplicate) {
          console.log(`  🔄 Skipped duplicate (${(duplicate.similarity * 100).toFixed(0)}% similar): ${newsData.title.substring(0, 50)}...`)
          result.itemsSkipped++
          continue
        }
        
        // Create new news
        const news = await prisma.news.create({
          data: newsData,
        })
        result.itemsCreated++

        // 🤖 对新创建的新闻进行 AI 分析
        if (news.id) {
          try {
            const analysis = await analyzeNews(
              newsData.title,
              newsData.content,
              newsData.summary
            )

            if (analysis) {
              await prisma.news.update({
                where: { id: news.id },
                data: {
                  aiSummary: analysis.aiSummary,
                  keywords: analysis.keywords,
                  sentiment: analysis.sentiment,
                  category: analysis.category,
                  qualityScore: analysis.qualityScore,
                  analyzedAt: new Date(),
                },
              })
              console.log(`  🤖 AI analyzed: ${newsData.title.substring(0, 50)}...`)
            }
          } catch (aiError: any) {
            console.error(`  ⚠️  AI analysis failed for news ${news.id}:`, aiError.message)
          }
        }
      }
    }

    // Update source last fetched time and stats
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
    
    await prisma.newsSource.update({
      where: { id: sourceId },
      data: {
        lastFetchedAt: new Date(),
        fetchCount: { increment: 1 },
      },
    })

    // Create fetch log
    await prisma.fetchLog.create({
      data: {
        sourceId,
        status: 'success',
        itemsFetched: result.itemsFetched,
        itemsCreated: result.itemsCreated,
        itemsUpdated: result.itemsUpdated,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationSeconds,
      },
    })

    console.log(`✅ API fetched: ${source.name} - ${result.itemsCreated} created, ${result.itemsUpdated} updated, ${result.itemsSkipped} duplicates skipped`)

  } catch (error: any) {
    console.error(`❌ API fetch failed: ${source.name}`, error.message)
    
    result.success = false
    result.errorMessage = error.message

    // Update error count
    await prisma.newsSource.update({
      where: { id: sourceId },
      data: {
        errorCount: { increment: 1 },
      },
    })

    // Create error log
    await prisma.fetchLog.create({
      data: {
        sourceId,
        status: 'error',
        itemsFetched: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        errorMessage: error.message,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationSeconds: Math.floor((Date.now() - startTime) / 1000),
      },
    })
  }

  return result
}

/**
 * Fetch all enabled API sources
 */
export async function fetchAllAPI(): Promise<FetchResult[]> {
  console.log('🔄 Starting API fetch for all sources...')

  const sources = await prisma.newsSource.findMany({
    where: {
      type: 'api',
      enabled: true,
    },
  })

  if (sources.length === 0) {
    console.log('⚠️  No enabled API sources found')
    return []
  }

  console.log(`📋 Found ${sources.length} enabled API sources`)

  const results: FetchResult[] = []

  for (const source of sources) {
    const result = await fetchAPISource(source.id)
    results.push(result)
  }

  const totalCreated = results.reduce((sum, r) => sum + r.itemsCreated, 0)
  const totalUpdated = results.reduce((sum, r) => sum + r.itemsUpdated, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.itemsSkipped, 0)

  console.log(`\n📊 API fetch summary:`)
  console.log(`   Total sources: ${sources.length}`)
  console.log(`   Total items fetched: ${results.reduce((sum, r) => sum + r.itemsFetched, 0)}`)
  console.log(`   Total created: ${totalCreated}`)
  console.log(`   Total updated: ${totalUpdated}`)
  console.log(`   Duplicates skipped: ${totalSkipped}`)
  console.log(`   Success: ${results.filter(r => r.success).length}/${results.length}\n`)

  return results
}
