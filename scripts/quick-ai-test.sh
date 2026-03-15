#!/bin/bash

echo "🧪 快速测试：AI 分析集成"
echo "=========================="
echo ""

# 确保 AI 服务运行
echo "📍 确保 AI 分析服务运行中..."
pgrep -f "node dist/index.js" > /dev/null || {
  echo "启动 AI 服务..."
  cd /root/.openclaw/workspace/news-app/services/ai-analysis
  node dist/index.js > /tmp/ai-service.log 2>&1 &
  sleep 2
}

# 测试 AI 服务
echo "📍 测试 AI 分析服务..."
RESPONSE=$(curl -s -X POST http://localhost:4008/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试：AI 技术突破性进展",
    "content": "最新的 AI 技术在大模型领域取得重大突破，性能提升显著。这是测试内容。",
    "summary": "AI 技术取得突破"
  }')

echo "$RESPONSE" | jq .

# 检查数据库
echo ""
echo "📍 检查数据库中的 AI 分析字段..."
docker exec -i news-app-postgres psql -U news_admin -d news_app -c \
  "SELECT COUNT(*) as analyzed FROM news WHERE analyzed_at IS NOT NULL;" 2>/dev/null

echo ""
echo "✅ 快速测试完成！"
