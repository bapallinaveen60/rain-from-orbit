/*
 * Tiny markup for worked-maths blocks, so MDX sources stay readable while keeping the
 * original colour coding. Whitespace and newlines are preserved exactly.
 *
 *   [[s:x]]   solve-for (blue)        [[o:x]]   observed (red)
 *   [[hl:x]]  highlight               [[cm:x]]  handwritten comment
 *   [[ov:x]]  observed value (red)    [[kut:x]] / [[kat:x]]  Ku / Ka colour
 *   [[b:x]]   bold   [[i:x]]  italic  [[code:x]]
 *   ^{x}      superscript             _{x}      subscript
 *
 * Constructs nest. A backslash escapes the next character.
 */

export type CalcNode =
  | string
  | { tag: 'span'; cls: string; kids: CalcNode[] }
  | { tag: 'b' | 'i' | 'code' | 'sup' | 'sub'; kids: CalcNode[] }

const SPAN_CLASSES = new Set(['s', 'o', 'hl', 'cm', 'ov', 'kut', 'kat'])
const TAGS = new Set(['b', 'i', 'code'])

export function parseCalc(src: string): CalcNode[] {
  let i = 0

  function run(stop: ']]' | '}' | null): CalcNode[] {
    const out: CalcNode[] = []
    let text = ''
    const flush = () => {
      if (text) out.push(text)
      text = ''
    }
    while (i < src.length) {
      const c = src[i]
      if (c === '\\' && i + 1 < src.length) {
        text += src[i + 1]
        i += 2
      } else if (stop && src.startsWith(stop, i)) {
        i += stop.length
        flush()
        return out
      } else if (src.startsWith('[[', i)) {
        const colon = src.indexOf(':', i + 2)
        const name = colon > 0 ? src.slice(i + 2, colon) : ''
        if (!SPAN_CLASSES.has(name) && !TAGS.has(name)) {
          text += c
          i++
          continue
        }
        flush()
        i = colon + 1
        const kids = run(']]')
        out.push(SPAN_CLASSES.has(name) ? { tag: 'span', cls: name, kids } : { tag: name as 'b' | 'i' | 'code', kids })
      } else if ((c === '^' || c === '_') && src[i + 1] === '{') {
        flush()
        i += 2
        out.push({ tag: c === '^' ? 'sup' : 'sub', kids: run('}') })
      } else {
        text += c
        i++
      }
    }
    flush()
    return out
  }

  return run(null)
}

/** Plain text of a parsed block (used by tests to prove nothing was lost). */
export function calcText(nodes: CalcNode[]): string {
  return nodes.map((n) => (typeof n === 'string' ? n : calcText(n.kids))).join('')
}
