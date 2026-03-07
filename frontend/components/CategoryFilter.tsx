'use client'

import { Newspaper } from 'lucide-react'

interface CategoryFilterProps {
  selectedCategory?: string
  onSelectCategory?: (category: string | undefined) => void
}

const categories = [
  { id: 'all', name: '全部', icon: '📰' },
  { id: 'technology', name: '科技', icon: '💻' },
  { id: 'ai', name: 'AI', icon: '🤖' },
  { id: 'business', name: '商业', icon: '💼' },
  { id: 'startups', name: '创业', icon: '🚀' },
  { id: 'finance', name: '金融', icon: '💰' },
]

export default function CategoryFilter({
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 mr-2">
        <Newspaper className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          分类:
        </span>
      </div>

      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() =>
            onSelectCategory?.(
              category.id === 'all' ? undefined : category.id
            )
          }
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            selectedCategory === category.id ||
            (selectedCategory === undefined && category.id === 'all')
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          <span className="mr-1">{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  )
}
