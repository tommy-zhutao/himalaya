#!/bin/bash

# AI News Hub - 应用 Editorial 风格重新设计
# 用法: bash scripts/apply-redesign.sh

set -e

FRONTEND_DIR="/root/.openclaw/workspace/news-app/frontend"
BACKUP_DIR="${FRONTEND_DIR}/.backup-$(date +%Y%m%d-%H%M%S)"

echo "📦 开始应用 Editorial 风格重新设计..."
echo ""

# Step 1: 创建备份目录
echo "📁 创建备份目录: ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}/app"
mkdir -p "${BACKUP_DIR}/components"

# Step 2: 备份现有文件
echo "💾 备份现有文件..."
cp "${FRONTEND_DIR}/app/page.tsx" "${BACKUP_DIR}/app/page.tsx" 2>/dev/null || true
cp "${FRONTEND_DIR}/app/globals.css" "${BACKUP_DIR}/app/globals.css" 2>/dev/null || true
cp "${FRONTEND_DIR}/components/NewsCard.tsx" "${BACKUP_DIR}/components/NewsCard.tsx" 2>/dev/null || true
cp "${FRONTEND_DIR}/components/CategoryFilter.tsx" "${BACKUP_DIR}/components/CategoryFilter.tsx" 2>/dev/null || true
cp "${FRONTEND_DIR}/components/SearchBox.tsx" "${BACKUP_DIR}/components/SearchBox.tsx" 2>/dev/null || true

echo "✅ 备份完成"
echo ""

# Step 3: 应用新文件
echo "🔄 应用新设计文件..."

# 检查并应用重新设计的文件
if [ -f "${FRONTEND_DIR}/app/page-redesigned.tsx" ]; then
  mv "${FRONTEND_DIR}/app/page-redesigned.tsx" "${FRONTEND_DIR}/app/page.tsx"
  echo "   ✓ page.tsx"
fi

if [ -f "${FRONTEND_DIR}/app/globals-redesigned.css" ]; then
  mv "${FRONTEND_DIR}/app/globals-redesigned.css" "${FRONTEND_DIR}/app/globals.css"
  echo "   ✓ globals.css"
fi

if [ -f "${FRONTEND_DIR}/components/NewsCard-redesigned.tsx" ]; then
  mv "${FRONTEND_DIR}/components/NewsCard-redesigned.tsx" "${FRONTEND_DIR}/components/NewsCard.tsx"
  echo "   ✓ NewsCard.tsx"
fi

if [ -f "${FRONTEND_DIR}/components/CategoryFilter-redesigned.tsx" ]; then
  mv "${FRONTEND_DIR}/components/CategoryFilter-redesigned.tsx" "${FRONTEND_DIR}/components/CategoryFilter.tsx"
  echo "   ✓ CategoryFilter.tsx"
fi

if [ -f "${FRONTEND_DIR}/components/SearchBar-redesigned.tsx" ]; then
  mv "${FRONTEND_DIR}/components/SearchBar-redesigned.tsx" "${FRONTEND_DIR}/components/SearchBox.tsx"
  echo "   ✓ SearchBox.tsx"
fi

echo ""
echo "✅ 新设计文件已应用"
echo ""

# Step 4: 检查设计系统文件
if [ ! -f "${FRONTEND_DIR}/app/design-system.css" ]; then
  echo "⚠️  警告: design-system.css 未找到"
else
  echo "✅ 设计系统文件已就绪"
fi

# Step 5: 完成
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Editorial 风格重新设计应用完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 备份位置: ${BACKUP_DIR}"
echo ""
echo "🚀 下一步:"
echo "   1. cd ${FRONTEND_DIR}"
echo "   2. npm run dev"
echo "   3. 访问 http://localhost:3000"
echo ""
echo "📖 查看详细文档: docs/design-redesign-summary.md"
echo ""
echo "🔄 如需回滚: bash scripts/rollback-redesign.sh ${BACKUP_DIR##*/}"
echo ""
