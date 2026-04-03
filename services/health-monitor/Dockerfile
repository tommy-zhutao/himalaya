FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（包括 devDependencies 用于构建）
RUN npm install

# 复制源代码
COPY tsconfig.json ./
COPY src ./src

# 构建
RUN npm run build

# 清理 devDependencies
RUN npm prune --production

# 暴露端口
EXPOSE 4009

# 启动
CMD ["npm", "start"]
