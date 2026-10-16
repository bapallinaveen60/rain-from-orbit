import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { boxR, boxZ, dB, fallSpeed, zShares, BOX_A } from '../../physics'
import { LiveNumber } from './LiveNumber'

/** The reader's own box of drops, shared by the Z and R pages. */
const useDropBox = create<{ d: number[]; set: (i: number, v: number) => void; reset: () => void }>()(
  persist(
    (set) => ({
      d: BOX_A,
      set: (i, v) => set((s) => ({ d: s.d.map((x, k) => (k === i ? v : x)) })),
      reset: () => set({ d: BOX_A }),
    }),
    { name: 'rfo-dropbox' },
  ),
)

const pad = (s: string, n: number) => s.padStart(n)

/**
 * Box A, but live: drag any diameter and every line of the by-hand arithmetic recomputes.
 * `show` picks which sum to work through: reflectivity (Ch2 Details 2) or rain rate (Details 3).
 */
export function LiveDropBox({ show }: { show: 'z' | 'r' }) {
  const { d, set, reset } = useDropBox()
  const Z = boxZ(d)
  const R = boxR(d)
  const shares = zShares(d)
  const terms = d.map((D) => D ** 3 * fallSpeed(D))
  const big = d.indexOf(Math.max(...d))

  const drops = (
    <p className="live-drops">
      Drops of{' '}
      {d.map((D, i) => (
        <span key={i}>
          <LiveNumber
            value={D}
            onChange={(v) => set(i, v)}
            min={0.1}
            max={6}
            step={0.1}
            digits={1}
            unit="mm"
            label={`diameter of drop ${i + 1}`}
          />
          {i < d.length - 2 ? ', ' : i === d.length - 2 ? ' and ' : ''}
        </span>
      ))}{' '}
      in one cubic metre.{' '}
      <button type="button" className="linkish" onClick={reset}>
        back to Box A
      </button>
    </p>
  )

  if (show === 'z')
    return (
      <>
        {drops}
        <div className="calc">
          {'Z = '}
          {d.map((D, i) => (
            <span key={i}>
              <span className="o">{D.toFixed(1)}</span>
              <sup>6</sup>
              {i < d.length - 1 ? '  +  ' : ''}
            </span>
          ))}
          {'\nZ = '}
          {d.map((D, i) => (
            <span key={i}>
              <span className="o">{(D ** 6).toFixed(D ** 6 < 10 ? 2 : 0)}</span>
              {i < d.length - 1 ? '  +  ' : ''}
            </span>
          ))}
          {'\nZ = '}
          <span className="hl">{Z.toFixed(Z < 10 ? 2 : 0)}</span> mm<sup>6</sup> m<sup>−3</sup>
          {'  =  '}
          <span className="hl">{dB(Z).toFixed(1)} dBZ</span>
        </div>
        <p className="psst">
          The {d[big].toFixed(1)} mm drop makes <b>{(shares[big] * 100).toFixed(1)}%</b> of the echo.
        </p>
      </>
    )

  return (
    <>
      {drops}
      <div className="calc">
        {d.map((D, i) => (
          <span key={i}>
            {'v('}
            <span className="o">{D.toFixed(1)}</span>
            {`) = ${fallSpeed(D).toFixed(2)} m/s  →  D`}
            <sup>3</sup>
            {`v = ${pad((D ** 3).toFixed(D ** 3 < 10 ? 2 : 1), 6)} × ${fallSpeed(D).toFixed(2)} = `}
            <span className="o">{terms[i].toFixed(2)}</span>
            {'\n'}
          </span>
        ))}
        {'Σ = '}
        <span className="hl">{terms.reduce((a, b) => a + b, 0).toFixed(1)}</span>
        {'\nR = 6π × 10'}
        <sup>−4</sup>
        {' × Σ = '}
        <span className="hl">
          {R.toFixed(R < 10 ? 2 : 1)} mm h<sup>−1</sup>
        </span>
      </div>
      <p className="psst">
        Echo {dB(Z).toFixed(1)} dBZ, rain {R.toFixed(2)} mm/h. Try making one drop huge, then three medium ones with the
        same echo.
      </p>
    </>
  )
}
