'use client'

import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'

interface SearchBoxProps {
  onSearch?: (query: string) => void
}

export default function SearchBox({ onSearch }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && onSearch) {
      onSearch(query.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div
        className={`relative flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
          isFocused
            ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
            : 'border-gray-200 bg-gray-50 hover:bg-white'
        }`}
      >
        <SearchIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="搜索新闻标题、摘要或内容..."
          className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </form>
  )
}
