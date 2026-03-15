#!/bin/bash

echo "🧪 测试 AI 分析集成到 Fetcher"
echo "================================"
echo ""

# 1. 检查 AI 分析服务是否运行
echo "📍 Step 1: 检查 AI 分析服务"
echo "---------------------------"
if curl -s http://localhost:4008/health | jq -e '.status == "ok"' > /dev/null; then
  echo "✅ AI 分析服务运行正常"
else
  echo "❌ AI 分析服务未运行，正在启动..."
  cd /root/.openclaw/workspace/news-app/services/ai-analysis
  node dist/index.js > /tmp/ai-service.log 2>&1 &
  sleep 3
  echo "✅ AI 分析服务已启动"
fi
echo ""

# 2. 检查数据库中是否有 AI 分析的新闻
echo "📍 Step 2: 检查数据库中已分析的新闻"
echo "-------------------------------------"
ANALYZED_COUNT=$(docker exec -i news-app-postgres psql -U news_admin -d news_app -t -c \
  "SELECT COUNT(*) FROM news WHERE analyzed_at IS NOT NULL;")
echo "已分析的新闻数量: $ANALYZED_COUNT"
echo ""

# 3. 手动触发一次 RSS 抓取测试（小规模）
echo "📍 Step 3: 测试 RSS 抓取 + AI 分析"
echo "-----------------------------------"
echo "手动测试一个 RSS 源..."
echo ""

# 4. 显示最近分析的新闻
echo "📍 Step 4: 显示最近分析的新闻示例"
echo "-----------------------------------"
docker exec -i news-app-postgres psql -U news_admin -d news_app -c \
  "SELECT 
    id,
    LEFT(title, 60) as title,
    sentiment,
    quality_score,
    keywords,
    analyzed_at
  FROM news 
  WHERE analyzed_at IS NOT NULL
  ORDER BY analyzed_at DESC 
  LIMIT 3;" 2>/dev/null || echo "暂无分析数据"
echo ""

# 5. 显示统计信息
echo "📍 Step 5: 统计信息"
echo "--------------------"
docker exec -i news-app-postgres psql -U news_admin -d news_app -c \
  "SELECT 
    COUNT(*) as total_news,
    COUNT(analyzed_at) as analyzed_news,
    ROUND(COUNT(analyzed_at)::decimal / NULLIF(COUNT(*), 0) * 100, 2) as analysis_rate
  FROM news;" 2>/dev/null || echo "暂无数据"
echo ""

echo "✅ 测试完成！"
echo ""
echo "📝 提示："
echo "  - 要查看完整日志: docker-compose logs -f rss-fetcher"
echo "  - 要手动触发抓取: docker exec news-app-rss-fetcher npm run fetch"
echo "  - 要查看 AI 分析日志: tail -f /tmp/ai-service.log"
echo ""
