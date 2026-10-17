import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { calcText, parseCalc } from '../src/components/book/calcMarkup'
import manifest from '../src/content/manifest.json'
import { chapters, nextLoc, prevLoc, type Loc } from '../src/content/chapters'
import { quizzes } from '../src/data/quizzes'
import { buildIndex } from '../scripts/build-search-index.mjs'
import { search } from '../src/app/search'

const content = fileURLToPath(new URL('../src/content', import.meta.url))
const pad = (n: number) => String(n).padStart(2, '0')

describe('content', () => {
  it('has exactly one MDX file per manifest page', () => {
    for (const ch of manifest) {
      const files = readdirSync(resolve(content, `ch${pad(ch.n)}`)).filter((f) => f.endsWith('.mdx'))
      expect(files.sort()).toEqual(ch.pages.map((_, i) => `p${pad(i + 1)}.mdx`))
    }
  })

  it('every <Quiz id> has questions, and every chapter has a quiz', () => {
    const ids = new Set<string>()
    for (const ch of manifest)
      for (let p = 1; p <= ch.pages.length; p++) {
        const src = readFileSync(resolve(content, `ch${pad(ch.n)}/p${pad(p)}.mdx`), 'utf8')
        for (const m of src.matchAll(/<Quiz id="([^"]+)"/g)) ids.add(m[1])
      }
    expect([...ids].sort()).toEqual(Object.keys(quizzes).sort())
    for (const items of Object.values(quizzes)) {
      expect(items.length).toBeGreaterThan(0)
      for (const q of items) expect(q.o[q.c]).toBeTruthy()
    }
  })
})

describe('calc markup', () => {
  it('parses colour spans, sub/superscripts and nesting', () => {
    const n = parseCalc('Z = [[o:1]]^{6} + [[cm:D_{m} ^{x}]]')
    expect(n).toEqual([
      'Z = ',
      { tag: 'span', cls: 'o', kids: ['1'] },
      { tag: 'sup', kids: ['6'] },
      ' + ',
      { tag: 'span', cls: 'cm', kids: ['D', { tag: 'sub', kids: ['m'] }, ' ', { tag: 'sup', kids: ['x'] }] },
    ])
  })

  it('preserves whitespace and escapes', () => {
    const src = 'a  \n   b \\[[s:not]] x\\_{y}'
    expect(calcText(parseCalc(src))).toBe('a  \n   b [[s:not]] x_{y}')
  })

  it('leaves unknown [[ sequences alone', () => {
    expect(parseCalc('a[[0]]')).toEqual(['a[[0]]'])
  })
})

describe('story mode navigation', () => {
  it('skips Details pages but keeps everything else, in order', () => {
    const visited: string[] = []
    let l: Loc | null = { ch: 1, pg: 1 }
    while (l) {
      visited.push(chapters[l.ch - 1].pages[l.pg - 1].tab)
      l = nextLoc(l, true)
    }
    expect(visited.some((t) => t.startsWith('Details'))).toBe(false)
    expect(visited.filter((t) => t === 'Now You Try It')).toHaveLength(8)
    expect(visited.filter((t) => t === 'Self-Check')).toHaveLength(8)
  })
  it('prevLoc reverses nextLoc', () => {
    for (const story of [false, true]) {
      let l: Loc | null = { ch: 3, pg: 1 }
      const n = nextLoc(l, story)!
      expect(prevLoc(n, story)).toEqual(l)
      l = { ch: 8, pg: 10 }
      expect(nextLoc(l, story)).toBeNull()
    }
  })
})

describe('search index', () => {
  it('is up to date with the MDX pages (run npm run build:search)', () => {
    const current = readFileSync(fileURLToPath(new URL('../src/content/search-index.json', import.meta.url)), 'utf8')
    expect(current).toBe(buildIndex())
  })
  it('finds pages by heading and body, and glossary terms', () => {
    expect(search('bright band')[0].title).toMatch(/Bright band/)
    expect(search('Hitschfeld').some((h) => h.title.includes('Hitschfeld'))).toBe(true)
    expect(search('794 drops').length).toBeGreaterThan(0)
    expect(search('x')).toEqual([])
  })
})
