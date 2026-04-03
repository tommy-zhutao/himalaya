import axios from 'axios'
import * as cheerio from 'cheerio'
import iconv from 'iconv-lite'
import { prisma } from './prisma'
import { analyzeNews } from './ai-client'

// AI 关键词（用于过滤）
const AI_KEYWORDS = [
  // 核心 AI 术语
  'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'dl',
  'neural network', 'transformer', 'llm', 'generative ai', 'aigc',
  'chatbot', 'gpt', 'bert', 'llama', 'claude', 'gemini', 'qwen',
  // 中文
  '人工智能', '机器学习', '深度学习', '神经网络', '大模型', '语言模型',
  '生成式ai', 'chatgpt', '文心一言', '通义千问', '智谱', 'deepseek',
  '自动驾驶', '计算机视觉', '自然语言处理', 'nlp', 'cv',
  // 应用
  'chatgpt', 'openai', 'anthropic', 'deepmind', 'hugging face',
  'stability ai', 'midjourney', 'dall-e', 'whisper',
]

// 排除关键词
const EXCLUDE_KEYWORDS = [
  '招聘', '求职', 'hiring', 'job', 'career', 'resume',
  '广告', '推广', 'advertisement', 'sponsored',
  '会议', 'conference', 'summit', 'webinar', 'event',
]

// 新闻选择器（优先级从高到低）
const NEWS_SELECTORS = [
  // 标题链接
  'h1 a', 'h2 a', 'h3 a', 'h4 a',
  // 文章区域
  'article a', '.article a', '.post a', '.news a', '.content a',
  // 列表项
  '.list-item a', '.item a', '.entry a',
  // 通用
  'a[href]',
]

// 网站特定选择器
const SITE_SELECTORS: Record<string, { titleSelector: string; linkSelector: string }> = {
  'qbitai.com': { titleSelector: '.article-title, h2, h3', linkSelector: 'a' },
  'leiphone.com': { titleSelector: '.title, h2, h3', linkSelector: 'a' },
  'jiqizhixin.com': { titleSelector: '.title, h2, h3', linkSelector: 'a' },
  '36kr.com': { titleSelector: '.article-item-title, h2, h3', linkSelector: 'a' },
  'huxiu.com': { titleSelector: '.article-title, h2, h3', linkSelector: 'a' },
  'infoq.cn': { titleSelector: '.article-title, h2, h3', linkSelector: 'a' },
  'geekpark.net': { titleSelector: '.title, h2, h3', linkSelector: 'a' },
  'ithome.com': { titleSelector: '.title, h2, h3', linkSelector: 'a' },
}

export interface FetchResult {
  sourceId: number
  sourceName: string
  success: boolean
  itemsFetched: number
  itemsCreated: number
  itemsUpdated: number
  itemsSkipped: number
  errorMessage?: string
}

/**
 * 检测并解码响应内容（处理中文编码）
 */
function decodeResponse(buffer: Buffer, contentType?: string): string {
  // 尝试从 content-type 获取编码
  if (contentType) {
    const charsetMatch = contentType.match(/charset=([^;]+)/i)
    if (charsetMatch) {
      const charset = charsetMatch[1].trim().toLowerCase()
      try {
        if (charset === 'gbk' || charset === 'gb2312' || charset === 'gb18030') {
          return iconv.decode(buffer, 'gb18030')
        }
        return buffer.toString(charset as BufferEncoding)
      } catch {}
    }
  }

  // 尝试检测编码
  // 检查 BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString('utf-8')
  }

  // 尝试常见编码
  const encodings = ['utf-8', 'gb18030', 'gbk', 'gb2312', 'big5', 'iso-8859-1']
  for (const encoding of encodings) {
    try {
      const decoded = encoding === 'gb18030' || encoding === 'gbk' || encoding === 'gb2312'
        ? iconv.decode(buffer, encoding)
        : buffer.toString(encoding as BufferEncoding)
      
      // 检查是否有乱码
      if (!decoded.includes('�')) {
        return decoded
      }
    } catch {}
  }

  return buffer.toString('utf-8')
}

