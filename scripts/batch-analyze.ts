import axios from 'axios'
import { prisma } from '../services/news-api/lib/prisma'

const AI_API_URL = process.env.AI_API_URL || 'http://localhost:4008'
const BATCH_SIZE = 10 // 每批处理数量
const DELAY_MS = 1000 // 每批之间的延迟（毫秒）

async function analyzeNews(newsId: number, title: string, content: string | null, summary: string | null) {
  try {
    const response = await axios.post(`${AI_API_URL}/api/analyze`, {
      title,
      content: content || '',
      summary: summary || '',
    }, {
      timeout: 30000, // 30秒超时
    })

    return response.data.data
  } catch (error: any) {
    console.error(`  ❌ 分析失败 [${newsId}]: ${error.message}`)
    return null
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🚀 开始批量分析新闻...\n')

  // 获取需要分析的新闻
  const newsToAnalyze = await prisma.news.findMany({
    where: {
      OR: [
        { aiSummary: null },
        { analyzedAt: null },
      ],
    },
    select: {
      id: true,
      title: true,
      content: true,
      summary: true,
    },
    orderBy: { publishedAt: 'desc' },
  })

  console.log(`📊 需要分析: ${newsToAnalyze.length} 条新闻`)
  console.log(`📦 批次大小: ${BATCH_SIZE}`)
  console.log(`⏱️  预计时间: ${Math.ceil(newsToAnalyze.length / BATCH_SIZE * (DELAY_MS / 1000 + 5))} 秒\n`)

  let successCount = 0
  let failCount = 0
  let skippedCount = 0

  // 分批处理
  for (let i = 0; i < newsToAnalyze.length; i += BATCH_SIZE) {
    const batch = newsToAnalyze.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(newsToAnalyze.length / BATCH_SIZE)

    console.log(`\n📦 批次 ${batchNum}/${totalBatches} (${batch.length} 条)`)

    for (const news of batch) {
      // 跳过太短的内容
      const textLength = (news.content || news.summary || '').length
      if (textLength < 50) {
        console.log(`  ⏭️  跳过 [${news.id}]: 内容太短 (${textLength} 字符)`)
        skippedCount++
        continue
      }

      console.log(`  🤖 分析 [${news.id}]: ${news.title.substring(0, 40)}...`)

      const result = await analyzeNews(news.id, news.title, news.content, news.summary)

      if (result) {
        // 更新数据库
        await prisma.news.update({
          where: { id: news.id },
          data: {
            aiSummary: result.aiSummary,
            keywords: result.keywords,
            sentiment: result.sentiment,
            category: result.category,
            qualityScore: result.qualityScore,
            analyzedAt: new Date(),
          },
        })
        successCount++
        console.log(`    ✅ 成功 - 关键词: ${result.keywords?.slice(0, 3).join(', ') || '无'}`)
      } else {
        failCount++
      }
    }

    // 批次间延迟
    if (i + BATCH_SIZE < newsToAnalyze.length) {
      console.log(`  ⏳ 等待 ${DELAY_MS}ms...`)
      await delay(DELAY_MS)
    }

    // 每批后显示进度
    console.log(`\n📊 进度: 成功 ${successCount} | 失败 ${failCount} | 跳过 ${skippedCount}`)
  }

  console.log('\n✨ 批量分析完成!')
  console.log(`   成功: ${successCount}`)
  console.log(`   失败: ${failCount}`)
  console.log(`   跳过: ${skippedCount}`)

  await prisma.$disconnect()
}

main().catch(console.error)
