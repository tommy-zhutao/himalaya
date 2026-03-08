'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { Search, X, Clock, Loader2, TrendingUp, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

interface SearchHistory {
  query: string
  timestamp: number
}

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>(['OpenAI', 'ChatGPT', 'Anthropic', 'DeepSeek', 'Claude'])
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Load search history
  useEffect(() => {
    try {
      const saved = localStorage.getItem('search-history')
      if (saved) {
        const history = JSON.parse(saved)
        setSearchHistory(history.slice(0, 5))
      }
    } catch (e) {
      console.error('Failed to load search history:', e)
    }
  }, [])

  const saveToHistory = (query: string) => {
    if (!query.trim()) return

    const newHistory = [
      { query, timestamp: Date.now() },
      ...searchHistory.filter(item => item.query !== query).slice(0, 4)
    ]
    setSearchHistory(newHistory)

    try {
      localStorage.setItem('search-history', JSON.stringify(newHistory))
    } catch (e) {
      console.error('Failed to save search history:', e)
    }
  }

  // Debounced search
  const debouncedSearch = (value: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(async () => {
      if (value.trim()) {
        await performSearch(value)
      }
    }, 500)

    setDebounceTimer(timer)
  }

  // Auto-show suggestions after 3 characters
  useEffect(() => {
    if (query.length >= 3 && query.length < 6) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [query.length])

  // Keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim()) {
        performSearch(query)
      } else {
        handleClear()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleClear()
    }
  }

  const performSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      saveToHistory(searchQuery)
      
      // Navigate to search page with query
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    } catch (error: any) {
      console.error('Search failed:', error)
      setError('搜索失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    performSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    setShowSuggestions(false)
    setError(null)
  }

  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
  }

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
        {/* Search Icon */}
        <div className="text-gray-400">
          <Search size={20} />
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              debouncedSearch(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder="搜索 AI 新闻..."
            className="w-full px-4 py-2.5 pr-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-blue-500 rounded-md"
          />
          {showSuggestions && (
            <div className="absolute left-0 top-full z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
              <p className="text-xs text-gray-500 px-3 py-2 font-medium">搜索建议：</p>
              <div className="space-y-1">
                {suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="text-left text-sm text-gray-700 hover:text-blue-600 px-3 py-1 hover:bg-blue-50 rounded"
                  >
                    {s}
                  </button>
                ))}
              {suggestions.length > 4 && (
                <div className="text-xs text-gray-400 px-3">
                  ...
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span className="ml-2">搜索中...</span>
            </>
          ) : (
            <>
              <Search size={16} />
              <span>搜索</span>
            </>
          )}
        </button>

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search History */}
      {searchHistory.length > 0 && !query && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 px-2 mb-2">最近搜索：</p>
          <div className="space-y-1">
            {searchHistory.map((item, index) => (
              <button
                key={`${item.query}-${index}`}
                onClick={() => {
                  setQuery(item.query)
                  setShowSuggestions(false)
                }}
                className="text-sm text-gray-600 hover:text-blue-600 px-2 py-1 text-left hover:bg-blue-50 rounded transition-colors"
              >
                <Clock size={12} className="inline mr-1" />
                <span>{item.query}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={12} className="inline mr-1" />
          {error}
        </div>
      )}
    </div>
  )
}
