/*
 * Rehype plugin (MDX build step): wraps the first mention of each glossary term on a page
 * in <Term id="…">, so readers get a definition popover without hand-marking 70 pages.
 * Plain-text matches come from `match`; inline code matches come from `code`.
 */
import glossary from '../src/data/glossary.json' with { type: 'json' }

interface Node {
  type: string
  name?: string | null
  tagName?: string
  value?: string
  children?: Node[]
  attributes?: { type: string; name: string; value: string }[]
}

/** Elements whose text is never linked. */
const SKIP = new Set([
  'Header',
  'Opener',
  'Splat',
  'Calc',
  'Sim',
  'Quiz',
  'Term',
  'a',
  'h4',
  'sub',
  'sup',
  'figcaption',
  'th',
  'pre',
])

const WORD = '[\\p{L}\\p{N}]'
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const textRules = glossary.flatMap((g) =>
  g.match.map((m) => ({
    id: g.id,
    // Case-sensitive for acronyms, insensitive otherwise; whole words only (plurals allowed).
    re: new RegExp(
      `(?<!${WORD})${escape(m)}${/^[a-z -]+$/.test(m) ? 's?' : ''}(?!${WORD})`,
      /^[A-Z]{2,}$/.test(m) || m === 'dBZ' ? 'u' : 'iu',
    ),
  })),
)
const codeRules = new Map(
  glossary.flatMap((g) => ((g as { code?: string[] }).code ?? []).map((c) => [c, g.id] as const)),
)

const term = (id: string, children: Node[]): Node => ({
  type: 'mdxJsxTextElement',
  name: 'Term',
  attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: id }],
  children,
})

const nameOf = (n: Node) => n.name ?? n.tagName ?? ''

export default function rehypeGlossary() {
  return (tree: Node) => {
    const used = new Set<string>()

    const splitText = (value: string): Node[] | null => {
      let best: { id: string; index: number; text: string } | null = null
      for (const r of textRules) {
        if (used.has(r.id)) continue
        const m = r.re.exec(value)
        if (m && (!best || m.index < best.index)) best = { id: r.id, index: m.index, text: m[0] }
      }
      if (!best) return null
      used.add(best.id)
      const after = value.slice(best.index + best.text.length)
      const out: Node[] = []
      if (best.index > 0) out.push({ type: 'text', value: value.slice(0, best.index) })
      out.push(term(best.id, [{ type: 'text', value: best.text }]))
      if (after) out.push(...(splitText(after) ?? [{ type: 'text', value: after }]))
      return out
    }

    const walk = (node: Node) => {
      if (!node.children) return
      const next: Node[] = []
      for (const child of node.children) {
        const name = nameOf(child)
        if (child.type === 'text' && child.value) {
          next.push(...(splitText(child.value) ?? [child]))
          continue
        }
        if (name === 'code' && child.children?.length === 1 && child.children[0].type === 'text') {
          const id = codeRules.get(child.children[0].value ?? '')
          if (id && !used.has(id)) {
            used.add(id)
            next.push(term(id, [child]))
            continue
          }
        }
        if (!SKIP.has(name)) walk(child)
        next.push(child)
      }
      node.children = next
    }

    walk(tree)
  }
}
