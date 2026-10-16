import { useState } from 'react'
import ratios from '../../content/atbd.json'

/**
 * An original book illustration, inlined so it can use the theme's CSS variables and
 * the rough-edge filters. `svg` is the file's raw text (trusted, bundled at build time).
 */
export function InlineSvg({ svg }: { svg: string }) {
  return <span className="inline-svg" dangerouslySetInnerHTML={{ __html: svg }} />
}

export type AtbdFigureId = keyof typeof ratios

/** A figure reproduced from the GPM/DPR Level-2 ATBD, with its credit line. Click to enlarge. */
export function AtbdFigure({ id, label, credit }: { id: AtbdFigureId; label: string; credit: string }) {
  const [zoom, setZoom] = useState(false)
  const src = `${import.meta.env.BASE_URL}figures/atbd-${id}.png`
  return (
    <>
      <button type="button" className="atbd-btn" onClick={() => setZoom(true)} aria-label={`Enlarge: ${label}`}>
        <img className="atbdfig" src={src} alt={label} style={{ aspectRatio: ratios[id] }} loading="lazy" />
      </button>
      <span className="atbdcred">{credit}</span>
      {zoom && (
        <div className="lightbox" role="dialog" aria-label={label} onClick={() => setZoom(false)}>
          <img src={src} alt={label} />
          <span className="atbdcred">{credit} · click anywhere to close</span>
        </div>
      )}
    </>
  )
}
