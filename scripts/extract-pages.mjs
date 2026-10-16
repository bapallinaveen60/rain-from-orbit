// One-off migration: the original single-file book (../web/Rain from Orbit.html) →
//   src/content/chNN/pPP.mdx    one MDX file per page, using the book components
//   src/content/figures/*.svg   the book's own inline illustrations
//   public/figures/atbd-*.png   the five ATBD figures (decoded from base64)
//   src/content/atbd.json       their aspect ratios
//   src/data/quizzes.ts         the self-check questions
//
// It fails loudly on markup it doesn't recognise, so nothing is silently dropped.
// Re-running overwrites its outputs: hand edits to the MDX must happen after the final run.
import { load } from 'cheerio'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(resolve(root, process.argv[2] ?? '../web/Rain from Orbit.html'), 'utf8')
const $ = load(html, { decodeEntities: true })

const write = (rel, text) => {
  const p = resolve(root, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, text)
}
const pad = (n) => String(n).padStart(2, '0')
const fail = (msg, el) => {
  throw new Error(`${msg}\n  at ${where}\n  ${el ? $.html(el).slice(0, 300) : ''}`)
}
let where = ''
const stats = { pages: 0, svgs: 0, calcs: 0, mixed: 0 }

/* ------------------------------------------------------------------ helpers */

const classes = (el) => ($(el).attr('class') ?? '').split(/\s+/).filter(Boolean)
const hasClass = (el, c) => classes(el).includes(c)
const isTag = (n) => n.type === 'tag'
const isText = (n) => n.type === 'text'
const kids = (el) => (el.children ?? []).filter((n) => n.type !== 'comment')

const INLINE = new Set(['b', 'strong', 'i', 'em', 'code', 'sub', 'sup', 'span', 'a', 'br', 'var', 'small', 'u', 'kbd'])
const BLOCK_SPAN_CLASSES = new Set(['psst', 'splat', 'stepn', 'atbdcred'])
const isInline = (n) =>
  isText(n) ||
  (isTag(n) && INLINE.has(n.name) && !(n.name === 'span' && classes(n).some((c) => BLOCK_SPAN_CLASSES.has(c))))
const blank = (n) => isText(n) && !/\S/.test(n.data)

/** JSX attribute value for a string. */
const jsxStr = (s) => (/^[^"{}<>\\\n]*$/.test(s) ? `"${s}"` : `{${JSON.stringify(s)}}`)

/** CSS text → JSX style object literal. */
function styleObj(css) {
  const parts = css
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(':')
      const k = d
        .slice(0, i)
        .trim()
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const v = d.slice(i + 1).trim()
      return `${k}: ${/^-?\d+(\.\d+)?$/.test(v) && k !== 'opacity' && k !== 'flex' ? v : JSON.stringify(v)}`
    })
  return `{{ ${parts.join(', ')} }}`
}

/** Attributes worth carrying over onto raw JSX elements. */
function jsxAttrs(el, { skipClass = false } = {}) {
  const out = []
  for (const [k, v] of Object.entries(el.attribs ?? {})) {
    if (k === 'class') {
      if (!skipClass && v) out.push(`className=${jsxStr(v)}`)
    } else if (k === 'style') out.push(`style=${styleObj(v)}`)
    else if (k === 'colspan') out.push(`colSpan={${+v}}`)
    else if (k === 'rowspan') out.push(`rowSpan={${+v}}`)
    else if (k === 'href' || k === 'title' || k.startsWith('aria-') || k === 'role' || k === 'target' || k === 'rel')
      out.push(`${k}=${jsxStr(v)}`)
    else fail(`unexpected attribute ${k}`, el)
  }
  return out.length ? ' ' + out.join(' ') : ''
}

/* ------------------------------------------------------------------ inline (markdown phrasing) */

