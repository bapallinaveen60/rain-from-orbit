import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Readout, Slider, U } from '../sims/shared/ui'
import { encodeStorm, STORM_LIMITS, STORM_PRESETS, stormSummary, useStorm, type Storm } from '../store/storm'

const fmtR = (R: number) => (R < 10 ? R.toFixed(2) : R.toFixed(1))

/** The pinned "Your storm" chip in the book bar. */
export function StormChip({ onOpen }: { onOpen: () => void }) {
  const storm = useStorm((s) => s.storm)
  const { dbz, R } = stormSummary(storm)
  return (
    <button
      type="button"
      className="storm-chip"
      onClick={onOpen}
      aria-haspopup="dialog"
      title="Your storm — shared by the simulators"
    >
      <span className="storm-chip-k">Your storm</span> D<sub>m</sub> {storm.Dm.toFixed(2)} mm · {dbz.toFixed(1)} dBZ ·{' '}
      {fmtR(R)} mm/h
    </button>
  )
}

/** Side panel to set, save and share the storm every linked simulator uses. */
export function StormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { storm, set, replace, saved, save, remove } = useStorm()
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)
  const loc = useLocation()
  const sum = stormSummary(storm)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const share = async () => {
    const url = `${location.origin}${location.pathname}#${loc.pathname}?storm=${encodeStorm(storm)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  const slider = (k: keyof Storm, label: ReactNode, display: string) => {
    const [min, max, step] = STORM_LIMITS[k]
    return (
      <Slider
        label={label}
        value={storm[k]}
        min={min}
        max={max}
        step={step}
        display={display}
        onChange={(v) => set({ [k]: v })}
      />
    )
  }

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label="Your storm" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-h">
          <b>Your storm</b>
          <button type="button" className="tbtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="psst">One drop size distribution, shared by every simulator that is linked to it.</p>
        <div className="ctrls">
          {slider(
            'Dm',
            <>
              D<sub>m</sub> — mean drop size
            </>,
            storm.Dm.toFixed(2) + ' mm',
          )}
          {slider(
            'logNw',
            <>
              log₁₀ N<sub>w</sub> — how many
            </>,
            storm.logNw.toFixed(2),
          )}
          {slider('mu', 'μ — shape', storm.mu.toFixed(1))}
          {slider('depth', 'Rain layer depth', storm.depth.toFixed(1) + ' km')}
        </div>
        <div className="reads" style={{ marginTop: 14 }}>
          <Readout k="Z (Rayleigh)">
            <U v={sum.dbz.toFixed(1)} u="dBZ" />
          </Readout>
          <Readout k="Rain rate">
            <U v={fmtR(sum.R)} u="mm/h" />
          </Readout>
          <Readout k="Liquid water">
            <U v={sum.lwc < 0.1 ? sum.lwc.toFixed(3) : sum.lwc.toFixed(2)} u="g/m³" />
          </Readout>
          <Readout k="DFR Ku−Ka">
            <U v={sum.dfr.toFixed(2)} u="dB" />
          </Readout>
        </div>

        <h4 className="drawer-sub">Start from</h4>
        <div className="seg">
          {STORM_PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => replace(p.storm)}>
              {p.name}
            </button>
          ))}
        </div>

        <h4 className="drawer-sub">Saved storms</h4>
        <form
          className="drawer-save"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) save(name.trim())
            setName('')
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this storm"
            maxLength={40}
            aria-label="Storm name"
          />
          <button type="submit" className="btn" disabled={!name.trim()}>
            Save
          </button>
        </form>
        {saved.length > 0 && (
          <ul className="drawer-list">
            {saved.map((s) => (
              <li key={s.name}>
                <button type="button" className="linkish" onClick={() => replace(s.storm)}>
                  {s.name}
                </button>
                <span className="tiny">
                  {s.storm.Dm.toFixed(2)} mm · 10^{s.storm.logNw.toFixed(1)}
                </span>
                <button
                  type="button"
                  className="linkish"
                  onClick={() => remove(s.name)}
                  aria-label={`Delete ${s.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn go" onClick={share}>
            {copied ? 'Link copied ✓' : 'Copy a link to this storm'}
          </button>
        </div>
      </aside>
    </div>
  )
}
