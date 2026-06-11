import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import TickerInput from '../ui/TickerInput'
import './BottomNav.css'

export default function BottomNav() {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [showSearch, setShowSearch] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  function goToResearch(sym: string) {
    const t = sym.trim()
    if (t) {
      navigate(`/research/${t}`)
      setSearchInput('')
      setShowSearch(false)
    }
  }

  return (
    <>
      {showSearch && (
        <div className="bottom-nav-search-overlay" role="dialog" aria-label="Search ticker">
          <TickerInput
            value={searchInput}
            onChange={setSearchInput}
            onEnter={() => goToResearch(searchInput)}
            onSelect={sym => goToResearch(sym)}
            placeholder="Search ticker… (Enter)"
            ariaLabel="Search ticker — press Enter to open research"
            className="bottom-nav-search-input"
            autoFocus
          />
          <button
            className="bottom-nav-search-close"
            onClick={() => { setShowSearch(false); setSearchInput('') }}
            aria-label="Close search"
          >✕</button>
        </div>
      )}

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          aria-label="Portfolio">
          <span aria-hidden="true">▣</span>
        </NavLink>

        <button
          className={`bottom-nav__item${showSearch ? ' bottom-nav__item--active' : ''}`}
          onClick={() => setShowSearch(p => !p)}
          aria-label="Search ticker">
          <span aria-hidden="true">⌕</span>
        </button>

        <NavLink to="/watchlist"
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          aria-label="Watchlist">
          <span aria-hidden="true">◈</span>
        </NavLink>

        <NavLink to="/compare"
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          aria-label="Compare">
          <span aria-hidden="true">⇌</span>
        </NavLink>

        <NavLink to="/trades"
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          aria-label="Trade History">
          <span aria-hidden="true">↕</span>
        </NavLink>

        <NavLink to="/settings"
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          aria-label="Settings">
          <span aria-hidden="true">⚙</span>
        </NavLink>

        <button className="bottom-nav__item" onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
        </button>
      </nav>
    </>
  )
}
