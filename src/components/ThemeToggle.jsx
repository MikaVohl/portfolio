import { useEffect, useRef, useState } from 'react'
import { FiMoon, FiSun } from 'react-icons/fi'

const STORAGE_KEY = 'portfolio-theme'

function readPreference() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  const preference = useRef(readPreference())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#131619' : '#ffffff'
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const followDevice = () => {
      if (!preference.current) setTheme(media.matches ? 'dark' : 'light')
    }
    const syncPreference = (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      preference.current = readPreference()
      setTheme(preference.current || (media.matches ? 'dark' : 'light'))
    }

    media.addEventListener('change', followDevice)
    window.addEventListener('storage', syncPreference)
    return () => {
      media.removeEventListener('change', followDevice)
      window.removeEventListener('storage', syncPreference)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    preference.current = next
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Keep the toggle usable even when preferences cannot be saved.
    }
  }

  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`

  return (
    <button
      type="button"
      className="theme-toggle flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
    </button>
  )
}
