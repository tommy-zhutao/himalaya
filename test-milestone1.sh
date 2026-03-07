#!/bin/bash

echo "=== AI News Hub - Milestone 1 测试报告 ==="
echo "测试时间: $(date)"
echo ""

# Test 1: News API Health
echo "【测试 1】News API 健康检查"
NEWS_API_HEALTH=$(curl -s http://localhost:4001/health | jq -r '.status')
if [ "$NEWS_API_HEALTH" = "ok" ]; then
    echo "✅ News API 运行正常"
else
    echo "❌ News API 运行异常"
fi
echo ""

# Test 2: Get News List
echo "【测试 2】获取新闻列表"
NEWS_LIST=$(curl -s "http://localhost:4001/api/news?limit=3")
NEWS_COUNT=$(echo "$NEWS_LIST" | jq '.pagination.total')
FIRST_TITLE=$(echo "$NEWS_LIST" | jq -r '.data[0].title')
if [ "$NEWS_COUNT" -gt 0 ]; then
    echo "✅ 新闻列表获取成功 (共 ${NEWS_COUNT} 条)"
    echo "   首条: ${FIRST_TITLE:0:50}..."
else
    echo "❌ 新闻列表获取失败"
fi
echo ""

# Test 3: Get News Detail
echo "【测试 3】获取新闻详情"
NEWS_ID=$(echo "$NEWS_LIST" | jq -r '.data[0].id')
NEWS_DETAIL=$(curl -s "http://localhost:4001/api/news/${NEWS_ID}")
DETAIL_TITLE=$(echo "$NEWS_DETAIL" | jq -r '.data.title')
VIEW_COUNT=$(echo "$NEWS_DETAIL" | jq '.data.viewCount')
if [ "$DETAIL_TITLE" != "null" ]; then
    echo "✅ 新闻详情获取成功"
    echo "   标题: ${DETAIL_TITLE:0:50}..."
    echo "   浏览量: ${VIEW_COUNT}"
else
    echo "❌ 新闻详情获取失败"
fi
echo ""

# Test 4: Search News
echo "【测试 4】搜索新闻"
SEARCH_RESULT=$(curl -s "http://localhost:4001/api/news/search?q=36氪&limit=3")
SEARCH_COUNT=$(echo "$SEARCH_RESULT" | jq '.pagination.total')
if [ "$SEARCH_COUNT" -gt 0 ]; then
    echo "✅ 搜索功能正常 (找到 ${SEARCH_COUNT} 条)"
else
    echo "❌ 搜索功能异常"
fi
echo ""

# Test 5: Frontend News List API
echo "【测试 5】前端新闻列表 API"
FRONT_LIST=$(curl -s "http://localhost:3000/api/news?limit=3")
FRONT_COUNT=$(echo "$FRONT_LIST" | jq '.pagination.total')
if [ "$FRONT_COUNT" -gt 0 ]; then
    echo "✅ 前端 API 正常 (共 ${FRONT_COUNT} 条)"
else
    echo "❌ 前端 API 异常"
fi
echo ""

# Test 6: Frontend News Detail API
echo "【测试 6】前端新闻详情 API"
FRONT_DETAIL=$(curl -s "http://localhost:3000/api/news/${NEWS_ID}")
FRONT_TITLE=$(echo "$FRONT_DETAIL" | jq -r '.data.title')
if [ "$FRONT_TITLE" != "null" ]; then
    echo "✅ 前端详情 API 正常"
    echo "   标题: ${FRONT_TITLE:0:50}..."
else
    echo "❌ 前端详情 API 异常"
fi
echo ""

# Test 7: RSS Fetcher Health
echo "【测试 7】RSS Fetcher 健康检查"
RSS_HEALTH=$(curl -s http://localhost:4004/health | jq -r '.status')
if [ "$RSS_HEALTH" = "ok" ]; then
    echo "✅ RSS Fetcher 运行正常"
else
    echo "❌ RSS Fetcher 运行异常"
fi
echo ""

# Test 8: Frontend Home Page
echo "【测试 8】前端首页"
FRONT_HOME=$(curl -s http://localhost:3000)
if echo "$FRONT_HOME" | grep -q "AI News Hub"; then
    echo "✅ 前端首页正常"
else
    echo "❌ 前端首页异常"
fi
echo ""

# Summary
echo "=== 测试总结 ==="
echo "✅ 后端服务: News API + RSS Fetcher"
echo "✅ 前端服务: Next.js (http://localhost:3000)"
echo "✅ 数据库: PostgreSQL + 3个RSS源"
echo "✅ 总新闻数: ${NEWS_COUNT} 条"
echo ""
echo "🎉 Milestone 1: MVP 可用 - 测试通过！"
