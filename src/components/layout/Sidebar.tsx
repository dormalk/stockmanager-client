import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import TickerInput from '../ui/TickerInput'
import './Sidebar.css'

const COLLAPSE_KEY = 'sidebar_collapsed'

function getStoredCollapse(): boolean {
  return localStorage.getItem(COLLAPSE_KEY) === 'true'
}

export default function Sidebar() {
  const [manualCollapsed, setManualCollapsed] = useState(getStoredCollapse)
  const [tickerInput, setTickerInput] = useState('')
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const isTablet = useMediaQuery('(max-width: 1023px) and (min-width: 768px)')
  const [tabletExpanded, setTabletExpanded] = useState(false)
  const collapsed = isTablet ? !tabletExpanded : manualCollapsed

  function toggleCollapse() {
    if (isTablet) {
      setTabletExpanded(p => !p)
    } else {
      const next = !manualCollapsed
      setManualCollapsed(next)
      localStorage.setItem(COLLAPSE_KEY, String(next))
    }
  }

  function goToResearch(sym: string) {
    const t = sym.trim()
    if (t) {
      navigate(`/research/${t}`)
      setTickerInput('')
    }
  }

  return (
    <aside
      className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}
      aria-label="Main navigation"
    >
      <nav className="sidebar__nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
          aria-label="Portfolio"
        >
          <span className="sidebar__icon" aria-hidden="true">▣</span>
          {!collapsed && <span className="sidebar__label">Portfolio</span>}
        </NavLink>

        {/* Ticker search */}
        {!collapsed ? (
          <div className="sidebar__search">
            <span className="sidebar__icon" aria-hidden="true">⌕</span>
            <TickerInput
              value={tickerInput}
              onChange={setTickerInput}
              onEnter={() => goToResearch(tickerInput)}
              onSelect={sym => goToResearch(sym)}
              placeholder="Search ticker…"
              ariaLabel="Search ticker — press Enter to open research"
              className="sidebar__ticker-input"
            />
          </div>
        ) : (
          <div className="sidebar__search">
            <button
              className="sidebar__icon-btn"
              aria-label="Search ticker"
              onClick={toggleCollapse}
            >
              ⌕
            </button>
          </div>
        )}

        <NavLink
          to="/watchlist"
          className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
          aria-label="Watchlist"
        >
          <span className="sidebar__icon" aria-hidden="true">◈</span>
          {!collapsed && <span className="sidebar__label">Watchlist</span>}
        </NavLink>

        <NavLink
          to="/compare"
          className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
          aria-label="Compare"
        >
          <span className="sidebar__icon" aria-hidden="true">⇌</span>
          {!collapsed && <span className="sidebar__label">Compare</span>}
        </NavLink>

        <NavLink
          to="/trades"
          className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
          aria-label="Trade History"
        >
          <span className="sidebar__icon" aria-hidden="true">↕</span>
          {!collapsed && <span className="sidebar__label">Trade History</span>}
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar__icon-btn${isActive ? ' sidebar__icon-btn--active' : ''}`}
          aria-label="Settings"
          title="Settings"
        >
          ⚙
        </NavLink>
        <button
          className="sidebar__icon-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <button
          className="sidebar__icon-btn sidebar__collapse-btn"
          onClick={toggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>
    </aside>
  )
}
