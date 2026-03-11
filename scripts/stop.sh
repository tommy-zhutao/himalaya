#!/bin/bash
# AI News Hub 停止脚本

echo "🛑 停止 AI News Hub 服务..."

# 停止所有 Node 服务
pkill -f "news-api.*ts-node" 2>/dev/null || true
pkill -f "user-api.*ts-node" 2>/dev/null || true
pkill -f "admin-api.*ts-node" 2>/dev/null || true
pkill -f "api-gateway.*ts-node" 2>/dev/null || true
pkill -f "frontend.*next" 2>/dev/null || true

echo "✅ 后端服务已停止"

# 可选：停止 Docker 服务
read -p "是否停止 PostgreSQL 和 Redis？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker compose stop postgres redis
    echo "✅ 数据库服务已停止"
fi

echo ""
echo "🎉 所有服务已停止"
