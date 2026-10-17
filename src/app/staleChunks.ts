import { lazy, type ComponentType } from 'react'

/*
 * Every deploy renames the code-split chunks. A tab (or service worker) still running the
 * previous build then asks for chunk files that no longer exist, and the import fails.
 * The cure is to reload once onto the current build. A timestamp in sessionStorage stops a
 * genuinely broken chunk from causing a reload loop.
 */

const KEY = 'rfo-chunk-reload'
const WINDOW_MS = 30_000

/** True for the errors browsers raise when a dynamically imported file can't be fetched. */
export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk \S+ failed/i.test(
    msg,
  )
}

/** Reload onto the current build, unless we already tried in the last 30 s. Returns whether it reloaded. */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0)
    if (Date.now() - last < WINDOW_MS) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* storage blocked: still try once */
  }
  window.location.reload()
  return true
}

/** Vite reports failed dynamic imports with this event; recover instead of crashing. */
export function installStaleChunkRecovery() {
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadForNewBuild()) e.preventDefault()
  })
}

/** React.lazy that reloads onto the new build when its chunk has gone missing. */
export function lazyWithReload<P>(load: () => Promise<{ default: ComponentType<P> }>) {
  return lazy<ComponentType<P>>(() =>
    load().catch((err) => {
      if (isChunkLoadError(err) && reloadForNewBuild()) return new Promise<never>(() => {})
      throw err
    }),
  )
}
