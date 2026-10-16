import { useMemo, useState, type ReactNode } from 'react'
import {
  buildChainRay,
  CHAIN_STEPS,
  EPS_MAX,
  EPS_MIN,
  epsSweep,
  nwForZ,
  PIPE_DM,
  RDM_LOGNW,
  rdmRelation,
  solveBin,
  zContourR,
  type SweepPoint,
  type SweepResult,
  PIPE_CFB as CFB,
  PIPE_NODES,
  PIPE_T0 as T0,
  PIPE_ZTOP as ZTOP,
  type ChainRay,
  type ChainStep,
} from '../physics'
import { axes, gridline, label, MONOB, MONOS, poly, yTitle, type Frame, type Pt } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Readout, Slider, Toggle, U, Widget } from './shared/ui'
import type { SimProps } from './types'

function drawChain({ ctx, w: W, h: H, c }: Frame, P: ChainRay, step: number) {
  const N = P.z.length
  const x0 = 46
  const x1 = W - 66
  const y0 = 18
  const y1 = H - 38
  const X = (v: number) => x0 + (v / 55) * (x1 - x0)
  const Y = (h: number) => y1 - (h / ZTOP) * (y1 - y0)
  const XR = (v: number) => x0 + (v / 30) * (x1 - x0)
  const after = (k: ChainStep['k']) => CHAIN_STEPS.findIndex((s) => s.k === k) <= step
  for (let h = 0; h <= 12; h += 3) gridline(ctx, x0, x1, Y(h), c)

  const hline = (h: number, col: string, dash: number[], w: number) => {
    ctx.save()
    ctx.setLineDash(dash)
    ctx.strokeStyle = col
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x0, Y(h))
    ctx.lineTo(x1, Y(h))
    ctx.stroke()
    ctx.restore()
  }
  if (after('VER')) {
    hline(T0, c.ink3, [5, 4], 1.3)
    label(ctx, '0 °C', x1 - 3, Y(T0) - 9, c.ink3, MONOS, 'right')
  }
  if (after('PRE')) {
    ctx.fillStyle = c.ink
    ctx.globalAlpha = 0.11
    ctx.fillRect(x0, Y(CFB), x1 - x0, y1 - Y(CFB))
    ctx.globalAlpha = 1
    hline(CFB, c.ink3, [3, 3], 1.1)
    label(ctx, 'clutter-free bottom', x0 + 5, Y(CFB) + 11, c.ink3, MONOS)
    hline(9.0, c.accent, [3, 3], 1.1)
    label(ctx, 'binStormTop', x0 + 5, Y(9.0) - 9, c.accent, MONOS)
  }
  if (after('DSD')) {
    for (const [name, h] of PIPE_NODES) {
      ctx.fillStyle = c.ka
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(x1 + 13, Y(h), 3.2, 0, 7)
      ctx.fill()
      ctx.globalAlpha = 1
      label(ctx, name, x1 + 20, Y(h), c.ka, MONOB, 'left')
    }
    label(ctx, 'nodes', x1 + 8, y0 + 4, c.ka, MONOS, 'left')
  }
  if (after('CSF')) {
    ctx.save()
    ctx.fillStyle = c.ku
    ctx.globalAlpha = 0.14
    ctx.fillRect(x0, Y(T0 - 0.1), x1 - x0, Y(T0 - 1.0) - Y(T0 - 0.1))
    ctx.restore()
    label(ctx, 'bright band → stratiform', x0 + 5, Y(T0 - 0.55), c.ku, MONOS)
  }

  const series = (arr: number[], col: string, wd: number, dash: number[] | null, proj = X) => {
    const pts: Pt[] = []
    for (let i = 0; i < N; i++) if (arr[i] > 0) pts.push([proj(Math.min(55, arr[i])), Y(P.z[i])])
    if (pts.length > 1) poly(ctx, pts, col, wd, dash)
  }
  const keys: [string, string, number[] | null][] = []
  if (step === 0) {
    const pts: Pt[] = []
    for (let i = 0; i < N; i++)
      if (P.zm[i] > 0) pts.push([X(Math.min(55, P.zm[i] - 20 * Math.log10(Math.max(1, ZTOP - P.z[i] + 2)))), Y(P.z[i])])
    if (pts.length > 1) poly(ctx, pts, c.ink3, 2.2)
    keys.push([c.ink3, 'echo power (arbitrary scale)', null])
  } else {
    series(P.zm, c.ku, 2.4, null)
    keys.push([c.ku, 'Zm  measured', null])
  }
  if (after('SLV')) {
    series(P.ze, c.ku, 1.6, [4, 3])
    keys.push([c.ku, 'Ze  attenuation-corrected', [4, 3]])
    series(P.rr, c.ka, 2.2, null, XR)
    keys.push([c.ka, 'precipRate  (0–30 mm/h)', null])
  }
  if (after('SRT')) {
    const pia = P.ze[N - 1] - P.zm[N - 1]
    const yb = Y(0.22)
    ctx.save()
    ctx.strokeStyle = c.bad
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(X(P.zm[N - 1]), yb)
    ctx.lineTo(X(P.ze[N - 1]), yb)
    ctx.moveTo(X(P.zm[N - 1]), yb - 4)
    ctx.lineTo(X(P.zm[N - 1]), yb + 4)
    ctx.moveTo(X(P.ze[N - 1]), yb - 4)
    ctx.lineTo(X(P.ze[N - 1]), yb + 4)
    ctx.stroke()
    ctx.restore()
    keys.push([c.bad, 'PIA from SRT ≈ ' + pia.toFixed(1) + ' dB', null])
  }
  let ky = y0 + 9
  for (const [col, text, dash] of keys) {
    ctx.save()
    ctx.strokeStyle = col
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    if (dash) ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(x0 + 7, ky)
    ctx.lineTo(x0 + 21, ky)
    ctx.stroke()
    ctx.restore()
    label(ctx, text, x0 + 27, ky, c.ink2, MONOS)
    ky += 14
  }

  axes(ctx, x0, y0, x1, y1, c)
  for (let v = 0; v <= 50; v += 10) label(ctx, v, X(v), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'Z (dBZ)', (x0 + x1) / 2, y1 + 28, c.ink2, MONOS, 'center')
  for (let h = 0; h <= 12; h += 3) label(ctx, h, x0 - 7, Y(h), c.ink3, MONOS, 'right')
  yTitle(ctx, 'height (km)', 12, (y0 + y1) / 2, c.ink2)
}

