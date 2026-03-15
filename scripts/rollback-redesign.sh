#!/bin/bash

# AI News Hub - 回滚到原始设计
# 用法: bash scripts/rollback-redesign.sh [backup-directory-name]

set -e

FRONTEND_DIR="/root/.openclaw/workspace/news-app/frontend"
BACKUP_DIR="${FRONTEND_DIR}/.backup-${1}"

if [ -z "$1" ]; then
  echo "❌ 错误: 请指定备份目录名称"
  echo ""
  echo "用法: bash scripts/rollback-redesign.sh <backup-directory-name>"
  echo ""
  echo "可用的备份目录:"
  ls -d "${FRONTEND_DIR}"/.backup-* 2>/dev/null | xargs -n1 basename || echo "  (无备份)"
  exit 1
fi

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "❌ 错误: 备份目录不存在: ${BACKUP_DIR}"
  exit 1
fi

echo "🔄 开始回滚到原始设计..."
echo ""

echo "📁 使用备份: ${BACKUP_DIR}"
echo ""

# 恢复文件
echo "📋 恢复文件..."

if [ -f "${BACKUP_DIR}/app/page.tsx" ]; then
  cp "${BACKUP_DIR}/app/page.tsx" "${FRONTEND_DIR}/app/page.tsx"
  echo "   ✓ page.tsx"
fi

if [ -f "${BACKUP_DIR}/app/globals.css" ]; then
  cp "${BACKUP_DIR}/app/globals.css" "${FRONTEND_DIR}/app/globals.css"
  echo "   ✓ globals.css"
fi

if [ -f "${BACKUP_DIR}/components/NewsCard.tsx" ]; then
  cp "${BACKUP_DIR}/components/NewsCard.tsx" "${FRONTEND_DIR}/components/NewsCard.tsx"
  echo "   ✓ NewsCard.tsx"
fi

if [ -f "${BACKUP_DIR}/components/CategoryFilter.tsx" ]; then
  cp "${BACKUP_DIR}/components/CategoryFilter.tsx" "${FRONTEND_DIR}/components/CategoryFilter.tsx"
  echo "   ✓ CategoryFilter.tsx"
fi

if [ -f "${BACKUP_DIR}/components/SearchBox.tsx" ]; then
  cp "${BACKUP_DIR}/components/SearchBox.tsx" "${FRONTEND_DIR}/components/SearchBox.tsx"
  echo "   ✓ SearchBox.tsx"
fi

echo ""
echo "✅ 回滚完成"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 原始设计已恢复"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 下一步: cd ${FRONTEND_DIR} && npm run dev"
echo ""
