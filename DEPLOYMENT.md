# AI News Hub - 生产部署指南

## 📋 部署前准备

### 1. 服务器要求

- **操作系统**: Ubuntu 22.04 LTS 或 CentOS 8+
- **CPU**: 2 核心以上
- **内存**: 4GB 以上
- **存储**: 50GB 以上 SSD
- **网络**: 公网 IP，开放 80/443 端口

### 2. 安装依赖

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 3. 克隆代码

```bash
git clone <your-repo-url> /opt/news-app
cd /opt/news-app
```

## 🔧 配置

### 1. 创建环境变量文件

```bash
cp .env.example .env.prod
```

编辑 `.env.prod` 文件：

```bash
# 数据库配置
DB_USER=news_admin
DB_PASSWORD=your_secure_password_here  # 必须修改！

# JWT 密钥（至少 32 字符的随机字符串）
JWT_SECRET=your_jwt_secret_here_at_least_32_chars  # 必须修改！

# API Keys（可选）
NEWSAPI_KEY=your_newsapi_key
GNEWS_API_KEY=your_gnews_key

# API URL（生产环境域名）
API_URL=https://your-domain.com
```

### 2. 生成 JWT 密钥

```bash
# 生成随机密钥
openssl rand -base64 32
```

### 3. SSL 证书配置

#### 使用 Let's Encrypt（推荐）

```bash
# 安装 Certbot
apt install certbot

# 获取证书
certbot certonly --standalone -d your-domain.com

# 复制证书到项目目录
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/

# 设置自动续期
crontab -e
# 添加以下行：
0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /opt/news-app/docker/nginx/ssl/ && docker compose -f docker-compose.prod.yml restart nginx
```

#### 使用自签名证书（测试用）

```bash
mkdir -p docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/privkey.pem \
  -out docker/nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

## 🚀 部署

### 首次部署

```bash
# 1. 加载环境变量
export $(grep -v '^#' .env.prod | xargs)

# 2. 构建镜像
docker compose -f docker-compose.prod.yml build

# 3. 启动服务
docker compose -f docker-compose.prod.yml up -d

# 4. 检查状态
docker compose -f docker-compose.prod.yml ps

# 5. 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

### 创建管理员账户

```bash
# 进入 user-api 容器
docker compose -f docker-compose.prod.yml exec user-api sh

# 使用 Node 创建管理员
node -e "
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAdmin() {
  const hash = await bcrypt.hash('your_admin_password', 10);
  await prisma.user.create({
    data: {
      email: 'admin@your-domain.com',
      username: 'admin',
      passwordHash: hash,
      role: 'admin'
    }
  });
  console.log('Admin created!');
  process.exit(0);
}
createAdmin();
"
```

## 🔄 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署（零停机）
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --no-deps --build

# 清理旧镜像
docker image prune -f
```

## 📊 监控和日志

### 查看服务状态

```bash
docker compose -f docker-compose.prod.yml ps
```

### 查看日志

```bash
# 所有服务日志
docker compose -f docker-compose.prod.yml logs -f

# 特定服务日志
docker compose -f docker-compose.prod.yml logs -f api-gateway
docker compose -f docker-compose.prod.yml logs -f frontend
```

### 资源使用

```bash
docker stats
```

## 🔧 运维操作

### 数据库备份

```bash
# 创建备份
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U news_admin news_app > backup_$(date +%Y%m%d).sql

# 恢复备份
cat backup_20260312.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U news_admin news_app
```

### 重启服务

```bash
# 重启所有服务
docker compose -f docker-compose.prod.yml restart

# 重启特定服务
docker compose -f docker-compose.prod.yml restart api-gateway
```

### 扩展服务

```bash
# 扩展 news-api 到 3 个实例
docker compose -f docker-compose.prod.yml up -d --scale news-api=3
```

## 🛡️ 安全建议

1. **定期更新**
   - 定期更新 Docker 镜像
   - 更新系统安全补丁

2. **访问控制**
   - 不要暴露数据库端口到公网
   - 使用防火墙限制访问

3. **备份策略**
   - 每日自动备份数据库
   - 异地备份重要数据

4. **监控告警**
   - 设置服务健康监控
   - 配置日志告警

5. **密钥管理**
   - 定期更换 JWT 密钥
   - 使用密钥管理服务

## 📁 目录结构

```
/opt/news-app/
├── docker/
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/
│   └── postgres/
│       └── init.sql
├── services/
│   ├── api-gateway/
│   ├── news-api/
│   ├── user-api/
│   ├── admin-api/
│   ├── rss-fetcher/
│   ├── api-fetcher/
│   └── scheduler/
├── frontend/
├── docker-compose.yml        # 开发环境
├── docker-compose.prod.yml   # 生产环境
├── .env.prod                 # 生产环境变量
└── DEPLOYMENT.md             # 本文档
```

## ❓ 常见问题

### Q: 服务启动失败

```bash
# 检查日志
docker compose -f docker-compose.prod.yml logs

# 检查环境变量
docker compose -f docker-compose.prod.yml config
```

### Q: 数据库连接失败

```bash
# 检查数据库状态
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# 检查网络
docker network ls
docker network inspect news-app_backend
```

### Q: SSL 证书问题

```bash
# 检查证书文件
ls -la docker/nginx/ssl/

# 测试 Nginx 配置
docker compose -f docker-compose.prod.yml exec nginx nginx -t
```

---

如有问题，请联系技术支持或查看项目文档。
