import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function seedTestData() {
  try {
    console.log('Seeding test data...')

    // Get news sources
    const sources = await prisma.newsSource.findMany()

    if (sources.length === 0) {
      console.log('❌ No news sources found')
      return
    }

    // Create test news
    const testNews = [
      {
        title: 'AI 技术突破：GPT-5 发布',
        summary: 'OpenAI 发布了最新的 GPT-5 模型，性能大幅提升...',
        content: 'OpenAI 今天正式发布了备受期待的 GPT-5 模型。相比上一代，GPT-5 在推理能力、代码生成和多模态理解方面都有显著提升...',
        author: 'Tech News',
        url: `https://example.com/news/${randomUUID()}`,
        imageUrl: 'https://example.com/image.jpg',
        category: 'technology',
        tags: ['AI', 'GPT', 'OpenAI'],
        publishedAt: new Date(),
        sourceId: sources[0].id,
      },
      {
        title: 'Web3 发展趋势报告',
        summary: '2026 年 Web3 技术持续发展，去中心化应用增长迅速...',
        content: '最新的 Web3 发展趋势报告显示，去中心化应用在全球范围内的采用率持续攀升...',
        author: 'Crypto Daily',
        url: `https://example.com/news/${randomUUID()}`,
        imageUrl: 'https://example.com/image2.jpg',
        category: 'blockchain',
        tags: ['Web3', 'Blockchain', 'Crypto'],
        publishedAt: new Date(Date.now() - 3600000), // 1 hour ago
        sourceId: sources[1]?.id || sources[0].id,
      },
      {
        title: '云计算市场 2026 年预测',
        summary: '全球云计算市场预计将达到新的高度...',
        content: '分析师预测，2026 年全球云计算市场将突破 5000 亿美元，主要增长动力来自企业数字化转型...',
        author: 'Cloud Weekly',
        url: `https://example.com/news/${randomUUID()}`,
        imageUrl: 'https://example.com/image3.jpg',
        category: 'cloud',
        tags: ['Cloud', 'Computing', 'Enterprise'],
        publishedAt: new Date(Date.now() - 7200000), // 2 hours ago
        sourceId: sources[2]?.id || sources[0].id,
      },
    ]

    for (const news of testNews) {
      await prisma.news.create({ data: news })
      console.log(`✅ Created: ${news.title}`)
    }

    console.log(`\n✅ Seeded ${testNews.length} news items`)

  } catch (error) {
    console.error('❌ Error seeding data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedTestData()
