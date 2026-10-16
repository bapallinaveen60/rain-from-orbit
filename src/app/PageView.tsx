import { lazy, Suspense, type ComponentType } from 'react'
import type { MDXProps } from 'mdx/types'
import { bookComponents } from '../components/book'
import type { Loc } from '../content/chapters'

const pad = (n: number) => String(n).padStart(2, '0')

// Every page is its own chunk; lazy() defers each import until the page is first shown.
const pages: Record<string, ComponentType<MDXProps>> = Object.fromEntries(
  Object.entries(import.meta.glob<{ default: ComponentType<MDXProps> }>('../content/ch*/p*.mdx')).map(
    ([path, load]) => [path, lazy(load)],
  ),
)

export function PageView({ loc }: { loc: Loc }) {
  const key = `../content/ch${pad(loc.ch)}/p${pad(loc.pg)}.mdx`
  const Page = pages[key]
  if (!Page) throw new Error(`No content for ${key}`)
  return (
    <article>
      <Suspense fallback={<p className="psst">Turning the page…</p>}>
        <Page components={bookComponents} />
      </Suspense>
    </article>
  )
}