/**
 * 检查是否为 AI 相关新闻
 */
function isAIRelated(title: string): boolean {
  const titleLower = title.toLowerCase()
  
  // 检查排除关键词
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return false
    }
  }

  // 检查 AI 关键词
  for (const keyword of AI_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return true
    }
  }

  return false
}

/**
 * 计算标题相似度
 */
function calculateSimilarity(title1: string, title2: string): number {
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
 * 检查重复新闻
 */
async function checkDuplicate(title: string): Promise<{ id: number; title: string } | null> {
  const recentDate = new Date()
  recentDate.setDate(recentDate.getDate() - 7)
  
  const recentNews = await prisma.news.findMany({
    where: { createdAt: { gte: recentDate } },
    select: { id: true, title: true },
    take: 500,
  })
  
  for (const news of recentNews) {
    const similarity = calculateSimilarity(title, news.title)
    if (similarity >= 0.7) {
      return news
    }
  }
  
  return null
}

/**
 * 获取网站特定选择器
 */
function getSiteSelector(hostname: string): { titleSelector: string; linkSelector: string } | null {
  for (const [domain, selectors] of Object.entries(SITE_SELECTORS)) {
    if (hostname.includes(domain)) {
      return selectors
    }
  }
  return null
}

/**
 * 从 HTML 中提取新闻链接
 */
function extractNewsLinks(html: string, baseUrl: string): Array<{ title: string; url: string }> {
  const $ = cheerio.load(html)
  const results: Array<{ title: string; url: string }> = []
  const seenUrls = new Set<string>()
  
  const urlObj = new URL(baseUrl)
  const siteSelector = getSiteSelector(urlObj.hostname)
  
  // 如果有网站特定选择器，优先使用
  if (siteSelector) {
    $(siteSelector.titleSelector).each((_, elem) => {
      const $elem = $(elem)
      const $link = $elem.is('a') ? $elem : $elem.find(siteSelector.linkSelector).first()
      
      if ($link.length) {
        const title = $elem.text().trim()
        const href = $link.attr('href') || ''
        
        if (title && href && title.length >= 10 && title.length <= 200) {
          let fullUrl = href
          if (!href.startsWith('http')) {
            try {
              fullUrl = new URL(href, baseUrl).href
            } catch {
              return
            }
          }
          
          // 过滤无效链接
          if (!seenUrls.has(fullUrl) && 
              !fullUrl.includes('javascript:') && 
              !fullUrl.includes('#') &&
              !fullUrl.includes('login') &&
              !fullUrl.includes('register')) {
            seenUrls.add(fullUrl)
            results.push({ title, url: fullUrl })
          }
        }
      }
    })
  }
  
  // 通用选择器
  if (results.length < 50) {
    for (const selector of NEWS_SELECTORS) {
      $(selector).each((_, elem) => {
        const $elem = $(elem)
        const title = $elem.text().trim()
        const href = $elem.attr('href') || ''
        
        if (title && href && title.length >= 10 && title.length <= 200) {
          let fullUrl = href
          if (!href.startsWith('http')) {
            try {
              fullUrl = new URL(href, baseUrl).href
            } catch {
              return
            }
          }
          
          if (!seenUrls.has(fullUrl) && 
              !fullUrl.includes('javascript:') && 
              !fullUrl.includes('#') &&
              !fullUrl.includes('login') &&
              !fullUrl.includes('register')) {
            seenUrls.add(fullUrl)
            results.push({ title, url: fullUrl })
          }
        }
      })
      
      if (results.length >= 50) break
    }
  }
  
  return results
}

/**
 * 抓取单个 HTML 源
 */
export async function fetchHTMLSource(sourceId: number, maxNews: number = 10): Promise<FetchResult> {
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
    console.log(`🌐 Fetching HTML: ${source.name} (${source.url})`)
    
    const response = await axios.get(source.url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })

    const html = decodeResponse(response.data, response.headers['content-type'])
    const links = extractNewsLinks(html, source.url)
    
    console.log(`  Found ${links.length} links, filtering for AI content...`)

    // 过滤 AI 相关新闻
    const aiLinks = links.filter(link => isAIRelated(link.title))
    console.log(`  Found ${aiLinks.length} AI-related links`)

    result.itemsFetched = aiLinks.length

    // 处理每条新闻
    for (const link of aiLinks.slice(0, maxNews)) {
      try {
        // 检查 URL 是否已存在
        const existing = await prisma.news.findUnique({
          where: { url: link.url },
        })

        if (existing) {
          result.itemsSkipped++
          continue
        }

        // 检查标题相似度
        const duplicate = await checkDuplicate(link.title)
        if (duplicate) {
          result.itemsSkipped++
          continue
        }

        // 创建新闻
        const news = await prisma.news.create({
          data: {
            title: link.title,
            url: link.url,
            sourceId: source.id,
            category: source.category || 'domestic',
            publishedAt: new Date(),
          },
        })

        result.itemsCreated++
        console.log(`  ✅ Created: ${link.title.substring(0, 50)}...`)

        // AI 分析
        try {
          const analysis = await analyzeNews(link.title, '', '')
          if (analysis) {
            await prisma.news.update({
              where: { id: news.id },
              data: {
                aiSummary: analysis.aiSummary,
                keywords: analysis.keywords,
                sentiment: analysis.sentiment,
                qualityScore: analysis.qualityScore,
                analyzedAt: new Date(),
              },
            })
          }
        } catch (aiError) {
          console.log(`  ⚠️ AI analysis failed: ${link.title.substring(0, 30)}...`)
        }

        // 延迟避免过于频繁
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        console.log(`  ❌ Error: ${link.title.substring(0, 30)}... - ${error.message}`)
      }
    }

    // 更新源状态
    await prisma.newsSource.update({
      where: { id: sourceId },
      data: {
        lastFetchedAt: new Date(),
        fetchCount: { increment: 1 },
      },
    })

    console.log(`✅ HTML fetched: ${source.name} - ${result.itemsCreated} created, ${result.itemsSkipped} skipped`)

  } catch (error: any) {
    console.error(`❌ HTML fetch failed: ${source.name}`, error.message)
    result.success = false
    result.errorMessage = error.message

    await prisma.newsSource.update({
      where: { id: sourceId },
      data: { errorCount: { increment: 1 } },
    })
  }

  return result
}

/**
 * 抓取所有启用的 HTML 源
 */
export async function fetchAllHTML(maxNewsPerSource: number = 10): Promise<FetchResult[]> {
  console.log('🔄 Starting HTML fetch for all sources...')

  const sources = await prisma.newsSource.findMany({
    where: {
      type: 'html',
      enabled: true,
    },
  })

  if (sources.length === 0) {
    console.log('⚠️ No enabled HTML sources found')
    return []
  }

  console.log(`📋 Found ${sources.length} enabled HTML sources`)

  const results: FetchResult[] = []

  for (const source of sources) {
    const result = await fetchHTMLSource(source.id, maxNewsPerSource)
    results.push(result)
    
    // 源之间间隔
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  const totalCreated = results.reduce((sum, r) => sum + r.itemsCreated, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.itemsSkipped, 0)

  console.log(`\n📊 HTML fetch summary:`)
  console.log(`   Total sources: ${sources.length}`)
  console.log(`   Total created: ${totalCreated}`)
  console.log(`   Total skipped: ${totalSkipped}`)
  console.log(`   Success: ${results.filter(r => r.success).length}/${results.length}\n`)

  return results
}
