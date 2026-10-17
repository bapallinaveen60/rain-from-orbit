import { createHashRouter } from 'react-router-dom'
import { RouteError } from './ErrorScreen'
import { GlossaryPage } from './GlossaryPage'
import { isChunkLoadError, reloadForNewBuild } from './staleChunks'
import { AppShell } from './layout/AppShell'
import { BookLayout } from './layout/BookLayout'
import { NotesPage } from './NotesPage'
import { Fallback, Home } from './Redirects'
import { ReviewPage } from './ReviewPage'

// Hash routing keeps deep links working on static hosts (GitHub Pages) with no rewrites.
export const router = createHashRouter([
  { path: '/', element: <Home />, errorElement: <RouteError /> },
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: '/ch/:ch/:pg', element: <BookLayout /> },
      { path: '/glossary', element: <GlossaryPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/notes', element: <NotesPage /> },
      // The explorer pulls in h5wasm (several MB); load it only when visited.
      {
        path: '/explore',
        lazy: async () => {
          try {
            return { Component: (await import('../granule/ExplorerPage')).ExplorerPage }
          } catch (err) {
            if (isChunkLoadError(err) && reloadForNewBuild()) return new Promise<never>(() => {})
            throw err
          }
        },
      },
    ],
  },
  { path: '*', element: <Fallback />, errorElement: <RouteError /> },
])
