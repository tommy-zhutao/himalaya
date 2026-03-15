'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { Search, X, Clock, Loader2 } from 'lucide-react'
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
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([
    'OpenAI', 'ChatGPT', 'Anthropic', 'DeepSeek', 'Claude'
  ])
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

  useEffect(() => {
    if (query.length >= 3 && query.length < 6) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [query.length])

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

    try {
      saveToHistory(searchQuery)
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    } catch (error: any) {
      console.error('Search failed:', error)
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
  }

  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    performSearch(suggestion)
  }

  return (
    <div className="w-full">
      {/* Search Input Container */}
      <div className="relative flex items-center border-2 border-editorial focus-within:border-ink transition-colors duration-200 bg-white">
        {/* Search Icon */}
        <div className="pl-4 text-ink-muted">
          <Search size={20} strokeWidth={1.5} />
        </div>

        {/* Search Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            debouncedSearch(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder="搜索新闻..."
          className="flex-1 px-4 py-3 text-ink placeholder:text-ink-muted focus:outline-none body-lg"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="px-3 text-ink-muted hover:text-ink transition-colors"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        )}

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className={`editorial-btn editorial-btn-primary px-5 py-3 rounded-none ${
            loading || !query.trim() ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Search size={18} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute left-0 top-full z-10 w-full mt-2 bg-white border border-editorial shadow-card">
          <div className="px-4 py-2 border-b border-editorial">
            <span className="label-uppercase text-ink-muted">搜索建议</span>
          </div>
          <div className="py-2">
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="w-full text-left px-4 py-2 body-md text-ink-light hover:bg-gray-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && !query && !showSuggestions && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-ink-muted" />
            <span className="label-uppercase text-ink-muted">最近搜索</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item, index) => (
              <button
                key={`${item.query}-${index}`}
                onClick={() => {
                  setQuery(item.query)
                  performSearch(item.query)
                }}
                className="editorial-tag bg-transparent text-ink-light border border-editorial hover:border-ink hover:text-ink"
              >
                {item.query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
