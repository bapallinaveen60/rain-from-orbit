import { createHashRouter } from 'react-router-dom'
import { GlossaryPage } from './GlossaryPage'
import { AppShell } from './layout/AppShell'
import { BookLayout } from './layout/BookLayout'
import { NotesPage } from './NotesPage'
import { Fallback, Home } from './Redirects'
import { ReviewPage } from './ReviewPage'

// Hash routing keeps deep links working on static hosts (GitHub Pages) with no rewrites.
export const router = createHashRouter([
  { path: '/', element: <Home /> },
  {
    element: <AppShell />,
    children: [
      { path: '/ch/:ch/:pg', element: <BookLayout /> },
      { path: '/glossary', element: <GlossaryPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/notes', element: <NotesPage /> },
      // The explorer pulls in h5wasm (several MB); load it only when visited.
      { path: '/explore', lazy: async () => ({ Component: (await import('../granule/ExplorerPage')).ExplorerPage }) },
    ],
  },
  { path: '*', element: <Fallback /> },
])
