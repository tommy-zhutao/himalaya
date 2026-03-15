'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface TrendingTopic {
  keyword: string
  count: number
  avgViews: number
  score: number
  newsIds: number[]
}

interface TrendingResponse {
  data: TrendingTopic[]
  period: { days: number; start: string; end: string }
  total: number
}

export default function TrendingTopics() {
  const [showAll, setShowAll] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trending-topics'],
    queryFn: async () => {
      const res = await fetch('/api/news/trending-topics?limit=15&days=3')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json() as Promise<TrendingResponse>
    },
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="text-orange-500" size={18} />
          <span className="font-semibold text-gray-900">热点话题</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="animate-spin text-orange-500" size={24} />
        </div>
      </div>
    )
  }

  if (isError || !data?.data?.length) {
    return null
  }

  const topics = showAll ? data.data : data.data.slice(0, 8)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-orange-500" size={18} />
          <span className="font-semibold text-gray-900">热点话题</span>
          <span className="text-xs text-gray-500">近3天</span>
        </div>
        {data.data.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showAll ? '收起' : `查看全部 (${data.data.length})`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {topics.map((topic, index) => (
          <Link
            key={topic.keyword}
            href={`/search?q=${encodeURIComponent(topic.keyword)}`}
            className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:shadow-md ${
              index < 3
                ? 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 border border-orange-200 hover:border-orange-300'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {index < 3 && (
              <span className={`font-bold ${index === 0 ? 'text-red-500' : index === 1 ? 'text-orange-500' : 'text-amber-500'}`}>
                {index + 1}
              </span>
            )}
            <span>{topic.keyword}</span>
            <span className="text-xs opacity-60">{topic.count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
