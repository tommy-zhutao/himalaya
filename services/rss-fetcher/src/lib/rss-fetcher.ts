import Parser from 'rss-parser'
import { prisma } from '../lib/prisma'
import { analyzeNews } from './ai-client'

const parser = new Parser({
  timeout: 10000, // 10 seconds timeout
  customFields: {
    item: ['media:content', 'enclosure', 'author'],
  },
})

/**
 * Calculate title similarity using Levenshtein distance
 * Returns a value between 0 and 1 (1 = identical)
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const s1 = title1.toLowerCase().trim()
  const s2 = title2.toLowerCase().trim()
  
  if (s1 === s2) return 1
  
  const len1 = s1.length
  const len2 = s2.length
  
  if (len1 === 0 || len2 === 0) return 0
  
  // Simple word overlap for performance
  const words1 = new Set(s1.split(/\s+/))
  const words2 = new Set(s2.split(/\s+/))
  
  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}

/**
 * Check for duplicate news by title similarity
 * Returns the existing news if duplicate found, null otherwise
 */
async function checkDuplicate(title: string, sourceId: number): Promise<{ id: number; title: string; similarity: number } | null> {
  // Check recent news from the last 7 days
  const recentDate = new Date()
  recentDate.setDate(recentDate.getDate() - 7)
  
  const recentNews = await prisma.news.findMany({
    where: {
      createdAt: { gte: recentDate },
    },
    select: {
      id: true,
      title: true,
      sourceId: true,
    },
    take: 500, // Limit for performance
  })
  
  let bestMatch: { id: number; title: string; similarity: number } | null = null
  
  for (const news of recentNews) {
    const similarity = calculateTitleSimilarity(title, news.title)
    
    // Threshold: 0.7 similarity = likely duplicate
    // Same source: 0.6 threshold (more likely to be duplicate from same source)
    const threshold = news.sourceId === sourceId ? 0.6 : 0.7
    
    if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
      bestMatch = { id: news.id, title: news.title, similarity }
    }
  }
  
  return bestMatch
}

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
 * Fetch RSS feed from a source
 */
export async function fetchRSSFeed(sourceId: number): Promise<FetchResult> {
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

  try {
    console.log(`📡 Fetching RSS: ${source.name} (${source.url})`)
    const feed = await parser.parseURL(source.url)

    if (!feed.items || feed.items.length === 0) {
      console.log(`⚠️  No items found in feed: ${source.name}`)
      return result
    }

    result.itemsFetched = feed.items.length

    for (const item of feed.items) {
      if (!item.link) {
        continue
      }

      // Check if news already exists (by URL)
      const existing = await prisma.news.findUnique({
        where: { url: item.link },
      })

      const newsData: any = {
        title: item.title || 'Untitled',
        url: item.link,
        summary: (item as any).contentSnippet || (item as any).description || '',
        content: (item as any)['content:encoded'] || item.content || (item as any).contentSnippet || '',
        author: (item as any).creator || (item as any).author || feed.title || source.name,
        publishedAt: (item as any).pubDate ? new Date((item as any).pubDate) : new Date(),
        category: source.category || 'technology', // 使用新闻源的分类，而不是 RSS feed 的分类
        tags: (item as any).categories || [],
        sourceId: source.id,
      }

      // Extract image URL
      if ((item as any)['media:content']?.$?.url) {
        newsData.imageUrl = (item as any)['media:content'].$.url
      } else if ((item as any).enclosure?.url) {
        newsData.imageUrl = (item as any).enclosure.url
      }

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
            // 不阻塞主流程，继续处理其他新闻
          }
        }
      }
    }

    // Update source last fetched time and stats
    await prisma.newsSource.update({
      where: { id: sourceId },
      data: {
        lastFetchedAt: new Date(),
        fetchCount: { increment: 1 },
      },
    })

    console.log(`✅ RSS fetched: ${source.name} - ${result.itemsCreated} created, ${result.itemsUpdated} updated, ${result.itemsSkipped} duplicates skipped`)

  } catch (error: any) {
    console.error(`❌ RSS fetch failed: ${source.name}`, error.message)
    
    result.success = false
    result.errorMessage = error.message

    // Increment error count
    await prisma.newsSource.update({
      where: { id: sourceId },
      data: {
        errorCount: { increment: 1 },
      },
    })
  }

  return result
}

/**
 * Fetch all enabled RSS sources
 */
export async function fetchAllRSS(): Promise<FetchResult[]> {
  console.log('🔄 Starting RSS fetch for all sources...')

  const sources = await prisma.newsSource.findMany({
    where: {
      type: 'rss',
      enabled: true,
    },
  })

  if (sources.length === 0) {
    console.log('⚠️  No enabled RSS sources found')
    return []
  }

  console.log(`📋 Found ${sources.length} enabled RSS sources`)

  const results: FetchResult[] = []

  for (const source of sources) {
    const result = await fetchRSSFeed(source.id)
    results.push(result)
  }

  const totalCreated = results.reduce((sum, r) => sum + r.itemsCreated, 0)
  const totalUpdated = results.reduce((sum, r) => sum + r.itemsUpdated, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.itemsSkipped, 0)

  console.log(`\n📊 RSS fetch summary:`)
  console.log(`   Total sources: ${sources.length}`)
  console.log(`   Total items fetched: ${results.reduce((sum, r) => sum + r.itemsFetched, 0)}`)
  console.log(`   Total created: ${totalCreated}`)
  console.log(`   Total updated: ${totalUpdated}`)
  console.log(`   Duplicates skipped: ${totalSkipped}`)
  console.log(`   Success: ${results.filter(r => r.success).length}/${results.length}\n`)

  // Log fetch results to database
  const logId = await createFetchLog(results)

  console.log(`📝 Fetch log created: ${logId}`)

  return results
}

/**
 * Create a fetch log entry
 */
async function createFetchLog(results: FetchResult[]): Promise<number> {
  const successCount = results.filter(r => r.success).length
  const totalCount = results.length
  const itemsFetched = results.reduce((sum, r) => sum + r.itemsFetched, 0)
  const itemsCreated = results.reduce((sum, r) => sum + r.itemsCreated, 0)
  const itemsUpdated = results.reduce((sum, r) => sum + r.itemsUpdated, 0)

  const log = await prisma.fetchLog.create({
    data: {
      status: successCount === totalCount ? 'success' : 'partial_success',
      itemsFetched,
      itemsCreated,
      itemsUpdated,
      startedAt: new Date(),
      completedAt: new Date(),
      durationSeconds: Math.floor(
        results.reduce((sum, r) => sum + (r.errorMessage ? 0 : 1), 0) * 5
      ), // Rough estimate
    },
  })
  
  return log.id
}
