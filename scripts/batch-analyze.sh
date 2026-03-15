#!/bin/bash

# 批量分析新闻脚本
# 用法: ./batch-analyze.sh [批次大小] [起始ID]

BATCH_SIZE=${1:-10}
START_ID=${2:-1}
API_URL="http://localhost:4008"
DB_HOST="localhost"
DB_USER="news_admin"
DB_PASS="news_password"
DB_NAME="news_app"

echo "🚀 批量分析新闻"
echo "📦 批次大小: $BATCH_SIZE"
echo "📍 起始ID: $START_ID"
echo ""

# 获取需要分析的新闻ID列表
NEWS_IDS=$(docker exec news-app-postgres psql -U news_admin -d news_app -t -c "
SELECT id FROM news 
WHERE ai_summary IS NULL OR analyzed_at IS NULL 
ORDER BY id DESC 
LIMIT $BATCH_SIZE;
" | tr -d ' ')

count=0
success=0
fail=0

for id in $NEWS_IDS; do
  if [ -z "$id" ]; then
    continue
  fi
  
  count=$((count + 1))
  
  # 获取新闻标题和内容
  NEWS_DATA=$(docker exec news-app-postgres psql -U news_admin -d news_app -t -c "
  SELECT json_build_object('title', title, 'content', content, 'summary', summary)
  FROM news WHERE id = $id;
  " | tr -d ' \n')
  
  # 提取字段（简单方式）
  TITLE=$(docker exec news-app-postgres psql -U news_admin -d news_app -t -c "SELECT title FROM news WHERE id = $id;" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  
  echo "🤖 [$count/$BATCH_SIZE] 分析 #$id: ${TITLE:0:50}..."
  
  # 调用 AI 分析 API
  RESULT=$(curl -s -X POST "$API_URL/api/analyze" \
    -H "Content-Type: application/json" \
    -d "{\"title\": \"$TITLE\", \"content\": \"\", \"summary\": \"\"}" \
    --max-time 30)
  
  # 检查是否成功
  if echo "$RESULT" | grep -q '"success":true'; then
    # 提取分析结果
    AI_SUMMARY=$(echo "$RESULT" | jq -r '.data.aiSummary // empty')
    KEYWORDS=$(echo "$RESULT" | jq -c '.data.keywords // []')
    SENTIMENT=$(echo "$RESULT" | jq -r '.data.sentiment // "neutral"')
    CATEGORY=$(echo "$RESULT" | jq -r '.data.category // "general"')
    QUALITY=$(echo "$RESULT" | jq -r '.data.qualityScore // 50')
    
    # 更新数据库
    docker exec news-app-postgres psql -U news_admin -d news_app -c "
    UPDATE news SET 
      ai_summary = '$AI_SUMMARY',
      keywords = '$KEYWORDS'::jsonb,
      sentiment = '$SENTIMENT',
      category = '$CATEGORY',
      quality_score = $QUALITY,
      analyzed_at = NOW()
    WHERE id = $id;
    " > /dev/null 2>&1
    
    echo "    ✅ 成功"
    success=$((success + 1))
  else
    echo "    ❌ 失败"
    fail=$((fail + 1))
  fi
  
  # 短暂延迟
  sleep 0.5
done

echo ""
echo "✨ 完成！成功: $success, 失败: $fail"
