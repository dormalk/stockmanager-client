import { useState, useCallback } from 'react'

type Theme = 'dark' | 'light'

function applyTheme(theme: Theme) {
  const html = document.documentElement
  html.classList.remove('dark', 'light')
  html.classList.add(theme)
  localStorage.setItem('theme', theme)
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem('theme')
  return stored === 'light' ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }, [theme])

  return { theme, toggleTheme }
}
