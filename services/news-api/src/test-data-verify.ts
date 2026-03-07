import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyData() {
  try {
    const news = await prisma.news.findMany({
      include: {
        source: true,
      },
    })

    console.log(`\n✅ Found ${news.length} news items:\n`)
    news.forEach((item) => {
      console.log(`[${item.id}] ${item.title}`)
      console.log(`    Source: ${item.source?.name}`)
      console.log(`    Category: ${item.category}`)
      console.log(`    Published: ${item.publishedAt}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyData()
