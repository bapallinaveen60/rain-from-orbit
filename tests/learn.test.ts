import { compile } from '@mdx-js/mdx'
import { describe, expect, it } from 'vitest'
import rehypeGlossary from '../scripts/rehype-glossary'
import { parseCalc, type CalcNode } from '../src/components/book/calcMarkup'
import { blankOf, checkAnswer, countBlanks } from '../src/components/book/worksheet'
import { decodeStorm, DEFAULT_STORM, encodeStorm, STORM_PRESETS } from '../src/store/storm'
import { dB, Zray } from '../src/physics'

describe('storm links', () => {
  it('round-trip through the URL encoding', () => {
    const s = { Dm: 2.2, logNw: 3.75, mu: 3, depth: 5.5 }
    expect(decodeStorm(encodeStorm(s))).toEqual(s)
  })
  it('reject junk and clamp out-of-range values', () => {
    expect(decodeStorm('nope')).toBeNull()
    expect(decodeStorm('1_2_3')).toBeNull()
    expect(decodeStorm('99_4_3_4')?.Dm).toBe(4)
    expect(decodeStorm(encodeStorm(DEFAULT_STORM))).toEqual(DEFAULT_STORM)
  })
  it('Box A and Box B presets are both 29 dBZ', () => {
    for (const name of ['Box A', 'Box B']) {
      const s = STORM_PRESETS.find((p) => p.name === name)!.storm
      expect(dB(Zray(s.Dm, s.logNw, s.mu))).toBeCloseTo(29, 6)
    }
  })
})

describe('worksheet blanks', () => {
  it('find numeric highlights, keeping the unit', () => {
    const n = parseCalc('Z = [[hl:794]] mm  and  [[hl:0.50 mm h^{−1}]] and [[hl:n/a]]')
    expect(countBlanks(n)).toBe(2)
    const hl = n.find((x) => typeof x !== 'string' && x.tag === 'span' && x.kids[0] === '0.50 mm h')!
    const b = blankOf((hl as Extract<CalcNode, { kids: CalcNode[] }>).kids)!
    expect(b.text).toBe('0.50')
    expect(b.rest).toEqual([' mm h', { tag: 'sup', kids: ['−1'] }])
  })
  it('accept answers at the printed precision', () => {
    const b = blankOf(['29.0 dBZ'])!
    expect(checkAnswer('29', b)).toBe(true)
    expect(checkAnswer('29.04', b)).toBe(true)
    expect(checkAnswer('29.3', b)).toBe(false)
    expect(checkAnswer('', b)).toBe(false)
    expect(checkAnswer('abc', b)).toBe(false)
    const big = blankOf(['794'])!
    expect(checkAnswer('794.4', big)).toBe(true)
    expect(checkAnswer('790', big)).toBe(false)
    expect(checkAnswer('−3', blankOf(['−3'])!)).toBe(true)
  })
})

describe('glossary linking', () => {
  const run = async (src: string) => String(await compile(src, { rehypePlugins: [rehypeGlossary] }))

  it('links the first mention of a term on a page only', async () => {
    const out = await run('The bright band is bright.\n\nAnother bright band here.')
    expect(out.match(/_components\.Term|<Term|Term,/g)?.length).toBeGreaterThan(0)
    expect((out.match(/id: "bright-band"/g) ?? []).length).toBe(1)
  })
  it('links variable names in inline code', async () => {
    expect(await run('Read `binClutterFreeBottom` first.')).toContain('id: "cfb"')
  })
  it('respects word boundaries and acronym case', async () => {
    const out = await run('Admire the pia colada, a Mietzsche, and the PIA.')
    expect((out.match(/id: "pia"/g) ?? []).length).toBe(1)
    expect(out).not.toContain('id: "mie"')
  })
  it('never links inside headers', async () => {
    expect(await run('<Header>The bright band</Header>')).not.toContain('bright-band')
  })
})