/* ---------- R–Dm plane ---------- */

const DM_LO = 0.3
const DM_HI = 3.0
const R_LO = -1 // log10 mm/h
const R_HI = 2.3

function drawPlane(
  { ctx, w: W, h: H, c }: Frame,
  dbz: number,
  eps: number,
  truth: { Dm: number; R: number },
  solve: string,
) {
  const x0 = 50
  const x1 = W - 16
  const y0 = 18
  const y1 = H - 38
  const X = (d: number) => x0 + ((d - DM_LO) / (DM_HI - DM_LO)) * (x1 - x0)
  const Y = (r: number) => y1 - ((Math.log10(Math.max(r, 1e-6)) - R_LO) / (R_HI - R_LO)) * (y1 - y0)
  for (let g = -1; g <= 2; g++) gridline(ctx, x0, x1, Y(10 ** g), c)

  const curve = (f: (d: number) => number) => {
    const pts: Pt[] = []
    for (let i = 0; i <= 120; i++) {
      const d = DM_LO + (i / 120) * (DM_HI - DM_LO)
      const r = f(d)
      const lg = Math.log10(r)
      if (lg >= R_LO - 0.2 && lg <= R_HI + 0.2) pts.push([X(d), Y(r)])
    }
    return pts
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, x1 - x0, y1 - y0)
  ctx.clip()
  poly(
    ctx,
    curve((d) => rdmRelation(d, 1)),
    c.ink3,
    1.2,
    [4, 4],
  )
  poly(
    ctx,
    curve((d) => rdmRelation(d, eps)),
    solve,
    2.4,
  )
  poly(
    ctx,
    curve((d) => zContourR(d, dbz)),
    c.bad,
    2.4,
  )
  ctx.restore()

  const s = solveBin(dbz, eps)
  ctx.strokeStyle = c.ink
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(X(truth.Dm), Y(truth.R), 6, 0, 7)
  ctx.stroke()
  label(ctx, 'truth', X(truth.Dm) + 9, Y(truth.R) + 10, c.ink2, MONOS)
  if (s.Dm >= DM_LO && s.Dm <= DM_HI) {
    ctx.fillStyle = c.accent
    ctx.beginPath()
    ctx.arc(X(s.Dm), Y(s.R), 5, 0, 7)
    ctx.fill()
    label(ctx, `solution ${s.Dm.toFixed(2)} mm · ${s.R.toFixed(2)} mm/h`, X(s.Dm) + 9, Y(s.R) - 10, c.accent, MONOS)
  }
  label(ctx, `R–Dm relation, ε = ${eps.toFixed(2)}`, x0 + 8, y0 + 10, solve, MONOS)
  label(ctx, `Z contour, ${dbz.toFixed(1)} dBZ`, x0 + 8, y0 + 24, c.bad, MONOS)
  label(ctx, 'dashed: ε = 1', x0 + 8, y0 + 38, c.ink3, MONOS)

  axes(ctx, x0, y0, x1, y1, c)
  for (let d = 0.5; d <= 3; d += 0.5) label(ctx, d.toFixed(1), X(d), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'Dm  (mm)', (x0 + x1) / 2, y1 + 28, c.ink2, MONOS, 'center')
  for (const g of [0.1, 1, 10, 100]) label(ctx, g, x0 - 7, Y(g), c.ink3, MONOS, 'right')
  yTitle(ctx, 'R  (mm/h)', 12, (y0 + y1) / 2, c.ink2)
}

