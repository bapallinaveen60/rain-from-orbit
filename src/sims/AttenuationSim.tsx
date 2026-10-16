import { useState } from 'react'
import {
  DETECTION_FLOOR,
  hbConstrained,
  hbProfile,
  measuredAt,
  powerLawMismatch,
  nwForR,
  rainColumn,
  Rrate,
  type Band,
  type Column,
} from '../physics'
import { axes, gridline, label, MONOS, poly, yTitle, type Frame, type Pt } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { StormLink } from './shared/StormLink'
import { useSimStorm } from './shared/useSimStorm'
import { Legend, Readout, Slider, Toggle, U, Widget } from './shared/ui'
import type { SimProps } from './types'

interface State {
  R: number
  depth: number
  Dm: number
}

interface Overlay {
  showHB: boolean
  compare: boolean
  /** Radar calibration error, dB. */
  calib: number
  /** PIA the surface reference reports, dB. */
  piaSrt: number
}

function drawColumn({ ctx, w: W, h: H, c }: Frame, st: State, m: Column, ov: Overlay) {
  const x0 = 46
  const x1 = W - 14
  const y0 = 16
  const y1 = H - 38
  const ZL = 0
  const ZH = 62
  const HH = Math.max(2, st.depth) + 0.6
  const X = (v: number) => x0 + ((v - ZL) / (ZH - ZL)) * (x1 - x0)
  const Y = (h: number) => y1 - (h / HH) * (y1 - y0)

  for (let h = 0; h <= Math.floor(HH); h++) gridline(ctx, x0, x1, Y(h), c)
  for (const b of ['ku', 'ka'] as Band[]) {
    ctx.save()
    ctx.setLineDash([2, 4])
    ctx.strokeStyle = b === 'ku' ? c.ku : c.ka
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(X(DETECTION_FLOOR[b]), y0)
    ctx.lineTo(X(DETECTION_FLOOR[b]), y1)
    ctx.stroke()
    ctx.restore()
  }
  label(ctx, 'Ku floor', X(DETECTION_FLOOR.ku) - 3, y0 + 8, c.ku, MONOS, 'right')
  label(ctx, 'Ka floor', X(DETECTION_FLOOR.ka) + 3, y0 + 8, c.ka, MONOS, 'left')

  for (const b of ['ku', 'ka'] as Band[]) {
    const col = b === 'ku' ? c.ku : c.ka
    poly(
      ctx,
      [
        [X(m[b].Ze), Y(st.depth)],
        [X(m[b].Ze), Y(0)],
      ],
      col,
      1.6,
      [5, 4],
    )
    const pts: Pt[] = []
    for (let i = 0; i <= 60; i++) {
      const s = (i / 60) * st.depth
      pts.push([X(Math.max(ZL, measuredAt(m[b], s))), Y(st.depth - s)])
    }
    poly(ctx, pts, col, 2.6)
    if (ov.compare && b === 'ku') {
      const srt = hbConstrained(m.ku, 'ku', st.depth, 60, ov.piaSrt, ov.calib).profile
      const sp: Pt[] = srt.filter((p) => Number.isFinite(p.ze)).map((p) => [X(Math.min(ZH, p.ze)), Y(p.h)])
      if (sp.length > 1) poly(ctx, sp, c.good, 2, [7, 3, 1.5, 3])
    }
    if (ov.showHB && b === 'ku') {
      const hb = hbProfile(m.ku, 'ku', st.depth, 60, ov.calib)
      const hp: Pt[] = []
      for (const p of hb) {
        if (!Number.isFinite(p.ze)) break
        hp.push([X(Math.min(ZH, p.ze)), Y(p.h)])
      }
      if (hp.length > 1) poly(ctx, hp, col, 1.7, [2, 3])
      if (hp.length && hp.length < hb.length) {
        const last = hp[hp.length - 1]
        ctx.fillStyle = c.bad
        ctx.beginPath()
        ctx.arc(last[0], last[1], 4, 0, 7)
        ctx.fill()
        label(ctx, 'HB diverges', last[0] - 7, last[1], c.bad, MONOS, 'right')
      }
    }
  }
  ctx.fillStyle = c.ink
  ctx.globalAlpha = 0.12
  ctx.fillRect(x0, Y(0), x1 - x0, y1 - Y(0) + 0.5)
  ctx.globalAlpha = 1

  axes(ctx, x0, y0, x1, y1, c)
  for (let v = 0; v <= 60; v += 10) label(ctx, v, X(v), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'reflectivity (dBZ)', (x0 + x1) / 2, y1 + 28, c.ink2, MONOS, 'center')
  for (let h = 0; h <= Math.floor(HH); h++) label(ctx, h, x0 - 7, Y(h), c.ink3, MONOS, 'right')
  yTitle(ctx, 'height above ground (km)', 12, (y0 + y1) / 2, c.ink2)
}

