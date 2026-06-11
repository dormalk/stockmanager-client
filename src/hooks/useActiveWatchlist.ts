import { useState } from 'react'

const STORAGE_KEY = 'active_watchlist_id'
const DEFAULT_ID = 1

function readStored(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? parseInt(raw, 10) : NaN
    return isNaN(parsed) ? DEFAULT_ID : parsed
  } catch {
    return DEFAULT_ID
  }
}

export function useActiveWatchlist(): { activeId: number; setActiveId: (id: number) => void } {
  const [activeId, setActiveIdState] = useState<number>(readStored)

  function setActiveId(id: number) {
    try { localStorage.setItem(STORAGE_KEY, String(id)) } catch { /* storage unavailable */ }
    setActiveIdState(id)
  }

  return { activeId, setActiveId }
}
