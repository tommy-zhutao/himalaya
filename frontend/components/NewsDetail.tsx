'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, ExternalLink, Share2, Bookmark, Loader2, Sparkles, TrendingUp, Minus, TrendingDown } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { addFavorite, removeFavorite, checkFavorite } from '@/lib/favorites'
import { recordRead } from '@/lib/news'

interface NewsDetailProps {
  id: number
  title: string
  content: string
  summary: string
  author: string
  url?: string  // 原文链接
  publishedAt?: string
  source?: {
    id: number
    name: string
    type: string
    url?: string
  }
  category?: string | null
  tags?: string[]
  viewCount?: number
  // AI 分析字段
  aiSummary?: string | null
  keywords?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral' | null
  qualityScore?: number | null
}

export default function NewsDetail({
  id,
  title,
  content,
  summary,
  author,
  url,  // 原文链接
  publishedAt,
  source,
  category,
  tags = [],
  viewCount = 0,
  aiSummary,
  keywords,
  sentiment,
  qualityScore,
}: NewsDetailProps) {
  const { isAuthenticated } = useAuthStore()
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  // Check if news is favorited
  useEffect(() => {
    if (isAuthenticated) {
      checkFavorite(id).then(res => setIsFavorite(res.isFavorite))
      // Record read history
      recordRead(id).catch(() => {}) // Ignore errors
    }
  }, [id, isAuthenticated])

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: summary,
          url: window.location.href,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('链接已复制到剪贴板')
    }
  }

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      alert('请先登录')
      return
    }

    setFavoriteLoading(true)
    try {
      if (isFavorite) {
        await removeFavorite(id)
        setIsFavorite(false)
      } else {
        await addFavorite(id)
        setIsFavorite(true)
      }
    } catch (error) {
      console.error('Favorite error:', error)
      alert('操作失败，请稍后重试')
    } finally {
      setFavoriteLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          返回列表
        </Link>

        {/* Category */}
        {category && (
          <div className="mb-3">
            <Link
              href={`/category/${category}`}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              {category}
            </Link>
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
          {title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          {source && (
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>{author}</span>
              {source.name && (
                <>
                  <span>·</span>
                  <Link
                    href={source.url || '#'}
                    target={source.url ? '_blank' : undefined}
                    className="hover:text-blue-600"
                  >
                    {source.name}
                  </Link>
                </>
              )}
            </div>
          )}

          {publishedAt && (
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{formatDate(publishedAt)}</span>
            </div>
          )}

          {viewCount > 0 && (
            <div className="flex items-center gap-2">
              <span>👁️</span>
              <span>{viewCount} 次浏览</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* AI Analysis Section */}
        {(aiSummary || (keywords && keywords.length > 0) || sentiment || qualityScore) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-xl border border-purple-100">
            {/* AI Badge */}
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-purple-500" size={16} />
              <span className="text-sm font-medium text-purple-600">AI 智能分析</span>
            </div>

            {/* AI Summary */}
            {aiSummary && (
              <div className="mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {aiSummary}
                </p>
              </div>
            )}

            {/* AI Keywords & Metrics Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Keywords */}
              {keywords && keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 rounded-full bg-white text-purple-600 border border-purple-200 shadow-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}

              {/* Sentiment Badge */}
              {sentiment && (
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  sentiment === 'positive' ? 'bg-green-100 text-green-700 border border-green-200' :
                  sentiment === 'negative' ? 'bg-red-100 text-red-700 border border-red-200' :
                  'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {sentiment === 'positive' && <TrendingUp size={12} />}
                  {sentiment === 'negative' && <TrendingDown size={12} />}
                  {sentiment === 'neutral' && <Minus size={12} />}
                  {sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '负面' : '中性'}
                </span>
              )}

              {/* Quality Score */}
              {qualityScore !== null && qualityScore !== undefined && qualityScore > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  <Sparkles size={12} />
                  <span>质量评分: {qualityScore}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm text-gray-700 leading-relaxed italic">
              {summary}
            </p>
          </div>
        )}

        {/* Full Content */}
        {content ? (
          <div className="prose prose-gray max-w-none">
            <div
              className="text-gray-800 leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <p className="text-gray-600 mb-4">该新闻暂无正文内容</p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <ExternalLink size={18} />
                查看原文
              </a>
            )}
          </div>
        )}

        {/* Source Link */}
        {content && url && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <ExternalLink size={16} />
              查看原文
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-3">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all"
          >
            <Share2 size={18} />
            <span>分享</span>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={handleFavorite}
            disabled={favoriteLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isFavorite
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500 hover:text-blue-600'
            } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {favoriteLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Bookmark size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            )}
            <span>{isFavorite ? '已收藏' : '收藏'}</span>
          </button>

          {/* Copy Link Button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              alert('链接已复制到剪贴板')
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all"
          >
            <ExternalLink size={18} />
            <span>复制链接</span>
          </button>
        </div>
      </div>
    </div>
  )
}
