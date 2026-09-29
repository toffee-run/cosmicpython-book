import { useEffect, useState } from 'react'

export const themeScript = `(()=>{let t;try{t=localStorage.getItem('reader-theme')}catch{}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()`

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    setDark(document.documentElement.dataset.theme === 'dark')
    function followSystem() {
      try { if (localStorage.getItem('reader-theme')) return } catch { /* Storage may be disabled. */ }
      document.documentElement.dataset.theme = media.matches ? 'dark' : 'light'
      setDark(media.matches)
    }
    media.addEventListener('change', followSystem)
    // The system preference may have changed between the head script and hydration.
    followSystem()
    return () => media.removeEventListener('change', followSystem)
  }, [])
  function toggle() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setDark(next === 'dark')
    try { localStorage.setItem('reader-theme', next) } catch { /* Theme still works for this page. */ }
  }
  return <button className="theme-toggle" type="button" onClick={toggle} aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'} aria-pressed={dark}>
    <span aria-hidden="true">{dark ? '☀' : '☾'}</span> {dark ? 'Светлая тема' : 'Тёмная тема'}
  </button>
}