/** Escape text so MDX reads it literally as phrasing content. */
function escText(s) {
  return s.replace(/[\\`*_[\]{}<>&]/g, (c) => '\\' + c)
}

const WORDCH = /[\p{L}\p{N}]/u
const safeDelim = (inner, before) =>
  inner.length > 0 &&
  WORDCH.test(inner[0]) &&
  WORDCH.test(inner.at(-1)) &&
  !inner.includes('*') &&
  !before.endsWith('*')

function inline(nodes) {
  let out = ''
  for (const n of nodes) {
    if (n.type === 'comment') continue
    if (isText(n)) {
      out += escText(n.data.replace(/[ \t\r\n]+/g, ' '))
      continue
    }
    if (!isTag(n)) continue
    const tag = n.name
    if (tag === 'br') {
      out += '<br />'
      continue
    }
    if (tag === 'span' && hasClass(n, 'stepn')) {
      out += `<Step n={${+$(n).text()}}${hasClass(n, 'sm') ? ' sm' : ''} />`
      continue
    }
    if (tag === 'svg') {
      out += svgRef(n)
      continue
    }
    if (tag === 'code' && !n.attribs?.class && !$(n).children().length && !$(n).text().includes('`')) {
      const t = $(n).text().replace(/\s+/g, ' ')
      out += t.startsWith(' ') || t.endsWith(' ') ? `<code>${escText(t)}</code>` : '`' + t + '`'
      continue
    }
    const inner = inline(kids(n))
    const plain = !n.attribs || Object.keys(n.attribs).length === 0
    if ((tag === 'b' || tag === 'strong') && plain && safeDelim(inner, out)) out += `**${inner}**`
    else if ((tag === 'i' || tag === 'em') && plain && safeDelim(inner, out)) out += `*${inner}*`
    else if (INLINE.has(tag)) out += `<${tag}${jsxAttrs(n)}>${inner}</${tag}>`
    else fail(`unexpected inline <${tag}>`, n)
  }
  return out
}

const phrasing = (el) => inline(kids(el)).replace(/^ +| +$/g, '')

/* ------------------------------------------------------------------ calc blocks → calc markup */

