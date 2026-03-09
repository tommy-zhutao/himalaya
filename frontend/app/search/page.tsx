'use client'

import SearchBar from '@/components/SearchBar'
import SearchResults from '@/components/SearchResults'

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            搜索 AI 新闻
          </h1>
          <p className="text-gray-600 mb-4">
            使用关键词搜索最新的 AI 新闻资讯
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar />

        {/* Search Results */}
        <div className="mt-8">
          <SearchResults />
        </div>
      </div>
    </div>
  )
}
