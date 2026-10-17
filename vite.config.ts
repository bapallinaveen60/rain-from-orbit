/// <reference types="vitest/config" />
import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import rehypeGlossary from './scripts/rehype-glossary.ts'

// BASE lets the GitHub Pages build serve from /<repo>/; local dev uses /.
// `--mode android` builds the copy bundled in the Android app: no service worker, since the
// WebView already serves every file from the APK.
export default defineConfig(({ mode }) => ({
  base: process.env.BASE ?? '/',
  plugins: [
    { enforce: 'pre', ...mdx({ rehypePlugins: [rehypeGlossary] }) },
    react({ include: /\.(mdx|tsx?)$/ }),
    VitePWA({
      disable: mode === 'android',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Rain from Orbit',
        short_name: 'Rain from Orbit',
        description: 'An illustrated, interactive guide to the GPM Dual-frequency Precipitation Radar.',
        theme_color: '#10508f',
        background_color: '#faf8f2',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything needed to read offline is precached; the 25 MB of PDFs are cached on first download.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The explorer's h5wasm worker (~5 MB) and sample are cached on first use, not for everyone.
        globIgnores: ['pdf/**', 'data/**', 'assets/granule-worker-*.js'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/pdf\/.*\.pdf$/,
            handler: 'CacheFirst',
            options: { cacheName: 'pdf', expiration: { maxEntries: 3 } },
          },
          {
            urlPattern: /(granule-worker-.*\.js|sample-granule\.h5)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'explorer', expiration: { maxEntries: 4 } },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}))
