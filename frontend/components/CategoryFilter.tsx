'use client'

interface CategoryFilterProps {
  selectedCategory?: string
  onSelectCategory?: (category: string | undefined) => void
}

const categories = [
  { id: 'all', name: '全部' },
  { id: 'technology', name: '科技' },
  { id: 'ai', name: 'AI' },
  { id: 'business', name: '商业' },
  { id: 'startups', name: '创业' },
  { id: 'finance', name: '金融' },
]

export default function CategoryFilter({
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {categories.map((category) => {
        const isSelected =
          selectedCategory === category.id ||
          (selectedCategory === undefined && category.id === 'all')

        return (
          <button
            key={category.id}
            onClick={() =>
              onSelectCategory?.(
                category.id === 'all' ? undefined : category.id
              )
            }
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
              isSelected
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
