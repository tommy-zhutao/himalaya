import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testing database connection...')

    // Test connection
    await prisma.$connect()
    console.log('✅ Database connected successfully!')

    // Test query
    const newsSources = await prisma.newsSource.findMany()
    console.log(`✅ Found ${newsSources.length} news sources:`)
    newsSources.forEach(source => {
      console.log(`   - ${source.name} (${source.url})`)
    })

    // Test count
    const userCount = await prisma.user.count()
    console.log(`✅ Found ${userCount} users`)

  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
