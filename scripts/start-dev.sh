#!/bin/bash
# AI News Hub 开发环境启动脚本

set -e

echo "🚀 AI News Hub 开发环境启动"
echo "============================"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从 .env.example 复制..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置您的环境变量"
fi

# 加载环境变量
export $(grep -v '^#' .env | xargs)

# 启动基础服务
echo ""
echo "📦 启动基础服务 (PostgreSQL, Redis)..."
docker compose up -d postgres redis

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 3

# 检查数据库连接
until docker compose exec -T postgres pg_isready -U news_admin -d news_app; do
    echo "  等待 PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL 就绪"

until docker compose exec -T redis redis-cli ping | grep -q PONG; do
    echo "  等待 Redis..."
    sleep 2
done
echo "✅ Redis 就绪"

# 运行数据库迁移
echo ""
echo "📊 运行数据库迁移..."
cd services/news-api && npx prisma generate && npx prisma db push --skip-generate && cd ../..

# 启动后端服务
echo ""
echo "🔧 启动后端服务..."

# 启动各个服务（后台运行）
start_service() {
    local service=$1
    local port=$2
    echo "  启动 $service (端口 $port)..."
    cd services/$service
    NODE_ENV=development \
    DATABASE_URL="postgresql://news_admin:news_password@localhost:5432/news_app" \
    REDIS_URL="redis://localhost:6379" \
    JWT_SECRET="${JWT_SECRET:-dev_jwt_secret}" \
    nohup npm run dev > ../../logs/$service.log 2>&1 &
    cd ../..
}

# 创建日志目录
mkdir -p logs

start_service "news-api" 4001 &
start_service "user-api" 4002 &
start_service "admin-api" 4003 &
start_service "api-gateway" 4000 &

wait

# 等待后端服务启动
echo ""
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查服务健康状态
check_health() {
    local service=$1
    local port=$2
    if curl -s http://localhost:$port/health > /dev/null; then
        echo "✅ $service 运行正常"
    else
        echo "⚠️  $service 启动中..."
    fi
}

echo ""
echo "🔍 检查服务状态..."
check_health "News API" 4001
check_health "User API" 4002
check_health "Admin API" 4003
check_health "API Gateway" 4000

# 启动前端
echo ""
echo "🎨 启动前端服务..."
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:4000 nohup npm run dev > ../logs/frontend.log 2>&1 &
cd ..

sleep 5
check_health "Frontend" 3000

echo ""
echo "============================"
echo "🎉 开发环境启动完成！"
echo ""
echo "📍 服务地址："
echo "   前端:     http://localhost:3000"
echo "   API网关:  http://localhost:4000"
echo "   News API: http://localhost:4001"
echo "   User API: http://localhost:4002"
echo "   Admin API: http://localhost:4003"
echo ""
echo "📋 管理后台: http://localhost:3000/admin"
echo "   默认管理员: admin@newshub.com / admin123"
echo ""
echo "📝 日志目录: ./logs/"
echo "   查看日志: tail -f logs/<service>.log"
echo ""
echo "🛑 停止服务: ./scripts/stop.sh"
