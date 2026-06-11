import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiBase } from '../../api/client'
import './TickerInput.css'

// Hebrew keyboard → English key position mapping (Israeli standard layout)
const HEBREW_TO_EN: Record<string, string> = {
  'ק': 'E', 'ר': 'R', 'א': 'T', 'ט': 'Y', 'ו': 'U',
  'ן': 'I', 'ם': 'O', 'פ': 'P', 'ש': 'A', 'ד': 'S',
  'ג': 'D', 'כ': 'F', 'ע': 'G', 'י': 'H', 'ח': 'J',
  'ל': 'K', 'ך': 'L', 'ז': 'Z', 'ס': 'X', 'ב': 'C',
  'ה': 'V', 'נ': 'B', 'מ': 'N', 'צ': 'M',
}

function sanitize(raw: string): string {
  return raw
    .split('')
    .map(ch => HEBREW_TO_EN[ch] ?? ch)
    .join('')
    .replace(/[^A-Za-z0-9.\-]/g, '')
    .toUpperCase()
}

interface SearchResult { symbol: string; name: string; exchange: string }

async function fetchSearch(q: string): Promise<SearchResult[]> {
  if (!q) return []
  const res = await fetch(`${apiBase}/api/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) return []
  return res.json()
}

interface Props {
  value: string
  onChange: (val: string) => void
  onEnter?: () => void
  onSelect?: (symbol: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
  id?: string
  autoFocus?: boolean
  maxLength?: number
}

export default function TickerInput({
  value,
  onChange,
  onEnter,
  onSelect,
  placeholder = 'TICKER',
  className = '',
  ariaLabel,
  id,
  autoFocus,
  maxLength = 10,
}: Props) {
  const [focused, setFocused] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [debouncedQ, setDebouncedQ] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Debounce search query
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQ(value), 220)
    return () => clearTimeout(timerRef.current)
  }, [value])

  const { data: results = [], isFetching } = useQuery<SearchResult[]>({
    queryKey: ['ticker-search', debouncedQ],
    queryFn: () => fetchSearch(debouncedQ),
    enabled: focused && debouncedQ.length >= 1,
    staleTime: 30_000,
    retry: false,
  })

  // Show spinner while debounce pending OR while fetch in flight
  const isSearching = focused && value.length >= 1 && (value !== debouncedQ || isFetching)
  const showDropdown = focused && results.length > 0 && !isSearching

  function handleChange(raw: string) {
    onChange(sanitize(raw))
    setActiveIdx(-1)
  }

  function pick(r: SearchResult) {
    onChange(r.symbol)
    setDebouncedQ(r.symbol)
    setFocused(false)
    setActiveIdx(-1)
    onSelect?.(r.symbol)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && results[activeIdx]) {
        e.preventDefault()
        pick(results[activeIdx])
      } else {
        onEnter?.()
      }
    } else if (e.key === 'Escape') {
      setFocused(false)
      setActiveIdx(-1)
    }
  }

  return (
    <div className={`ticker-input-wrap${isSearching ? ' ticker-input-wrap--loading' : ''}`}>
      <input
        id={id}
        className={`field__input ticker-input ${className}`}
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { setFocused(true); setActiveIdx(-1) }}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
      />
      {showDropdown && (
        <div className="ticker-dropdown" role="listbox" aria-label="Ticker suggestions">
          {results.map((r, i) => (
            <button
              key={r.symbol}
              className={`ticker-dropdown-item${i === activeIdx ? ' ticker-dropdown-item--active' : ''}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => pick(r)}
              tabIndex={-1}
            >
              <span className="ticker-dropdown-symbol">{r.symbol}</span>
              <span className="ticker-dropdown-name text-caption color-muted" title={r.name}>
                {r.name}
              </span>
              <span className="ticker-dropdown-exch text-caption color-muted">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
