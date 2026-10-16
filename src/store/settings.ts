import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'light' | 'dark'

interface SettingsState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

/** The theme actually showing, resolving "system" against the OS preference. */
function resolved(t: Theme): 'light' | 'dark' {
  if (t !== 'system') return t
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(t: Theme) {
  const el = document.documentElement
  if (t === 'system') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', t)
  window.dispatchEvent(new Event('themechange'))
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      toggleTheme: () => get().setTheme(resolved(get().theme) === 'dark' ? 'light' : 'dark'),
    }),
    { name: 'rfo-settings' },
  ),
)
