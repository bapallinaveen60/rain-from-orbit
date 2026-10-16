/// <reference types="vitest/config" />
import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import rehypeGlossary from './scripts/rehype-glossary.ts'

// BASE lets the GitHub Pages build serve from /<repo>/; local dev uses /.
export default defineConfig({
  base: process.env.BASE ?? '/',
  plugins: [{ enforce: 'pre', ...mdx({ rehypePlugins: [rehypeGlossary] }) }, react({ include: /\.(mdx|tsx?)$/ })],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
