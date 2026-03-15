import Link from 'next/link'
import { ExternalLink, Clock, Bookmark, Sparkles, TrendingUp, Minus, TrendingDown } from 'lucide-react'

interface NewsCardProps {
  id: number
  title: string
  summary: string
  author: string
  source?: {
    id: number
    name: string
    type: string
  }
  publishedAt?: string
  imageUrl?: string | null
  category?: string | null
  tags?: string[]
  // AI 分析字段
  keywords?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral' | null
  qualityScore?: number | null
}

export default function NewsCard({
  id,
  title,
  summary,
  author,
  source,
  publishedAt,
  imageUrl,
  category,
  tags = [],
  keywords,
  sentiment,
  qualityScore,
}: NewsCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return {
      text: '刚刚',
      isFresh: true
    }
    if (diffInHours < 24) return {
      text: `${diffInHours}小时前`,
      isFresh: true
    }
    if (diffInHours < 48) return {
      text: '昨天',
      isFresh: false
    }
    return {
      text: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      isFresh: false
    }
  }

  const timeInfo = formatDate(publishedAt)
  const categoryColors: Record<string, string> = {
    'technology': 'bg-emerald-600',
    'ai': 'bg-violet-600',
    'business': 'bg-orange-500',
    'startups': 'bg-amber-600',
    'finance': 'bg-blue-600',
  }
  const categoryNames: Record<string, string> = {
    'technology': '科技',
    'ai': 'AI',
    'business': '商业',
    'startups': '创业',
    'finance': '金融',
  }

  return (
    <Link href={`/news/${id}`} className="group block">
      <article className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100">
        {/* Mobile: Image on top, Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row">
          {/* Image - Mobile: top, Desktop: right */}
          {imageUrl ? (
            <div className="w-full sm:w-40 md:w-48 h-40 sm:h-auto flex-shrink-0 overflow-hidden">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ) : null}
          
          {/* Content */}
          <div className="flex-1 p-4 flex flex-col min-w-0">
            {/* Meta Bar */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Category */}
              {category && (
                <span
                  className={`text-xs font-medium text-white px-2 py-0.5 rounded ${
                    categoryColors[category] || 'bg-gray-500'
                  }`}
                >
                  {categoryNames[category] || category}
                </span>
              )}
              {/* Source */}
              {source && (
                <span className="text-xs text-gray-500">
                  {source.name}
                </span>
              )}
              {/* Time */}
              {timeInfo && (
                <span className={`text-xs ${timeInfo.isFresh ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                  {timeInfo.text}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base md:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
              {title}
            </h3>

            {/* Summary */}
            {summary && (
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed flex-1">
                {summary}
              </p>
            )}

            {/* AI Keywords */}
            {keywords && keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.slice(0, 3).map((keyword, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-50 to-blue-50 text-purple-600 border border-purple-100"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{author}</span>
                {/* Sentiment Badge */}
                {sentiment && (
                  <span className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
                    sentiment === 'positive' ? 'bg-green-50 text-green-600' :
                    sentiment === 'negative' ? 'bg-red-50 text-red-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {sentiment === 'positive' && <TrendingUp size={10} />}
                    {sentiment === 'negative' && <TrendingDown size={10} />}
                    {sentiment === 'neutral' && <Minus size={10} />}
                    {sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '负面' : '中性'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Quality Score */}
                {qualityScore !== null && qualityScore !== undefined && qualityScore > 0 && (
                  <span className="text-xs text-amber-500 flex items-center gap-0.5">
                    <Sparkles size={10} />
                    {qualityScore}
                  </span>
                )}
                {timeInfo && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {timeInfo.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
