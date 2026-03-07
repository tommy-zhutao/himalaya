import Link from 'next/link'
import { ArrowLeft, Calendar, User, ExternalLink, Share2, Bookmark } from 'lucide-react'

interface NewsDetailProps {
  id: number
  title: string
  content: string
  summary: string
  author: string
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
}

export default function NewsDetail({
  id,
  title,
  content,
  summary,
  author,
  publishedAt,
  source,
  category,
  tags = [],
  viewCount = 0,
}: NewsDetailProps) {
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
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
      alert('链接已复制到剪贴板')
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
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {category}
            </span>
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
        {/* Summary */}
        {summary && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm text-gray-700 leading-relaxed italic">
              {summary}
            </p>
          </div>
        )}

        {/* Full Content */}
        <div className="prose prose-gray max-w-none">
          <div
            className="text-gray-800 leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Source Link */}
        {source?.url && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <a
              href={source.url}
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
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all"
          >
            <Bookmark size={18} />
            <span>收藏</span>
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
