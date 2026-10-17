// Builds src/content/search-index.json: the plain text of every MDX page, for Ctrl+K search.
// Run after editing content (npm run build:search). tests/content.test.ts fails if it's stale.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(resolve(root, 'src/content/manifest.json'), 'utf8'))
const pad = (n) => String(n).padStart(2, '0')

/** MDX source → readable plain text (good enough for search, not for display). */
export function mdxToText(src) {
  return (
    src
      .replace(/^import .*$/gm, ' ')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      // keep the words inside calc blocks, drop the markup
      .replace(
        /\{`([\s\S]*?)`\}/g,
        (_, t) => ' ' + t.replace(/\[\[\w+:|\]\]/g, '').replace(/[\^_]\{([^}]*)\}/g, '$1') + ' ',
      )
      // string attributes that carry prose
      .replace(
        /\b(?:title|hint|label|credit|kicker)=("([^"]*)"|\{"((?:[^"\\]|\\.)*)"\})/g,
        (_, _a, b, c) => ' ' + (b ?? c) + ' ',
      )
      .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
      .replace(/\{[^{}]*\}/g, ' ')
      .replace(/\\([\\`*_[\]{}<>&#+\-.!])/g, '$1')
      .replace(/[*`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

export function buildIndex() {
  const pages = []
  for (const ch of manifest)
    ch.pages.forEach((p, i) => {
      const src = readFileSync(resolve(root, `src/content/ch${pad(ch.n)}/p${pad(i + 1)}.mdx`), 'utf8')
      pages.push({ ch: ch.n, pg: i + 1, heading: p.heading || p.tab, text: mdxToText(src) })
    })
  return JSON.stringify(pages) + '\n'
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const out = buildIndex()
  writeFileSync(resolve(root, 'src/content/search-index.json'), out)
  console.log('wrote src/content/search-index.json', out.length, 'bytes')
}