/* ---------- ε sweep ---------- */

function drawSweep({ ctx, w: W, h: H, c }: Frame, sw: SweepResult) {
  const x0 = 46
  const x1 = W - 16
  const y0 = 18
  const y1 = H - 38
  const CMAX = 16
  const X = (e: number) => x0 + (Math.log(e / EPS_MIN) / Math.log(EPS_MAX / EPS_MIN)) * (x1 - x0)
  const Y = (v: number) => y1 - (Math.min(v, CMAX) / CMAX) * (y1 - y0)
  for (let g = 0; g <= CMAX; g += 4) gridline(ctx, x0, x1, Y(g), c)
  const line = (f: (p: SweepPoint) => number, col: string, w: number, dash?: number[]) =>
    poly(
      ctx,
      sw.points.map((p) => [X(p.eps), Y(f(p))]),
      col,
      w,
      dash,
    )
  line((p) => p.prior, c.ink3, 1.6, [4, 3])
  line((p) => p.srt, c.bad, 1.6, [4, 3])
  line((p) => p.cost, c.accent, 2.6)
  const b = sw.best
  ctx.save()
  ctx.setLineDash([3, 3])
  ctx.strokeStyle = c.accent
  ctx.beginPath()
  ctx.moveTo(X(b.eps), y0)
  ctx.lineTo(X(b.eps), y1)
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.arc(X(b.eps), Y(b.cost), 5, 0, 7)
  ctx.fill()
  label(ctx, `best ε = ${b.eps.toFixed(2)}`, X(b.eps) + 7, y0 + 10, c.accent, MONOS)
  label(ctx, 'total cost', x0 + 8, y0 + 10, c.accent, MONOS)
  label(ctx, 'a: prior on ε', x0 + 8, y0 + 24, c.ink3, MONOS)
  label(ctx, 'b: PIA vs SRT', x0 + 8, y0 + 38, c.bad, MONOS)

  axes(ctx, x0, y0, x1, y1, c)
  for (const e of [0.2, 0.5, 1, 2, 5]) label(ctx, e, X(e), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'ε  (log scale)', (x0 + x1) / 2, y1 + 28, c.ink2, MONOS, 'center')
  for (let g = 0; g <= CMAX; g += 4) label(ctx, g, x0 - 7, Y(g), c.ink3, MONOS, 'right')
  yTitle(ctx, 'cost', 12, (y0 + y1) / 2, c.ink2)
}

/* ---------- what each module reads and writes, for this ray ---------- */

type Row = [string, ReactNode]
const row = (k: string, v: ReactNode): Row => [k, v]

