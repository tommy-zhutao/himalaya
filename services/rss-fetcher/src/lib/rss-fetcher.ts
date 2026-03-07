import Parser from 'rss-parser'
import { prisma } from '../lib/prisma'

const parser = new Parser({
  timeout: 10000, // 10 seconds timeout
  customFields: {
    item: ['media:content', 'enclosure', 'author'],
  },
})

export interface FetchResult {
  sourceId: number
  sourceName: string
  success: boolean
  itemsFetched: number
  itemsCreated: number
  itemsUpdated: number
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
        category: (item as any).categories?.[0] || source.category,
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
        // Create new news
        await prisma.news.create({
          data: newsData,
        })
        result.itemsCreated++
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

    console.log(`✅ RSS fetched: ${source.name} - ${result.itemsCreated} created, ${result.itemsUpdated} updated`)

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

  console.log(`\n📊 RSS fetch summary:`)
  console.log(`   Total sources: ${sources.length}`)
  console.log(`   Total items fetched: ${results.reduce((sum, r) => sum + r.itemsFetched, 0)}`)
  console.log(`   Total created: ${totalCreated}`)
  console.log(`   Total updated: ${totalUpdated}`)
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