const CALC_SPAN = new Set(['s', 'o', 'hl', 'cm', 'ov', 'kut', 'kat'])
function calcMarkup(nodes) {
  let out = ''
  for (const n of nodes) {
    if (isText(n)) {
      out += n.data.replace(/ /g, ' ').replace(/\\|\[\[|\]\]|\^\{|_\{/g, (m) => '\\' + m)
      continue
    }
    if (!isTag(n)) continue
    const k = kids(n)
    if (n.name === 'span' && classes(n).length === 1 && CALC_SPAN.has(classes(n)[0]) && !n.attribs.style)
      out += `[[${classes(n)[0]}:${calcMarkup(k)}]]`
    else if (n.name === 'b' || n.name === 'strong') out += `[[b:${calcMarkup(k)}]]`
    else if (n.name === 'i' || n.name === 'em') out += `[[i:${calcMarkup(k)}]]`
    else if (n.name === 'code') out += `[[code:${calcMarkup(k)}]]`
    else if (n.name === 'sup') out += `^{${calcMarkup(k)}}`
    else if (n.name === 'sub') out += `_{${calcMarkup(k)}}`
    else if (n.name === 'br') out += '\n'
    else fail(`unexpected <${n.name}> in calc`, n)
  }
  return out
}
const tmpl = (s) => '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'

/* ------------------------------------------------------------------ figures */

let page = null // { ch, pg, imports: [] }
function svgRef(svg) {
  if (hasClass(svg, 'ch')) fail('character sprite outside a dialogue', svg)
  const n = page.imports.length + 1
  const name = `ch${pad(page.ch)}-p${pad(page.pg)}-${n}.svg`
  const el = $(svg).clone()
  el.attr('xmlns', 'http://www.w3.org/2000/svg')
  write(`src/content/figures/${name}`, $.html(el) + '\n')
  page.imports.push(`import fig${n} from '../figures/${name}?raw'`)
  stats.svgs++
  return `<InlineSvg svg={fig${n}} />`
}

const ATBD = {}
for (const m of html.matchAll(
  /\.af-([a-z]+)\{aspect-ratio:(\d+)\/(\d+);background-image:url\(data:image\/png;base64,([A-Za-z0-9+/=]+)\)/g,
)) {
  ATBD[m[1]] = `${m[2]} / ${m[3]}`
  const p = resolve(root, `public/figures/atbd-${m[1]}.png`)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, Buffer.from(m[4], 'base64'))
}

/* ------------------------------------------------------------------ blocks */

const SIM_IDS = ['orbit', 'dsd', 'curtain', 'atten', 'dfr', 'class', 'pipe', 'india']

/** Children of a container as MDX: one phrasing line if all inline, else blocks separated by blank lines. */
function content(el, { allowPhrasing = true } = {}) {
  const ks = kids(el).filter((n) => !blank(n))
  if (ks.length === 0) return { inline: true, text: '' }
  if (allowPhrasing && ks.every(isInline)) return { inline: true, text: phrasing(el) }
  const parts = []
  let run = []
  const flushRun = () => {
    const nodes = run.filter((n) => !blank(n))
    if (nodes.length) {
      stats.mixed++
      parts.push(inline(run).trim())
    }
    run = []
  }
  for (const n of kids(el)) {
    if (isInline(n)) run.push(n)
    else {
      flushRun()
      parts.push(block(n))
    }
  }
  flushRun()
  return { inline: false, text: parts.filter((p) => p !== '').join('\n\n') }
}

/** `<Tag props>children</Tag>` with phrasing on one line or blocks on their own lines. */
function wrap(open, close, el, opts) {
  const c = content(el, opts)
  if (c.text === '') return `${open.replace(/>$/, ' />')}`
  return c.inline ? `${open}${c.text}${close}` : `${open}\n\n${c.text}\n\n${close}`
}

function block(n) {
  if (isText(n)) return blank(n) ? '' : escText(n.data.trim())
  if (!isTag(n)) return ''
  const c = classes(n)
  const tag = n.name

  if (tag === 'div' && c[0] === 'opener') {
    const kicker = $(n).children('.k').text().trim()
    const h2 = $(n).children('h2')
    if (h2.children().length) fail('opener title has markup', n)
    $(n)
      .children()
      .each((_, k) => {
        if (!hasClass(k, 'k') && k.name !== 'h2' && k.name !== 'p') fail('unexpected child of opener', k)
      })
    const ps = $(n).children('p').toArray().map(phrasing)
    const open = `<Opener kicker=${jsxStr(kicker)} title=${jsxStr(h2.text().trim())}>`
    return ps.length ? `${open}\n\n${ps.join('\n\n')}\n\n</Opener>` : open.replace(/>$/, ' />')
  }
  if (tag === 'h3' && c[0] === 'ph') {
    const kind = c.includes('blue') ? ' kind="blue"' : c.includes('try') ? ' kind="try"' : ''
    return `<Header${kind}>${phrasing(n)}</Header>`
  }
  if (tag === 'div' && c[0] === 'pgrid') {
    const one = c.includes('one') ? ' one' : ''
    const style = n.attribs.style ? ` style=${styleObj(n.attribs.style)}` : ''
    return wrap(`<Grid${one}${style}>`, '</Grid>', n, { allowPhrasing: false })
  }
  if (tag === 'div' && c[0] === 'pbox') {
    const tone = c.find((x) => ['a', 'c', 'd', 'plain'].includes(x))
    const props = []
    if (tone) props.push(`tone="${tone}"`)
    if (c.includes('span2')) props.push('span')
    const first = kids(n).find((k) => !blank(k))
    if (first && isTag(first) && first.name === 'span' && hasClass(first, 'stepn')) {
      props.push(`step={${+$(first).text()}}`)
      if (hasClass(first, 'sm')) props.push('stepSm')
      $(first).remove()
    }
    for (const x of c) if (!['pbox', 'a', 'c', 'd', 'plain', 'span2'].includes(x)) fail(`unknown pbox class ${x}`, n)
    if (n.attribs.style) props.push(`style=${styleObj(n.attribs.style)}`)
    return wrap(`<Box${props.length ? ' ' + props.join(' ') : ''}>`, '</Box>', n, { allowPhrasing: false })
  }
  if (tag === 'div' && c[0] === 'talk') {
    const svg = $(n).children('svg.ch')
    const bub = $(n).children('.bub')
    if (svg.length !== 1 || bub.length !== 1 || $(n).children().length !== 2) fail('unexpected talk structure', n)
    const char = (svg.find('use').attr('href') ?? '').replace('#c-', '')
    if (!['dot', 'dot2', 'core', 'core2'].includes(char)) fail(`unknown character ${char}`, n)
    const core = char.startsWith('core')
    if (bub.hasClass('core') !== core) fail('bubble colour does not match character', n)
    const sc = classes(svg[0]).filter((x) => x !== 'ch')
    const size = sc.includes('wide') ? 'wide' : sc.includes('sm') ? 'sm' : 'normal'
    const props = [`char="${char}"`]
    if (size !== (core ? 'wide' : 'normal')) props.push(`size="${size}"`)
    if (c.includes('rev') !== core) props.push(`rev={${c.includes('rev')}}`)
    return wrap(`<Talk ${props.join(' ')}>`, '</Talk>', bub[0])
  }
  if ((tag === 'p' || tag === 'span' || tag === 'div') && c[0] === 'psst' && c.length === 1 && !n.attribs.style)
    return `<Psst>${phrasing(n)}</Psst>`
  if (tag === 'span' && c[0] === 'splat') return `<Splat${c.includes('sm') ? ' sm' : ''}>${phrasing(n)}</Splat>`
  if (tag === 'span' && c[0] === 'stepn') return `<Step n={${+$(n).text()}}${c.includes('sm') ? ' sm' : ''} />`
  if (tag === 'div' && c[0] === 'alert') {
    const h4 = $(n).children('h4')
    const title = h4.text().trim()
    h4.remove()
    return wrap(`<Alert title=${jsxStr(title)}>`, '</Alert>', n)
  }
  if (tag === 'div' && c[0] === 'note' && c.length === 1) {
    const style = n.attribs.style ? ` style=${styleObj(n.attribs.style)}` : ''
    return wrap(`<Note${style}>`, '</Note>', n)
  }
  if (tag === 'div' && c[0] === 'calc') {
    stats.calcs++
    const body = calcMarkup(kids(n)).replace(/^\n/, '').replace(/\s+$/, '')
    return `<Calc${c.includes('code') ? ' code' : ''}>{${tmpl(body)}}</Calc>`
  }
  if (tag === 'div' && c[0] === 'wgt') {
    const id = (n.attribs.id ?? '').replace(/^p-/, '')
    if (!SIM_IDS.includes(id)) fail(`unknown widget ${id}`, n)
    const h = $(n).children('.wgt-h')
    const hint = h.children('span').text().trim()
    h.children('span').remove()
    return `<Sim id="${id}" title=${jsxStr(h.text().trim())}${hint ? ` hint=${jsxStr(hint)}` : ''} />`
  }
  if (tag === 'div' && c[0] === 'quiz') return `<Quiz id="${n.attribs['data-qz']}" />`
  if (tag === 'figure') {
    const atbd = $(n).children('.atbdfig')
    if (atbd.length) {
      const id = classes(atbd[0])
        .find((x) => x.startsWith('af-'))
        .slice(3)
      if (!ATBD[id]) fail(`no image data for ATBD figure ${id}`, n)
      const credit = $(n).children('.atbdcred').text().trim()
      if ($(n).children().length !== 2) fail('unexpected ATBD figure structure', n)
      return `<AtbdFigure id="${id}" label=${jsxStr(atbd.attr('aria-label'))} credit=${jsxStr(credit)} />`
    }
    const parts = []
    for (const k of kids(n)) {
      if (blank(k)) continue
      if (isTag(k) && k.name === 'svg') parts.push(svgRef(k))
      else if (isTag(k) && k.name === 'figcaption') parts.push(`<figcaption>${phrasing(k)}</figcaption>`)
      else fail('unexpected figure child', k)
    }
    return `<figure>\n\n${parts.join('\n\n')}\n\n</figure>`
  }
  if (tag === 'svg') return svgRef(n)
  if (tag === 'div' && c[0] === 'scrollx')
    return wrap(`<div className="scrollx">`, '</div>', n, { allowPhrasing: false })
  if (tag === 'table') return table(n)
  if (tag === 'ul' || tag === 'ol') {
    if (n.attribs && Object.keys(n.attribs).length) {
      return wrap(`<${tag}${jsxAttrs(n)}>`, `</${tag}>`, n, { allowPhrasing: false })
    }
    return $(n)
      .children('li')
      .toArray()
      .map((li, i) => {
        if (kids(li).some((k) => !isInline(k) && !blank(k))) fail('block content in list item', li)
        return `${tag === 'ol' ? `${i + 1}.` : '-'} ${phrasing(li)}`
      })
      .join('\n')
  }
  if (tag === 'li') return wrap(`<li${jsxAttrs(n)}>`, '</li>', n)
  if (tag === 'p') {
    const text = phrasing(n)
    if (n.attribs && Object.keys(n.attribs).length) return `<p${jsxAttrs(n)}>${text}</p>`
    // A paragraph starting with something markdown would read as block syntax gets escaped.
    return text.replace(/^(#|>|-|\+|\d+\.|=)/, '\\$1')
  }
  if (tag === 'h4') return `<h4${jsxAttrs(n)}>${phrasing(n)}</h4>`
  if (tag === 'div' && c.length === 0) return wrap(`<div${jsxAttrs(n)}>`, '</div>', n, { allowPhrasing: false })
  if (tag === 'div' && ['big'].includes(c[0])) return `<div${jsxAttrs(n)}>${phrasing(n)}</div>`
  if (tag === 'span' && c[0] === 'big') return `<span${jsxAttrs(n)}>${phrasing(n)}</span>`
  fail(`unexpected block <${tag} class="${c.join(' ')}">`, n)
}

function table(n) {
  const rows = []
  const cell = (td) => `<${td.name}${jsxAttrs(td)}>${phrasing(td)}</${td.name}>`
  const section = (sec) =>
    $(sec)
      .children('tr')
      .toArray()
      .map((tr) => `<tr${jsxAttrs(tr)}>${$(tr).children('th,td').toArray().map(cell).join('')}</tr>`)
  for (const k of $(n).children().toArray()) {
    if (k.name === 'thead' || k.name === 'tbody')
      rows.push(`<${k.name}>`, ...section(k).map((r) => '  ' + r), `</${k.name}>`)
    else if (k.name === 'tr') rows.push(...section(n))
    else fail('unexpected table child', k)
  }
  return `<table${jsxAttrs(n)}>\n${rows.join('\n')}\n</table>`
}

/* ------------------------------------------------------------------ pages */

rmSync(resolve(root, 'src/content/figures'), { recursive: true, force: true })
for (let c = 1; c <= 8; c++) rmSync(resolve(root, `src/content/ch${pad(c)}`), { recursive: true, force: true })

$('section.chapter').each((ci, sec) => {
  const ch = ci + 1
  $(sec)
    .children('.page')
    .each((pi, pg) => {
      const pgn = pi + 1
      where = `chapter ${ch}, page ${pgn} (${$(pg).attr('data-t')})`
      page = { ch, pg: pgn, imports: [] }
      const body = kids(pg)
        .map(block)
        .filter((s) => s !== '')
        .join('\n\n')
      const head = `{/* Migrated from "Rain from Orbit.html", chapter ${ch} page ${pgn} (${$(pg).attr('data-t')}). */}`
      const mdx = [...page.imports, page.imports.length ? '' : null, head, '', body, '']
        .filter((x) => x !== null)
        .join('\n')
      write(`src/content/ch${pad(ch)}/p${pad(pgn)}.mdx`, mdx)
      stats.pages++
    })
})

write('src/content/atbd.json', JSON.stringify(ATBD, null, 2) + '\n')

/* ------------------------------------------------------------------ quizzes */

const qsrc = html.match(/var Q=(\{[\s\S]*?\n  \]\});/)[1]
const Q = vm.runInNewContext('(' + qsrc + ')')
const quizTs = `// Chapter self-checks, migrated from "Rain from Orbit.html". In the source data the right
// answer is always listed first (c: 0); the Quiz component shuffles the display order.

export interface QuizItem {
  /** Question stem. */
  s: string
  /** Options, in source order. */
  o: string[]
  /** Index of the right option in \`o\`. */
  c: number
  /** Explanation shown after answering. */
  e: string
}

export const quizzes: Record<string, QuizItem[]> = ${JSON.stringify(Q, null, 2)}
`
write('src/data/quizzes.ts', quizTs)

console.log(
  `pages ${stats.pages} · svgs ${stats.svgs} · calcs ${stats.calcs} · atbd ${Object.keys(ATBD).length} · quizzes ${Object.keys(Q).length} · mixed-content runs ${stats.mixed}`,
)