function stepIO(k: ChainStep['k'], ray: ChainRay, sw: SweepResult, piaSrt: number): { inp: Row[]; out: Row[] } {
  const N = ray.z.length
  const at = (h: number) => ray.z.reduce((best, z, i) => (Math.abs(z - h) < Math.abs(ray.z[best] - h) ? i : best), 0)
  const cfb = at(CFB)
  let bb = 0
  for (let i = 0; i < N; i++) if (Math.abs(ray.z[i] - (T0 - 0.5)) < 0.6 && ray.zm[i] > ray.zm[bb]) bb = i
  const surf = solveBin(ray.ze[cfb], sw.best.eps)
  const km = (v: number) => <U v={v.toFixed(2)} u="km" />
  const dbz = (v: number) => <U v={v.toFixed(1)} u="dBZ" />
  switch (k) {
    case 'L1B':
      return { inp: [['received power', `${N} range bins × ${(ZTOP / (N - 1)).toFixed(2)} km`]], out: [] }
    case 'PRE':
      return {
        inp: [['received power', 'per bin']],
        out: [
          ['binStormTop', km(9.0)],
          ['binClutterFreeBottom', km(CFB)],
          ['Zm′ at clutter-free bottom', dbz(ray.zm[cfb])],
        ],
      }
    case 'VER':
      return {
        inp: [
          ['Zm′', 'per bin'],
          ['GANAL analysis', 'T, humidity, cloud water'],
        ],
        out: [
          ['0 °C height', km(T0)],
          ['zFactorNPCorrected', 'gas and cloud attenuation removed (not modelled here)'],
        ],
      }
    case 'CSF':
      return {
        inp: [
          ['zFactorNPCorrected', 'per bin'],
          ['0 °C height', km(T0)],
        ],
        out: [
          row(
            'bright-band peak',
            <>
              {km(ray.z[bb])} · {dbz(ray.zm[bb])}
            </>,
          ),
          ['typePrecip', 'stratiform'],
          ['flagBB', 'detected'],
        ],
      }
    case 'DSD':
      return {
        inp: [
          ['typePrecip', 'stratiform'],
          ['bright band', km(ray.z[bb])],
        ],
        out: [
          ...PIPE_NODES.map(([n, h]) => [`node ${n}`, km(h)] as Row),
          ['phase', 'solid above A · mixed B–D · liquid below'],
        ],
      }
    case 'SRT':
      return {
        inp: [['σ⁰ in rain vs rain-free reference', 'along-track, cross-track, climatology']],
        out: [row('pathAtten (liquid layer)', <U v={piaSrt.toFixed(2)} u="dB" />)],
      }
    case 'SLV':
      return {
        inp: [
          ['Z per bin', 'from CSF and VER'],
          row('PIA from SRT', <U v={piaSrt.toFixed(2)} u="dB" />),
          ['ε range', `${EPS_MIN} – ${EPS_MAX}`],
        ],
        out: [
          ['chosen ε', sw.best.eps.toFixed(2)],
          row('PIA of that solution', <U v={sw.best.pia.toFixed(2)} u="dB" />),
          row('Dm near surface', <U v={surf.Dm.toFixed(2)} u="mm" />),
        ],
      }
    case 'OUT':
      return {
        inp: [['Solver result', 'per bin']],
        out: [
          ['zFactorFinal (near surface)', dbz(ray.ze[cfb])],
          row('precipRateNearSurface', <U v={surf.R.toFixed(2)} u="mm/h" />),
          row(
            'paramDSD',
            <>
              log₁₀N<sub>w</sub> {surf.logNw.toFixed(2)} · D<sub>m</sub> {surf.Dm.toFixed(2)} mm
            </>,
          ),
          row('true rain rate here', <U v={ray.rr[cfb].toFixed(2)} u="mm/h" />),
        ],
      }
  }
}

type View = 'profile' | 'plane' | 'sweep'
const nearest = (ray: ChainRay, h: number) =>
  ray.z.reduce((b, z, i) => (Math.abs(z - h) < Math.abs(ray.z[b] - h) ? i : b), 0)

