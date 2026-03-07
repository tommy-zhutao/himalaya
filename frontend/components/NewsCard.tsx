import Link from 'next/link'
import { News } from '@/lib/news'
import { Clock, Eye, ExternalLink } from 'lucide-react'

interface NewsCardProps {
  news: News
}

export default function NewsCard({ news }: NewsCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    return '刚刚'
  }

  return (
    <article className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100">
      {news.imageUrl && (
        <div className="aspect-video bg-gray-100 overflow-hidden">
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          {news.source && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
              {news.source.name}
            </span>
          )}
          {news.category && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              {news.category}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs">
            <Clock size={12} />
            {formatDate(news.publishedAt || news.createdAt)}
          </span>
        </div>

        <Link href={`/news/${news.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer">
            {news.title}
          </h3>
        </Link>

        {news.summary && (
          <p className="text-gray-600 text-sm line-clamp-3 mb-4">{news.summary}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {news.viewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {news.viewCount}
              </span>
            )}
            {news.tags.length > 0 && (
              <div className="flex gap-1">
                {news.tags.slice(0, 2).map((tag, index) => (
                  <span key={index} className="text-xs text-gray-400">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="阅读原文"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </article>
  )
}
