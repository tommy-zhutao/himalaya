# 部署指南

## 概述

AI News Hub 支持多种部署方式：
1. **Docker Compose** - 推荐，适合单机部署
2. **Docker Swarm** - 适合小规模集群
3. **Kubernetes** - 适合大规模生产环境

## 环境要求

### 最低配置
- CPU: 2 核
- 内存: 4 GB
- 存储: 20 GB SSD
- 操作系统: Ubuntu 22.04 / CentOS 8+

### 推荐配置
- CPU: 4 核
- 内存: 8 GB
- 存储: 50 GB SSD

### 软件要求
- Docker 24+
- Docker Compose 2.20+
- PostgreSQL 14+ (如不使用 Docker 内置)
- Redis 7+ (可选)

## Docker Compose 部署

### 1. 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt install docker-compose-plugin
```

### 2. 克隆项目

```bash
git clone https://github.com/xxx/news-app.git
cd news-app
```

### 3. 配置环境变量

创建 `.env` 文件：
```bash
cat > .env << 'EOF'
# 数据库
POSTGRES_USER=news_user
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=news_app
DATABASE_URL=postgresql://news_user:your-secure-password@postgres:5432/news_app

# JWT
JWT_SECRET=your-jwt-secret-at-least-32-characters-long

# AI 服务
ZHIPU_API_KEY=your-zhipu-api-key

# 前端
NEXT_PUBLIC_API_URL=http://your-domain.com/api
EOF
```

### 4. 启动服务

```bash
# 构建并启动
docker-compose up -d --build

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 初始化数据库

```bash
# 运行迁移
docker-compose exec news-api npx prisma migrate deploy

# 创建管理员用户（可选）
docker-compose exec user-api npm run create-admin
```

### 6. 验证部署

```bash
# 检查健康状态
curl http://localhost:4000/health

# 访问前端
# http://localhost:3000
```

## Nginx 反向代理

### 配置示例

```nginx
# /etc/nginx/sites-available/news-app
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/news-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL 证书配置

### 使用 Let's Encrypt

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 数据库备份

### 自动备份脚本

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="news_app"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T postgres pg_dump -U news_user $DB_NAME | gzip > $BACKUP_DIR/news_app_$DATE.sql.gz

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: news_app_$DATE.sql.gz"
```

### 设置定时备份

```bash
# 添加 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

### 恢复数据库

```bash
# 从备份恢复
gunzip -c /backups/news_app_20240315_020000.sql.gz | docker-compose exec -T postgres psql -U news_user news_app
```

## 监控与日志

### 健康检查端点

| 服务 | 端点 |
|------|------|
| API Gateway | `GET /health` |
| News API | `GET http://localhost:4001/health` |
| User API | `GET http://localhost:4002/health` |

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f news-api

# 最近 100 行
docker-compose logs --tail=100 news-api
```

### 日志轮转

Docker Compose 默认会轮转日志。可在 `docker-compose.yml` 配置：

```yaml
services:
  news-api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 扩展与缩容

### 水平扩展

```bash
# 扩展 News API 到 3 个实例
docker-compose up -d --scale news-api=3

# 需要移除端口映射，使用负载均衡
```

### 负载均衡

在 API Gateway 或 Nginx 配置中添加上游：

```nginx
upstream news_api {
    server news-api-1:4001;
    server news-api-2:4001;
    server news-api-3:4001;
}
```

## 更新部署

### 滚动更新

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose up -d --build

# 零停机更新（需要配置健康检查）
docker-compose up -d --no-deps --build news-api
```

### 数据库迁移

```bash
# 备份数据库
./backup.sh

# 运行迁移
docker-compose exec news-api npx prisma migrate deploy
```

## 故障排除

### 常见问题

**1. 服务无法启动**
```bash
# 检查日志
docker-compose logs news-api

# 检查端口占用
netstat -tlnp | grep 4001
```

**2. 数据库连接失败**
```bash
# 检查 PostgreSQL 状态
docker-compose ps postgres

# 测试连接
docker-compose exec postgres psql -U news_user -d news_app
```

**3. 内存不足**
```bash
# 检查内存使用
docker stats

# 增加 swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**4. 磁盘空间不足**
```bash
# 清理 Docker
docker system prune -a

# 检查磁盘使用
df -h
```

## 安全加固

### 1. 防火墙配置

```bash
# 允许必要端口
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable
```

### 2. SSH 加固

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
Port 2222
```

### 3. 定期更新

```bash
# 自动安全更新
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Kubernetes 部署（简要）

### 前置要求
- Kubernetes 1.28+
- kubectl 配置完成
- Helm 3+

### 使用 Helm 部署

```bash
# 添加仓库
helm repo add news-app ./helm

# 部署
helm install news-app ./helm \
  --set postgresql.auth.password=your-password \
  --set jwtSecret=your-jwt-secret
```

### 手动部署

详见 `k8s/` 目录下的 YAML 配置文件。