export default function PipelineSim({ title, hint }: SimProps) {
  const ray = useMemo(() => buildChainRay(), [])
  const [step, setStep] = useState(0)
  const [view, setView] = useState<View>('profile')
  const [binH, setBinH] = useState(1.5)
  const [eps, setEps] = useState(1)
  const [srtErr, setSrtErr] = useState(0)

  const truthPia = useMemo(() => epsSweep(ray, 0).truthPia, [ray])
  const piaSrt = Math.max(0, truthPia + srtErr)
  const sweep = useMemo(() => epsSweep(ray, piaSrt), [ray, piaSrt])
  const bin = nearest(ray, binH)
  const truth = { Dm: PIPE_DM, R: ray.rr[bin] }
  const trueEps = 10 ** (nwForZ(ray.ze[bin], PIPE_DM, 3) - RDM_LOGNW)

  const ref = usePlot((f) => {
    if (view === 'plane') {
      const solve = getComputedStyle(document.documentElement).getPropertyValue('--solve').trim()
      drawPlane(f, ray.ze[bin], eps, truth, solve)
    } else if (view === 'sweep') drawSweep(f, sweep)
    else drawChain(f, ray, step)
  }, 430 / 760)
  const S = CHAIN_STEPS[step]
  const io = stepIO(S.k, ray, sweep, piaSrt)
  const aria =
    view === 'profile'
      ? `One ray after ${S.name}`
      : view === 'plane'
        ? 'The R–Dm plane for one range bin'
        : 'Solver cost against epsilon'

  return (
    <Widget id="pipe" title={title} hint={hint}>
      <div className="seg" style={{ marginBottom: 10 }}>
        <Toggle pressed={view === 'profile'} onClick={() => setView('profile')}>
          Profile
        </Toggle>
        <Toggle pressed={view === 'plane'} onClick={() => setView('plane')}>
          R–D<sub>m</sub> plane
        </Toggle>
        <Toggle pressed={view === 'sweep'} onClick={() => setView('sweep')}>
          ε sweep
        </Toggle>
      </div>
      <div className="split">
        <div className="plotbox">
          <canvas ref={ref} role="img" aria-label={aria} />
          {view === 'plane' && (
            <div className="ctrls" style={{ marginTop: 10 }}>
              <Slider
                label="Range bin height"
                value={binH}
                min={0.8}
                max={4.1}
                step={0.1}
                display={binH.toFixed(1) + ' km'}
                onChange={setBinH}
              />
              <Slider
                label="ε — move the assumed relation"
                value={Math.log10(eps)}
                min={Math.log10(EPS_MIN)}
                max={Math.log10(EPS_MAX)}
                step={0.01}
                display={eps.toFixed(2)}
                onChange={(v) => setEps(10 ** v)}
              />
              <div className="reads">
                <Readout k="Z at this bin">
                  <U v={ray.ze[bin].toFixed(1)} u="dBZ" />
                </Readout>
                <Readout k="ε that hits the truth">{trueEps.toFixed(2)}</Readout>
              </div>
              <p className="psst">
                Illustrative relation fitted to this book&apos;s DSD model, not the ATBD&apos;s tabulated coefficients.
              </p>
            </div>
          )}
          {view === 'sweep' && (
            <div className="ctrls" style={{ marginTop: 10 }}>
              <Slider
                label="SRT error"
                value={srtErr}
                min={-2}
                max={2}
                step={0.05}
                display={(srtErr >= 0 ? '+' : '') + srtErr.toFixed(2) + ' dB'}
                onChange={setSrtErr}
              />
              <div className="reads">
                <Readout k="True PIA (liquid)">
                  <U v={truthPia.toFixed(2)} u="dB" />
                </Readout>
                <Readout k="SRT says">
                  <U v={piaSrt.toFixed(2)} u="dB" />
                </Readout>
                <Readout k="Best ε">{sweep.best.eps.toFixed(2)}</Readout>
              </div>
            </div>
          )}
        </div>
        <div>
          <div style={{ display: 'grid', gap: 5 }}>
            {CHAIN_STEPS.map((s, i) => (
              <button
                key={s.k}
                type="button"
                className={'opt' + (i === step ? ' cur' : '')}
                style={{ opacity: i <= step ? 1 : 0.5 }}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => setStep(i)}
              >
                <span className="mk">{i === 0 ? '·' : i}</span>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
          <div className="fb" style={{ marginTop: 12 }} role="status">
            <b>{S.name}.</b> {S.desc}
          </div>
          {(io.inp.length > 0 || io.out.length > 0) && (
            <table className="t io-table">
              <tbody>
                {io.inp.map(([k, v]) => (
                  <tr key={'i' + k}>
                    <td className="io-dir">in</td>
                    <td>{k}</td>
                    <td className="n">{v}</td>
                  </tr>
                ))}
                {io.out.map(([k, v]) => (
                  <tr key={'o' + k} className="io-out">
                    <td className="io-dir">out</td>
                    <td>{k}</td>
                    <td className="n">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 9 }}>
            <button
              className="btn"
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              ← Back
            </button>
            <button
              className="btn go"
              type="button"
              disabled={step === CHAIN_STEPS.length - 1}
              onClick={() => setStep((s) => Math.min(CHAIN_STEPS.length - 1, s + 1))}
            >
              Next module →
            </button>
          </div>
        </div>
      </div>
    </Widget>
  )
}
