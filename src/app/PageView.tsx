import { chapters, type Loc } from '../content/chapters'

function headerKind(heading: string) {
  if (heading.startsWith('Now You Try It')) return ' try'
  if (/Main Ideas|Self-Check|How This Guide Works/.test(heading)) return ' blue'
  return ''
}

/**
 * Phase 0 placeholder: the page frame (opener + header bar) from the manifest.
 * Phase 2 replaces the body with the page's MDX content.
 */
export function PageView({ loc }: { loc: Loc }) {
  const ch = chapters[loc.ch - 1]
  const page = ch.pages[loc.pg - 1]
  const heading = page.heading || page.tab

  return (
    <article>
      {loc.pg === 1 && (
        <div className="opener">
          <span className="k">Chapter {String(ch.n).padStart(2, '0')}</span>
          <h2>{ch.title}!!!</h2>
        </div>
      )}
      <h3 className={'ph' + headerKind(heading)}>{heading}</h3>
      <div className="pgrid one">
        <div className="pbox plain">
          <p className="psst">Page content moves in during Phase 2.</p>
        </div>
      </div>
    </article>
  )
}
