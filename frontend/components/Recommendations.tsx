'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Sparkles, Loader2 } from 'lucide-react'
import { getRecommendations } from '@/lib/news'
import { useAuthStore } from '@/lib/stores/authStore'

export default function Recommendations() {
  const { isAuthenticated } = useAuthStore()

  // Only fetch recommendations for logged-in users
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => getRecommendations(5),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Don't show for non-logged-in users
  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-purple-500" size={18} />
          <span className="font-semibold text-gray-900">为你推荐</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="animate-spin text-purple-500" size={24} />
        </div>
      </div>
    )
  }

  if (isError || !data?.data?.length) {
    return null
  }

  const recommendations = data.data

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-6 border border-purple-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-500" size={18} />
          <span className="font-semibold text-gray-900">为你推荐</span>
          {data.reason === 'hot' && (
            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
              热门推荐
            </span>
          )}
        </div>
        <Link href="/recommendations" className="text-sm text-purple-600 hover:text-purple-700">
          查看更多 →
        </Link>
      </div>

      <div className="space-y-3">
        {recommendations.map((news) => (
          <Link
            key={news.id}
            href={`/news/${news.id}`}
            className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="flex gap-3">
              {news.imageUrl && (
                <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                  <img
                    src={news.imageUrl}
                    alt={news.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                  {news.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {news.source?.name && (
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                      {news.source.name}
                    </span>
                  )}
                  {news.category && (
                    <span className="text-purple-600">{news.category}</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
