#!/bin/bash

# AI Analysis Service Test Script

echo "🤖 Testing AI Analysis Service..."
echo "=================================="

BASE_URL="http://localhost:4008"

# Test 1: Health Check
echo -e "\n📍 Test 1: Health Check"
curl -s "$BASE_URL/health" | jq .

# Test 2: Single Article Analysis
echo -e "\n📍 Test 2: Single Article Analysis"
curl -s -X POST "$BASE_URL/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "OpenAI 发布 GPT-5：推理能力提升 10 倍，AI 应用迎来新突破",
    "content": "OpenAI 今日正式发布了最新的 GPT-5 模型。新模型在推理能力上相比 GPT-4 提升了 10 倍，能够处理更复杂的任务。GPT-5 在编程、数学、科学推理等领域表现出色，为 AI 应用开发带来了新的可能性。业界专家认为，这将推动 AI 技术在更多领域的落地应用。",
    "summary": "OpenAI 发布 GPT-5，推理能力大幅提升"
  }' | jq .

# Test 3: Batch Analysis
echo -e "\n📍 Test 3: Batch Analysis"
curl -s -X POST "$BASE_URL/api/analyze/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [
      {
        "id": 1,
        "title": "AI 创业公司获得巨额融资",
        "content": "一家专注于大模型训练的 AI 创业公司今日宣布完成 5 亿美元 B 轮融资。本轮融资由顶级风投领投，估值达到 50 亿美元。"
      },
      {
        "id": 2,
        "title": "科技公司宣布裁员计划",
        "content": "受经济环境影响，某知名科技公司宣布将裁员 20%，影响约 5000 名员工。这是该公司历史上规模最大的一次裁员。"
      }
    ]
  }' | jq .

echo -e "\n✅ Tests completed!"
