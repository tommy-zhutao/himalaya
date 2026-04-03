'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  total?: number
  onPageChange: (page: number) => void
  siblingCount?: number // number of page buttons to show around current page, default 1
}

export default function Pagination({ currentPage, totalPages, total, onPageChange, siblingCount = 1 }: PaginationProps) {
  // Don't render if only 1 page
  if (totalPages <= 1) return null

  // Generate page numbers to show
  const getPageNumbers = (): (number | 'ellipsis-left' | 'ellipsis-right')[] => {
    const totalNumbers = siblingCount * 2 + 3 // siblings + first + last + current
    const totalBlocks = totalNumbers + 2 // + 2 for ellipses

    if (totalPages <= totalBlocks) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

    const showLeftEllipsis = leftSiblingIndex > 2
    const showRightEllipsis = rightSiblingIndex < totalPages - 1

    if (!showLeftEllipsis && showRightEllipsis) {
      const leftCount = 3 + 2 * siblingCount
      const leftRange = Array.from({ length: leftCount }, (_, i) => i + 1)
      return [...leftRange, 'ellipsis-right', totalPages]
    }

    if (showLeftEllipsis && !showRightEllipsis) {
      const rightCount = 3 + 2 * siblingCount
      const rightRange = Array.from({ length: rightCount }, (_, i) => totalPages - rightCount + i + 1)
      return [1, 'ellipsis-left', ...rightRange]
    }

    return [1, 'ellipsis-left', ...Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i), 'ellipsis-right', totalPages]
  }

  const pages = getPageNumbers()

  return (
    <div className="flex flex-col items-center gap-3 mt-6 pt-6 border-t border-gray-200">
      {/* Page info */}
      {total !== undefined && (
        <p className="text-sm text-gray-500">共 {total} 条</p>
      )}

      {/* Page buttons */}
      <nav className="flex items-center gap-1" aria-label="分页导航">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="上一页"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">上一页</span>
        </button>

        {/* Page numbers */}
        {pages.map((page, index) => {
          if (page === 'ellipsis-left' || page === 'ellipsis-right') {
            return (
              <span key={page} className="px-2 py-2 text-gray-400">
                <MoreHorizontal size={16} />
              </span>
            )
          }

          const isActive = page === currentPage
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[36px] h-9 px-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          )
        })}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="下一页"
        >
          <span className="hidden sm:inline">下一页</span>
          <ChevronRight size={16} />
        </button>
      </nav>

      {/* Jump to page */}
      {totalPages > 7 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>跳至</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const targetPage = parseInt((e.target as HTMLInputElement).value, 10)
                if (targetPage >= 1 && targetPage <= totalPages) {
                  onPageChange(targetPage)
                }
              }
            }}
            className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span>页</span>
        </div>
      )}
    </div>
  )
}
