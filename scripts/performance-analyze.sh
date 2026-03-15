#!/bin/bash

# 性能分析脚本
# 用法: ./scripts/performance-analyze.sh

set -e

echo "======================================"
echo "  AI News Hub - 性能分析工具"
echo "======================================"
echo ""

# 检查数据库连接
echo "📊 检查数据库连接..."
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败，请确保 Docker 容器正在运行"
    exit 1
fi

echo ""
echo "📈 数据库统计信息"
echo "--------------------"

# 表大小统计
echo ""
echo "表大小统计:"
docker-compose exec -T postgres psql -U postgres -d news_app -c "
SELECT 
    schemename,
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    pg_size_pretty(pg_relation_size(relid)) as table_size,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
"

# 新闻统计
echo ""
echo "新闻统计:"
docker-compose exec -T postgres psql -U postgres -d news_app -c "
SELECT 
    COUNT(*) as total_news,
    COUNT(*) FILTER (WHERE published_at > NOW() - INTERVAL '24 hours') as news_24h,
    COUNT(*) FILTER (WHERE published_at > NOW() - INTERVAL '7 days') as news_7d,
    COUNT(*) FILTER (WHERE analyzed_at IS NOT NULL) as analyzed_news
FROM news;
"

# 索引使用情况
echo ""
echo "索引使用情况:"
docker-compose exec -T postgres psql -U postgres -d news_app -c "
SELECT 
    indexrelname as index_name,
    relname as table_name,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 15;
"

# 未使用的索引
echo ""
echo "⚠️  未使用的索引（可能需要优化）:"
docker-compose exec -T postgres psql -U postgres -d news_app -c "
SELECT 
    schemaname || '.' || relname AS table,
    indexrelname AS index,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan as index_scans
FROM pg_stat_user_indexes
JOIN pg_index USING (indexrelid)
WHERE idx_scan = 0 AND indisunique = false
ORDER BY pg_relation_size(indexrelid) DESC;
"

# 缓存命中率
echo ""
echo "缓存命中率:"
docker-compose exec -T postgres psql -U postgres -d news_app -c "
SELECT 
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    round((sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2) as ratio
FROM pg_statio_user_tables;
"

# 慢查询（需要 pg_stat_statements 扩展）
echo ""
echo "慢查询统计（如果已启用 pg_stat_statements）:"
docker-compose exec -T postgres psql -U postgres -d news_app -c "
SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
);" | grep -q "t" && {
    docker-compose exec -T postgres psql -U postgres -d news_app -c "
    SELECT 
        calls,
        round(total_exec_time::numeric, 2) as total_time_ms,
        round(mean_exec_time::numeric, 2) as avg_time_ms,
        round((100 * total_exec_time / sum(total_exec_time) over ())::numeric, 2) as percent,
        query
    FROM pg_stat_statements
    ORDER BY total_exec_time DESC
    LIMIT 5;
    " 2>/dev/null || echo "需要启用 pg_stat_statements 扩展"
} || echo "pg_stat_statements 未启用"

# Redis 状态（如果可用）
echo ""
echo "📦 Redis 状态:"
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis 运行中"
    docker-compose exec -T redis redis-cli INFO stats 2>/dev/null | grep -E "keyspace_hits|keyspace_misses|instantaneous_ops_per_sec" || true
else
    echo "⚠️  Redis 未运行或未配置"
fi

echo ""
echo "======================================"
echo "  分析完成！"
echo "======================================"
echo ""
echo "💡 优化建议:"
echo "  1. 检查未使用的索引，考虑删除"
echo "  2. 如果缓存命中率 < 95%，考虑增加 shared_buffers"
echo "  3. 定期运行 VACUUM ANALYZE 优化表"
echo "  4. 使用 EXPLAIN ANALYZE 分析慢查询"
echo ""
