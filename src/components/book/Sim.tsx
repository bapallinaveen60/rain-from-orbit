export type SimId = 'orbit' | 'dsd' | 'curtain' | 'atten' | 'dfr' | 'class' | 'pipe' | 'india'

/**
 * A live simulator slot. Phase 3 mounts the real simulators here; until then this shows
 * the widget frame with its title so the page layout is already right.
 */
export function Sim({ id, title, hint }: { id: SimId; title: string; hint?: string }) {
  return (
    <div className="wgt" id={`p-${id}`}>
      <div className="wgt-h">
        {title}
        {hint && <span>{hint}</span>}
      </div>
      <p className="psst" style={{ margin: '24px 0', textAlign: 'center' }}>
        The live simulator returns in Phase 3.
      </p>
    </div>
  )
}
