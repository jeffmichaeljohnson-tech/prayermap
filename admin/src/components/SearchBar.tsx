/**
 * Admin Search Bar
 * Global search across users, prayers, and reports
 * Features debounced search, keyboard navigation, and click-outside dismiss
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch, type SearchResult } from '../hooks/useSearch'

// Icons as inline SVGs to avoid external dependencies
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const LoaderIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const FileTextIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const FlagIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
)

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Debounce the search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Use the search hook with debounced query
  const { data: results = [], isLoading } = useSearch({ 
    query: debouncedQuery, 
    enabled: showResults && debouncedQuery.length >= 2 
  })

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Navigate to result
  const navigateToResult = useCallback((result: SearchResult) => {
    setShowResults(false)
    setQuery('')
    setSelectedIndex(-1)

    switch (result.type) {
      case 'user':
        navigate('/admin/users', { state: { highlightId: result.id } })
        break
      case 'prayer':
        navigate('/admin/prayers', { state: { highlightId: result.id } })
        break
      case 'report':
        navigate('/admin/moderation', { state: { highlightId: result.id } })
        break
    }
  }, [navigate])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          navigateToResult(results[selectedIndex])
        }
        break
      case 'Escape':
        setShowResults(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }, [showResults, results, selectedIndex, navigateToResult])

  // Get icon for result type
  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return <UserIcon />
      case 'prayer': return <FileTextIcon />
      case 'report': return <FlagIcon />
    }
  }

  // Get icon background color
  const getIconBgClass = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return 'bg-blue-100 text-blue-600'
      case 'prayer': return 'bg-purple-100 text-purple-600'
      case 'report': return 'bg-red-100 text-red-600'
    }
  }

  const clearSearch = () => {
    setQuery('')
    setDebouncedQuery('')
    setShowResults(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? <LoaderIcon /> : <SearchIcon />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search users, prayers, reports..."
          className="w-64 pl-10 pr-8 py-2 bg-gray-100 rounded-lg text-sm 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white
            transition-colors"
          aria-label="Search admin content"
          aria-expanded={showResults}
          aria-haspopup="listbox"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 
              hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (query.length >= 2 || results.length > 0) && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg 
            shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50"
          role="listbox"
        >
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <LoaderIcon />
                <span className="text-sm">Searching...</span>
              </div>
            </div>
          ) : query.length < 2 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => navigateToResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-2 flex items-center gap-3 text-left
                    transition-colors ${
                      index === selectedIndex 
                        ? 'bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <div className={`p-2 rounded-lg ${getIconBgClass(result.type)}`}>
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {result.subtitle}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 capitalize px-2 py-1 bg-gray-100 rounded">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