export default function AttenuationSim({ title, hint }: SimProps) {
  const link = useSimStorm('atten', { Dm: 1.5, logNw: nwForR(10, 1.5, 3), mu: 3, depth: 4 })
  const { Dm, logNw, mu, depth } = link.storm
  const st: State = { R: Rrate(Dm, logNw, mu), depth, Dm }
  const [showHB, setShowHB] = useState(false)
  const [compare, setCompare] = useState(false)
  const [calib, setCalib] = useState(0)
  const [srtErr, setSrtErr] = useState(0)
  const m = rainColumn({ ...st, mu })
  const piaSrt = Math.max(0, m.ku.pia + srtErr)
  const ref = usePlot((f) => drawColumn(f, st, m, { showHB, compare, calib, piaSrt }), 430 / 760)

  const hbBottom = hbProfile(m.ku, 'ku', st.depth, 60, calib).at(-1)!
  const den = hbBottom.den
  const srtBottom = hbConstrained(m.ku, 'ku', st.depth, 60, piaSrt, calib).profile.at(-1)!
  const errText = (ze: number) =>
    Number.isFinite(ze) ? (ze - m.ku.Ze >= 0 ? '+' : '') + (ze - m.ku.Ze).toFixed(1) : 'diverged'
  const errBad = (ze: number) => !Number.isFinite(ze) || Math.abs(ze - m.ku.Ze) > 1
  const kaSurf = m.ka.Ze - m.ka.pia
  const mis = powerLawMismatch(m.ku, 'ku')

  return (
    <Widget id="atten" title={title} hint={hint} tools={<StormLink linked={link.linked} setLinked={link.setLinked} />}>
      <div className="split">
        <div className="plotbox">
          <canvas ref={ref} role="img" aria-label="Measured and true reflectivity down a rain column" />
          <Legend
            items={[
              {
                color: 'var(--ku)',
                label: (
                  <>
                    Ku Z<sub>m</sub>
                  </>
                ),
              },
              {
                color: 'var(--ku)',
                opacity: 0.4,
                label: (
                  <>
                    Ku Z<sub>e</sub> (truth)
                  </>
                ),
              },
              {
                color: 'var(--ka)',
                label: (
                  <>
                    Ka Z<sub>m</sub>
                  </>
                ),
              },
              {
                color: 'var(--ka)',
                opacity: 0.4,
                label: (
                  <>
                    Ka Z<sub>e</sub> (truth)
                  </>
                ),
              },
              { plain: true, label: 'dotted: Hitschfeld–Bordan estimate (Ku)' },
              ...(compare ? [{ color: 'var(--good)', label: 'dash-dot: HB constrained by the SRT (Ku)' }] : []),
            ]}
          />
        </div>
        <div>
          <div className="ctrls">
            <Slider
              label="Rain rate through the column"
              value={st.R}
              min={0.5}
              max={120}
              step={0.5}
              display={(st.R < 10 ? st.R.toFixed(1) : st.R.toFixed(0)) + ' mm h⁻¹'}
              onChange={(R) => link.set({ logNw: nwForR(R, Dm, mu) })}
            />
            <Slider
              label="Rain layer depth"
              value={st.depth}
              min={1}
              max={8}
              step={0.1}
              display={st.depth.toFixed(1) + ' km'}
              onChange={(d) => link.set({ depth: d })}
            />
            <Slider
              label={
                <>
                  D<sub>m</sub> in the column
                </>
              }
              value={st.Dm}
              min={0.5}
              max={3.0}
              step={0.01}
              display={st.Dm.toFixed(2) + ' mm'}
              onChange={(d) => link.set({ Dm: d, logNw: nwForR(st.R, d, mu) })}
            />
            <div className="seg">
              <Toggle pressed={showHB} onClick={() => setShowHB((s) => !s)}>
                Show HB correction (Ku)
              </Toggle>
              <Toggle pressed={compare} onClick={() => setCompare((s) => !s)}>
                Compare with SRT
              </Toggle>
            </div>
            {(showHB || compare) && (
              <Slider
                label="Radar calibration error"
                value={calib}
                min={-3}
                max={3}
                step={0.1}
                display={(calib >= 0 ? '+' : '') + calib.toFixed(1) + ' dB'}
                onChange={setCalib}
              />
            )}
            {compare && (
              <Slider
                label="SRT error"
                value={srtErr}
                min={-3}
                max={3}
                step={0.1}
                display={(srtErr >= 0 ? '+' : '') + srtErr.toFixed(1) + ' dB'}
                onChange={setSrtErr}
              />
            )}
          </div>
          <div className="reads" style={{ marginTop: 14 }}>
            <Readout k="PIA Ku" tone="ku">
              <U v={m.ku.pia.toFixed(1)} u="dB" />
            </Readout>
            <Readout k="PIA Ka" tone="ka">
              <U v={m.ka.pia.toFixed(1)} u="dB" />
            </Readout>
            <Readout k="HB denominator" bad={!(den > 0.25)}>
              {den > 0 ? den.toFixed(3) : '≤ 0'}
            </Readout>
            <Readout k="Ka at surface" bad={!(kaSurf > DETECTION_FLOOR.ka)}>
              {kaSurf > DETECTION_FLOOR.ka ? (
                <U v={kaSurf.toFixed(1)} u="dBZ" />
              ) : (
                <small style={{ fontSize: 13 }}>below floor</small>
              )}
            </Readout>
            {(showHB || compare) && (
              <Readout k="HB error at surface" bad={errBad(hbBottom.ze)}>
                <U v={errText(hbBottom.ze)} u={Number.isFinite(hbBottom.ze) ? 'dB' : ''} />
              </Readout>
            )}
            {compare && (
              <Readout k="SRT-constrained error" bad={errBad(srtBottom.ze)}>
                <U v={errText(srtBottom.ze)} u="dB" />
              </Readout>
            )}
            <Readout k="assumed k ÷ true k" bad={mis > 1.08 || mis < 0.85}>
              <U v={mis.toFixed(2)} u="×" />
            </Readout>
          </div>
        </div>
      </div>
    </Widget>
  )
}
