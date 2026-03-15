const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BATCH_SIZE = 50; // 每批处理数量
const DELAY_MS = 200; // 请求间延迟

async function main() {
  console.log('🚀 批量分析新闻\n');
  
  // 查询需要分析的新闻
  const news = await prisma.news.findMany({
    where: { analyzedAt: null },
    select: { id: true, title: true, content: true, summary: true },
    orderBy: { id: 'desc' },
    take: BATCH_SIZE
  });
  
  console.log(`📊 找到 ${news.length} 条需要分析的新闻\n`);
  
  let success = 0, fail = 0, skipped = 0;
  
  for (let i = 0; i < news.length; i++) {
    const item = news[i];
    const progress = `[${i + 1}/${news.length}]`;
    
    // 跳过内容太短的
    const textLen = (item.content || item.summary || '').length;
    if (textLen < 30) {
      console.log(`${progress} ⏭️  #${item.id} 内容太短 (${textLen}字符)`);
      skipped++;
      continue;
    }
    
    console.log(`${progress} 🤖 #${item.id}: ${item.title.substring(0, 35)}...`);
    
    try {
      const result = await axios.post('http://localhost:4008/api/analyze', {
        title: item.title,
        content: item.content || item.summary || '',
        summary: item.summary || ''
      }, { timeout: 30000 });
      
      if (result.data.success) {
        const ai = result.data.data;
        await prisma.news.update({
          where: { id: item.id },
          data: {
            aiSummary: ai.aiSummary,
            keywords: ai.keywords,
            sentiment: ai.sentiment,
            category: ai.category,
            qualityScore: ai.qualityScore,
            analyzedAt: new Date()
          }
        });
        console.log(`      ✅ ${ai.keywords?.slice(0,3).join(', ') || '无关键词'}`);
        success++;
      }
    } catch (e) {
      console.log(`      ❌ ${e.message}`);
      fail++;
    }
    
    // 延迟
    if (DELAY_MS > 0) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  
  console.log(`\n✨ 批次完成！`);
  console.log(`   成功: ${success}`);
  console.log(`   失败: ${fail}`);
  console.log(`   跳过: ${skipped}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
