// One-off extraction from the original single-file book (../web/Rain from Orbit.html):
// design tokens, book CSS, the SVG <defs> (rough-edge filters + characters) and the
// chapter/page manifest. Re-run safely; it overwrites its outputs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, process.argv[2] ?? '../web/Rain from Orbit.html')
const html = readFileSync(src, 'utf8')

const out = (rel, text) => {
  const p = resolve(root, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, text)
  console.log('wrote', rel, text.length, 'bytes')
}

// 1. CSS: first <style> block, split into tokens (:root + dark) and the rest.
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
const cut = css.indexOf('*{box-sizing')
out('src/styles/tokens.css', css.slice(0, cut).trim() + '\n')
out('src/styles/book.css', css.slice(cut).trim() + '\n')

// 2. SVG defs (filters + character symbols).
const defs = html.match(/<svg id="defs"[\s\S]*?<\/svg>/)[0]
out('src/assets/defs.svg', defs + '\n')

// 3. Manifest: chapters and their page titles.
const chapters = []
const chRe = /<section class="chapter[^"]*" id="ch(\d+)" data-title="([^"]*)">([\s\S]*?)<\/section>/g
for (const m of html.matchAll(chRe)) {
  const pages = [
    ...m[3].matchAll(
      /<div class="page[^"]*" data-t="([^"]*)"[^>]*>\s*(?:[\s\S]*?<h3 class="ph[^"]*">([\s\S]*?)<\/h3>)?/g,
    ),
  ].map((p) => ({ tab: p[1], heading: (p[2] ?? '').replace(/<[^>]+>/g, '').trim() }))
  chapters.push({ n: +m[1], title: m[2].replace(/&#39;/g, "'"), pages })
}
out('src/content/manifest.json', JSON.stringify(chapters, null, 2) + '\n')
