import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

export interface FetchContentResult {
  url: string
  title: string
  content: string
  summary: string
  imageUrl: string | null
  author: string | null
  publishedAt: Date | null
  success: boolean
  error?: string
}

// 常见的正文选择器（按优先级排序）
const CONTENT_SELECTORS = [
  'article',
  '[class*="article-content"]',
  '[class*="post-content"]',
  '[class*="entry-content"]',
  '[class*="main-content"]',
  '[class*="content-body"]',
  '[class*="article-body"]',
  '[class*="story-body"]',
  '.content',
  '#content',
  'main',
  '[role="main"]',
]

// 需要移除的元素
const REMOVE_SELECTORS = [
  'script',
  'style',
  'nav',
  'header',
  'footer',
  'aside',
  '[class*="sidebar"]',
  '[class*="advertisement"]',
  '[class*="ad-"]',
  '[class*="social-share"]',
  '[class*="comment"]',
  '[class*="related"]',
  '[class*="recommend"]',
  '.author-info',
  '.post-meta',
  '.tags',
]

/**
 * 从 URL 抓取完整内容
 */
export async function fetchFullContent(url: string): Promise<FetchContentResult> {
  const result: FetchContentResult = {
    url,
    title: '',
    content: '',
    summary: '',
    imageUrl: null,
    author: null,
    publishedAt: null,
    success: false,
  }

  try {
    console.log(`📄 Fetching content from: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      },
      timeout: 30000,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // 移除不需要的元素
    REMOVE_SELECTORS.forEach(selector => {
      $(selector).remove()
    })

    // 提取标题
    result.title = $('h1').first().text().trim() || 
                   $('title').text().trim() ||
                   $('meta[property="og:title"]').attr('content') || ''

    // 提取正文
    let contentHtml = ''
    for (const selector of CONTENT_SELECTORS) {
      const element = $(selector).first()
      if (element.length && element.text().trim().length > 200) {
        contentHtml = element.html() || ''
        break
      }
    }

    // 如果没找到，尝试获取所有 p 标签
    if (!contentHtml) {
      const paragraphs: string[] = []
      $('p').each((_, el) => {
        const text = $(el).text().trim()
        if (text.length > 50) {
          paragraphs.push(text)
        }
      })
      if (paragraphs.length > 0) {
        contentHtml = paragraphs.map(p => `<p>${p}</p>`).join('')
      }
    }

    // 清理内容
    result.content = cleanContent(contentHtml)

    // 提取摘要（前 200 字符）
    const plainText = cheerio.load(result.content).text().trim()
    result.summary = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '')

    // 提取图片
    result.imageUrl = $('meta[property="og:image"]').attr('content') ||
                      $('meta[name="twitter:image"]').attr('content') ||
                      $('article img').first().attr('src') ||
                      null

    // 提取作者
    result.author = $('meta[name="author"]').attr('content') ||
                    $('[class*="author"]').first().text().trim() ||
                    null

    // 提取发布时间
    const dateStr = $('meta[property="article:published_time"]').attr('content') ||
                    $('time').first().attr('datetime') ||
                    null
    if (dateStr) {
      try {
        result.publishedAt = new Date(dateStr)
      } catch {
        // 忽略无效日期
      }
    }

    result.success = result.content.length > 100

    if (result.success) {
      console.log(`✅ Content fetched: ${result.title.substring(0, 50)}... (${result.content.length} chars)`)
    } else {
      console.log(`⚠️  Content too short: ${url}`)
    }

  } catch (error: any) {
    result.error = error.message
    console.error(`❌ Failed to fetch content from ${url}:`, error.message)
  }

  return result
}

/**
 * 清理 HTML 内容
 */
function cleanContent(html: string): string {
  const $ = cheerio.load(html)
  
  // 移除不需要的元素
  REMOVE_SELECTORS.forEach(selector => {
    $(selector).remove()
  })
  
  // 移除空段落
  $('p:empty, div:empty').remove()
  
  // 清理样式和脚本属性
  $('*').each((_, el) => {
    $(el).removeAttr('style')
    $(el).removeAttr('class')
    $(el).removeAttr('id')
    $(el).removeAttr('onclick')
    $(el).removeAttr('onload')
  })
  
  return $('body').html() || ''
}

/**
 * 批量抓取内容
 */
export async function fetchMultipleContents(urls: string[]): Promise<FetchContentResult[]> {
  const results: FetchContentResult[] = []
  
  // 串行抓取，避免被封
  for (const url of urls) {
    const result = await fetchFullContent(url)
    results.push(result)
    // 添加延迟，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return results
}
