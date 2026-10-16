import { createHashRouter } from 'react-router-dom'
import { BookLayout } from './layout/BookLayout'
import { Fallback, Home } from './Redirects'

// Hash routing keeps deep links working on static hosts (GitHub Pages) with no rewrites.
export const router = createHashRouter([
  { path: '/', element: <Home /> },
  { path: '/ch/:ch/:pg', element: <BookLayout /> },
  { path: '*', element: <Fallback /> },
])
