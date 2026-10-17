import '@fontsource/nunito-sans/400.css'
import '@fontsource/nunito-sans/600.css'
import '@fontsource/nunito-sans/700.css'
import '@fontsource/nunito-sans/800.css'
import '@fontsource/nunito-sans/400-italic.css'
import '@fontsource/caveat/500.css'
import '@fontsource/caveat/700.css'
import '@fontsource/permanent-marker/400.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './styles/tokens.css'
import './styles/book.css'
import './styles/app.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/routes'
import { registerSW } from 'virtual:pwa-register'
import { installStaleChunkRecovery } from './app/staleChunks'
import { warmUpPhysics } from './physics/client'
import { applyTheme, useSettings } from './store/settings'

applyTheme(useSettings.getState().theme)
// A tab left open across a deploy must not break: reload onto the new build when needed,
// and let the service worker reload the page once a new version takes control.
installStaleChunkRecovery()
registerSW({ immediate: true })
// Build the Mie scattering tables off the main thread before the first simulator needs them.
warmUpPhysics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
