import * as Comlink from 'comlink'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Readout, Slider, Toggle, U } from '../sims/shared/ui'
import { usePlot } from '../sims/shared/usePlot'
import { drawCurtain, drawOverview, drawProfile, drawStrip, RATE_LEGEND, STRIP_MARGIN, CURTAIN_MARGIN } from './draw'
import { NRAY, type Band, type Curtain, type GranuleSummary, type Profile } from './reader'
import type { GranuleWorkerApi } from './granule-worker'

const WIN = 400
const ALONG = 120
const SAMPLE = `${import.meta.env.BASE_URL}data/sample-granule.h5`

let remote: Comlink.Remote<GranuleWorkerApi> | null = null
const worker = () =>
  (remote ??= Comlink.wrap<GranuleWorkerApi>(
    new Worker(new URL('./granule-worker.ts', import.meta.url), { type: 'module' }),
  ))

const fmt = (v: number, d = 1, u = '') => (Number.isFinite(v) ? <U v={v.toFixed(d)} u={u} /> : '—')
const near = (p: Profile) => {
  // lowest bin with a retrieved DSD
  for (let k = p.dm.length - 1; k >= 0; k--) if (p.dm[k] > 0) return k
  return -1
}

/** Open a real GPM Level-2 radar granule and walk through it: swath → curtain → ray. */
export function ExplorerPage() {
  const [summary, setSummary] = useState<GranuleSummary | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [isSample, setIsSample] = useState(false)
  const [center, setCenter] = useState(0)
  const [pick, setPick] = useState<{ scan: number; ray: number } | null>(null)
  const [band, setBand] = useState<Band>('ku')
  const [cross, setCross] = useState<Curtain | null>(null)
  const [along, setAlong] = useState<Curtain | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [top, setTop] = useState(16)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Granule explorer · Rain from Orbit'
    window.scrollTo(0, 0)
  }, [])

  const s0 = summary ? Math.max(0, Math.min(summary.nscan - WIN, center - WIN / 2)) : 0
  const s1 = summary ? Math.min(summary.nscan, s0 + WIN) : 0

  const overview = usePlot((f) => summary && drawOverview(f, summary, s0, s1), 0.42)
  const strip = usePlot((f) => summary && drawStrip(f, summary, s0, s1, pick), 0.3)
  const crossPlot = usePlot(
    (f) => cross && drawCurtain(f, cross, top, pick?.ray ?? null, 'Across track at the picked scan'),
    0.55,
  )
  const alongPlot = usePlot(
    (f) => along && pick && drawCurtain(f, along, top, pick.scan - along.scan0, 'Along track at the picked ray'),
    0.42,
  )
  const profPlot = usePlot((f) => profile && drawProfile(f, profile, top), 0.95)

  const loaded = async (s: GranuleSummary, sample: boolean) => {
    setSummary(s)
    setIsSample(sample)
    setCenter(s.maxScan)
    await choose(s.maxScan, s.maxRay, s)
  }

  const open = async (f: File) => {
    setError('')
    setBusy(`Opening ${f.name} (${(f.size / 1e6).toFixed(0)} MB)…`)
    try {
      await loaded(await worker().openFile(f), false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }
  const openSample = async () => {
    setError('')
    setBusy('Loading the sample…')
    try {
      await loaded(await worker().openUrl(SAMPLE, 'sample-granule.h5'), true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  async function choose(scan: number, ray: number, s = summary, b = band) {
    if (!s) return
    setPick({ scan, ray })
    const a0 = Math.max(0, Math.min(s.nscan - ALONG, scan - ALONG / 2))
    const [c, a, p] = await Promise.all([
      worker().crossTrack(scan, b),
      worker().alongTrack(ray, a0, Math.min(s.nscan, a0 + ALONG), b),
      worker().profile(scan, ray, b),
    ])
    setCross(c)
    setAlong(a)
    setProfile(p)
  }

  const onStrip = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!summary) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left - STRIP_MARGIN.left
    const y = e.clientY - r.top - STRIP_MARGIN.top
    const w = r.width - STRIP_MARGIN.left - STRIP_MARGIN.right
    const h = r.height - STRIP_MARGIN.top - STRIP_MARGIN.bottom
    if (x < 0 || y < 0 || x > w || y > h) return
    choose(Math.min(s1 - 1, s0 + Math.floor((x / w) * (s1 - s0))), Math.min(NRAY - 1, Math.floor((y / h) * NRAY)))
  }
  const onCurtain = (e: PointerEvent<HTMLCanvasElement>, cu: Curtain | null) => {
    if (!cu || !pick) return
    const r = e.currentTarget.getBoundingClientRect()
    const w = r.width - CURTAIN_MARGIN.left - CURTAIN_MARGIN.right
    const col = Math.floor(((e.clientX - r.left - CURTAIN_MARGIN.left) / w) * cu.ncol)
    if (col < 0 || col >= cu.ncol) return
    if (cu.along) choose(cu.scan0 + col, pick.ray)
    else choose(pick.scan, col)
  }
  const onOverview = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!summary) return
    const r = e.currentTarget.getBoundingClientRect()
    const lon = ((e.clientX - r.left) / r.width) * 360 - 180
    const lat = 90 - ((e.clientY - r.top) / r.height) * 180
    let best = 0
    let bd = Infinity
    for (let sc = 0; sc < summary.nscan; sc += 2) {
      const i = sc * NRAY + 24
      const d = (summary.lon[i] - lon) ** 2 + (summary.lat[i] - lat) ** 2
      if (d < bd) {
        bd = d
        best = sc
      }
    }
    setCenter(best)
  }

  const k = profile ? near(profile) : -1

  return (
    <div className="wrap">
      <h3 className="ph try">Granule explorer</h3>
      <div className="pgrid one">
        <div className="pbox plain">
          <p>
            Open a GPM Level-2 radar granule — <code>2A.GPM.Ku</code>, <code>2A.GPM.Ka</code> or <code>2A.GPM.DPR</code>
            , version 07, an <code>.HDF5</code> file from NASA PPS or JAXA G-Portal — and walk through it: the swath, a
            curtain, one ray. The file is read in your browser and never uploaded; only the slices on screen are read,
            so a 600 MB granule is fine.
          </p>
          <div className="seg">
            <button type="button" className="btn go" onClick={() => fileInput.current?.click()} disabled={!!busy}>
              Open a granule…
            </button>
            <button type="button" className="btn" onClick={openSample} disabled={!!busy}>
              Try the sample
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".HDF5,.hdf5,.h5,.he5"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) open(f)
            }}
          />
          {busy && <p className="psst">{busy}</p>}
          {error && (
            <p className="psst" role="alert" style={{ color: 'var(--bad)' }}>
              {error}
            </p>
          )}
        </div>

        {summary && (
          <div className="wgt" id="p-granule">
            <div className="wgt-h">
              {summary.product}
              <span>
                {summary.start} → {summary.end.slice(11)}
              </span>
            </div>
            {isSample && (
              <p className="psst" style={{ marginTop: 0 }}>
                The sample is synthetic — the book&apos;s storm scenes written in the real file layout, so you can try
                the explorer without a download. Open a real granule for real rain.
              </p>
            )}
            <div className="explorer-top">
              <div className="plotbox">
                <canvas
                  ref={overview}
                  role="img"
                  aria-label="Orbit overview; click to move the window"
                  onPointerDown={onOverview}
                  style={{ cursor: 'pointer' }}
                />
              </div>
              <div className="reads">
                <Readout k="Scans">{summary.nscan}</Readout>
                <Readout k="Raining pixels">{summary.rainyPixels.toLocaleString()}</Readout>
                <Readout k="Heaviest near-surface rain">
                  <U v={summary.maxRate.toFixed(1)} u="mm/h" />
                </Readout>
                <Readout k="Frequencies">{summary.dual ? 'Ku + Ka' : 'single'}</Readout>
              </div>
            </div>
            <Slider
              label="Window along the orbit"
              value={center}
              min={0}
              max={summary.nscan - 1}
              step={1}
              display={`scans ${s0}–${s1 - 1}`}
              onChange={setCenter}
            />
            <div className="plotbox" style={{ marginTop: 8 }}>
              <canvas
                ref={strip}
                role="img"
                aria-label="Near-surface rain rate for the window; click a pixel"
                onPointerDown={onStrip}
                style={{ cursor: 'crosshair' }}
              />
              <div className="legend">
                {RATE_LEGEND.map(({ v, c }) => (
                  <span key={v}>
                    <i style={{ background: c, height: 8 }} />
                    {v}
                  </span>
                ))}
                <span style={{ color: 'var(--ink3)' }}>mm/h</span>
              </div>
            </div>
            <div className="seg" style={{ margin: '10px 0' }}>
              {summary.dual && (
                <>
                  <Toggle
                    pressed={band === 'ku'}
                    onClick={() => (setBand('ku'), pick && choose(pick.scan, pick.ray, summary, 'ku'))}
                  >
                    Ku
                  </Toggle>
                  <Toggle
                    pressed={band === 'ka'}
                    onClick={() => (setBand('ka'), pick && choose(pick.scan, pick.ray, summary, 'ka'))}
                  >
                    Ka
                  </Toggle>
                </>
              )}
              {[8, 12, 16, 20].map((t) => (
                <Toggle key={t} pressed={top === t} onClick={() => setTop(t)}>
                  top {t} km
                </Toggle>
              ))}
            </div>
            {pick && (
              <div className="split">
                <div>
                  <div className="plotbox">
                    <canvas
                      ref={crossPlot}
                      role="img"
                      aria-label="Across-track reflectivity curtain; click a ray"
                      onPointerDown={(e) => onCurtain(e, cross)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div className="plotbox" style={{ marginTop: 10 }}>
                    <canvas
                      ref={alongPlot}
                      role="img"
                      aria-label="Along-track reflectivity curtain; click a scan"
                      onPointerDown={(e) => onCurtain(e, along)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="plotbox">
                    <canvas
                      ref={profPlot}
                      role="img"
                      aria-label={`Profile of scan ${pick.scan}, ray ${pick.ray + 1}`}
                    />
                    <div className="legend">
                      <span>
                        <i style={{ background: 'var(--ku)' }} />
                        zFactorFinal
                      </span>
                      <span>
                        <i style={{ background: 'var(--ku)', opacity: 0.5 }} />
                        zFactorMeasured (dashed)
                      </span>
                      <span>
                        <i style={{ background: 'var(--ka)' }} />
                        precipRate
                      </span>
                    </div>
                  </div>
                  {profile && (
                    <div className="reads" style={{ marginTop: 10 }}>
                      <Readout k="Pixel">
                        <small style={{ fontSize: 13 }}>
                          scan {profile.scan} · ray {profile.ray + 1} · {profile.lat.toFixed(2)}°,{' '}
                          {profile.lon.toFixed(2)}°
                        </small>
                      </Readout>
                      <Readout k="typePrecip">{profile.klass}</Readout>
                      <Readout k="Near-surface rain">{fmt(profile.rateNearSurface, 2, 'mm/h')}</Readout>
                      <Readout k="Near-surface Z">{fmt(profile.zNearSurface, 1, 'dBZ')}</Readout>
                      <Readout k="Storm top">{fmt(profile.heightStormTop, 2, 'km')}</Readout>
                      <Readout k="0 °C height">{fmt(profile.heightZeroDeg, 2, 'km')}</Readout>
                      <Readout k="Bright band">{profile.flagBB > 0 ? fmt(profile.heightBB, 2, 'km') : 'none'}</Readout>
                      <Readout k="Clutter-free bottom">
                        {fmt(profile.heightClutterFree - profile.elevation, 2, 'km AGL')}
                      </Readout>
                      <Readout k="PIA (final)">{fmt(profile.piaFinal, 2, 'dB')}</Readout>
                      <Readout k="PIA (SRT)">{fmt(profile.pathAtten, 2, 'dB')}</Readout>
                      <Readout k="Dm near surface">{k >= 0 ? fmt(profile.dm[k], 2, 'mm') : '—'}</Readout>
                      <Readout k="Nw near surface">{k >= 0 ? fmt(profile.nwDb[k], 1, 'dB') : '—'}</Readout>
                      <Readout k="ε near surface">
                        {k >= 0 && profile.epsilon.length ? fmt(profile.epsilon[k], 2) : '—'}
                      </Readout>
                      <Readout k="Zenith angle">{fmt(profile.localZenithAngle, 1, '°')}</Readout>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
