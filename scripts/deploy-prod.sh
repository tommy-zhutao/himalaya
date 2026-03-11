#!/bin/bash
# AI News Hub - 生产环境一键部署脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  AI News Hub - 生产环境部署${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    echo "请先安装 Docker: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 环境检查通过${NC}"

# 检查环境变量文件
if [ ! -f .env.prod ]; then
    echo -e "${YELLOW}⚠ .env.prod 文件不存在${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env.prod
        echo -e "${YELLOW}已从 .env.example 创建 .env.prod${NC}"
        echo -e "${YELLOW}请编辑 .env.prod 配置必要的环境变量：${NC}"
        echo "  - DB_PASSWORD (数据库密码)"
        echo "  - JWT_SECRET (JWT 密钥)"
        echo ""
        read -p "按回车继续编辑 .env.prod..."
        ${EDITOR:-nano} .env.prod
    else
        echo -e "${RED}请创建 .env.prod 文件${NC}"
        exit 1
    fi
fi

# 加载环境变量
export $(grep -v '^#' .env.prod | xargs)

# 检查必要的环境变量
MISSING_VARS=""

if [ -z "$DB_PASSWORD" ]; then
    MISSING_VARS="$MISSING_VARS DB_PASSWORD"
fi

if [ -z "$JWT_SECRET" ]; then
    MISSING_VARS="$MISSING_VARS JWT_SECRET"
fi

if [ ! -z "$MISSING_VARS" ]; then
    echo -e "${RED}错误: 以下环境变量未设置：$MISSING_VARS${NC}"
    echo "请编辑 .env.prod 文件"
    exit 1
fi

echo -e "${GREEN}✓ 环境变量检查通过${NC}"

# 检查 SSL 证书
SSL_DIR="docker/nginx/ssl"
if [ ! -f "$SSL_DIR/fullchain.pem" ] || [ ! -f "$SSL_DIR/privkey.pem" ]; then
    echo -e "${YELLOW}⚠ SSL 证书不存在，生成自签名证书（仅用于测试）${NC}"
    mkdir -p $SSL_DIR
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout $SSL_DIR/privkey.pem \
        -out $SSL_DIR/fullchain.pem \
        -subj "/CN=localhost" 2>/dev/null
    echo -e "${GREEN}✓ 自签名证书已生成${NC}"
    echo -e "${YELLOW}  生产环境请使用真实 SSL 证书${NC}"
fi

echo -e "${GREEN}✓ SSL 证书检查通过${NC}"

# 停止旧容器
echo ""
echo -e "${YELLOW}停止现有服务...${NC}"
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# 构建镜像
echo ""
echo -e "${YELLOW}构建 Docker 镜像...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

echo -e "${GREEN}✓ 镜像构建完成${NC}"

# 启动服务
echo ""
echo -e "${YELLOW}启动服务...${NC}"
docker compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo ""
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 10

# 检查服务状态
echo ""
echo -e "${YELLOW}检查服务状态...${NC}"

check_service() {
    local service=$1
    if docker compose -f docker-compose.prod.yml ps $service | grep -q "Up"; then
        echo -e "${GREEN}  ✓ $service 运行中${NC}"
        return 0
    else
        echo -e "${RED}  ✗ $service 未运行${NC}"
        return 1
    fi
}

SERVICES_OK=true

for service in postgres redis news-api user-api admin-api api-gateway frontend nginx; do
    if ! check_service $service; then
        SERVICES_OK=false
    fi
done

# 健康检查
echo ""
echo -e "${YELLOW}健康检查...${NC}"

sleep 5

# 检查 API Gateway
if curl -sf http://localhost:4000/health > /dev/null 2>&1 || \
   curl -sf http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ API Gateway 健康${NC}"
else
    echo -e "${YELLOW}  ⚠ API Gateway 可能还在启动${NC}"
fi

# 检查前端
if curl -sf http://localhost:3000 > /dev/null 2>&1 || \
   curl -sf http://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Frontend 健康${NC}"
else
    echo -e "${YELLOW}  ⚠ Frontend 可能还在启动${NC}"
fi

# 完成提示
echo ""
echo -e "${GREEN}========================================${NC}"
if [ "$SERVICES_OK" = true ]; then
    echo -e "${GREEN}  部署成功！${NC}"
else
    echo -e "${YELLOW}  部署完成，部分服务可能需要检查${NC}"
fi
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📍 访问地址："
echo -e "   HTTP:  http://localhost"
echo -e "   HTTPS: https://localhost"
echo ""
echo -e "📋 查看日志："
echo -e "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "🛑 停止服务："
echo -e "   docker compose -f docker-compose.prod.yml down"
echo ""
