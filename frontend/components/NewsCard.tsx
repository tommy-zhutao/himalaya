import Link from 'next/link'

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
}: NewsCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return {
      text: '刚刚',
      className: 'text-green-600'
    }
    if (diffInHours < 24) return {
      text: `${diffInHours} 小时前`,
      className: 'text-blue-600'
    }
    if (diffInHours < 48) return {
      text: '昨天',
      className: 'text-gray-600'
    }
    return {
      text: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      className: 'text-gray-600'
    }
  }

  const timeInfo = formatDate(publishedAt)

  return (
    <Link href={`/news/${id}`}>
      <div className="group flex flex-col gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer bg-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Source & Category */}
            <div className="flex items-center gap-2 mb-2 text-xs">
              {source && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {source.name}
                </span>
              )}
              {category && (
                <span className="text-gray-500">
                  ·{category}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 leading-snug">
              {title}
            </h3>
          </div>

          {/* Image */}
          {imageUrl && (
            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Summary */}
        {summary && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {summary}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{author}</span>
            {timeInfo && (
      <>
                <span>·</span>
                <span className={timeInfo.className}>{timeInfo.text}</span>
      </>
            )}
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex items-center gap-1">
              {tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
