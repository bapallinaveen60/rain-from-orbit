// Runs the ORIGINAL physics code from ../web/Rain from Orbit.html in a sandbox and
// records its outputs over a fixed grid of inputs to tests/physics/reference.json.
// The TypeScript port is snapshot-tested against this file, so any drift shows up.
// Re-run only if the original book's maths changes on purpose.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(resolve(root, process.argv[2] ?? '../web/Rain from Orbit.html'), 'utf8')

function between(start, end, from = 0) {
  const a = html.indexOf(start, from)
  if (a < 0) throw new Error('marker not found: ' + start)
  const b = html.indexOf(end, a + start.length)
  if (b < 0) throw new Error('marker not found: ' + end)
  return html.slice(a, b)
}

const parts = {
  physics: between(
    '/* --- Lanczos log-gamma --- */',
    '/* ===================================================================\n   2.',
  ),
  dbz: between('var DBZ=[', '(function(){\n  var bar='),
  orbit: between('var INC=65*Math.PI/180', '  function draw(){', html.indexOf("$('cv-orbit')")),
  hbfit: between('var HBFIT={};', "(function(){\n  var cv=$('cv-atten')"),
  scan: between('var NB=49, NZ=96, ZTOP=16;', '  function drawCurtain(){'),
  classify: between('var ZTOP=15, N=110;', '  var profs=SPECS.map'),
  pipe: between('var ZTOP=13, N=130, T0=4.6;', '  var CFB=0.75;'),
}

const code = `
"use strict";
${parts.physics}
${parts.dbz}
var orbit=(function(){ ${parts.orbit}; return {track:track,offset:offset}; })();
${parts.hbfit}
var scan=(function(){ ${parts.scan}; return {scenes:scenes,angOf:angOf,cfbOf:cfbOf,topOf:topOf}; })();
var classify=(function(){ ${parts.classify}; return {SPECS:SPECS,profile:profile}; })();
var pipe=(function(){ ${parts.pipe.replace(/var STEPS=\[[\s\S]*?\n  \];/, '')}; return P; })();
this.out = {lgamma, waterEps, Ksq, csqrt, mie, BANDS, Dgrid, fmu, nd, Zray, Rrate, LWC,
  nwForZ, nwForR, mieZK, dB, dfrOf, dbzColor, orbit, HBFIT, scan, classify, pipe};
`
const ctx = { Math, Float64Array, Array, Object, String, Number, isFinite, NaN }
vm.createContext(ctx)
vm.runInContext(code, ctx)
const P = ctx.out

const r = (x) => (typeof x === 'number' && isFinite(x) ? +x.toPrecision(12) : x)
const arr = (a) => Array.from(a, r)

const DMS = [0.3, 0.6, 1.0, 1.5, 2.0, 2.72, 3.5]
const NWS = [2, 3.9, 4, 5]
const MUS = [-1, 0, 3, 6, 10]

const ref = {
  source: 'Rain from Orbit.html',
  lgamma: [0.1, 0.5, 1, 1.5, 2.5, 4, 7.3, 14].map((z) => [z, r(P.lgamma(z))]),
  waterEps: [13.6, 35.5].flatMap((f) =>
    [0, 10, 20].map((T) => {
      const e = P.waterEps(f, T)
      return [f, T, r(e.r), r(e.i), r(P.Ksq(e))]
    }),
  ),
  mie: ['ku', 'ka'].flatMap((b) => {
    const B = P.BANDS[b]
    const m = P.csqrt(P.waterEps(B.f, 10))
    return [0.05, 0.1, 0.5, 1, 2, 3, 5, 8].map((D) => {
      const o = P.mie(D, B.lam, m)
      return [b, D, r(o.sb), r(o.se)]
    })
  }),
  bands: Object.fromEntries(
    ['ku', 'ka'].map((b) => {
      const B = P.BANDS[b]
      return [b, { lam: r(B.lam), K2: r(B.K2), zc: r(B.zc), sb: arr(B.sb), se: arr(B.se) }]
    }),
  ),
  dsd: DMS.flatMap((Dm) =>
    NWS.flatMap((nw) =>
      MUS.map((mu) => [
        Dm,
        nw,
        mu,
        r(P.Zray(Dm, nw, mu)),
        r(P.Rrate(Dm, nw, mu)),
        r(P.LWC(Dm, nw, mu)),
        r(P.nd(1.2, Dm, nw, mu)),
        r(P.fmu(mu)),
      ]),
    ),
  ),
  nwFor: DMS.flatMap((Dm) => MUS.map((mu) => [Dm, mu, r(P.nwForZ(29, Dm, mu)), r(P.nwForR(10, Dm, mu))])),
  mieZK: ['ku', 'ka'].flatMap((b) =>
    DMS.flatMap((Dm) =>
      [0, 3].map((mu) => {
        const o = P.mieZK(b, Dm, 4, mu)
        return [b, Dm, mu, r(o.Ze), r(o.k)]
      }),
    ),
  ),
  dfr: [0, 3, 6].flatMap((mu) => [0.2, 0.5, 1, 1.5, 2, 2.5, 3, 4].map((Dm) => [Dm, mu, r(P.dfrOf(Dm, mu))])),
  hbfit: { ku: [r(P.HBFIT.ku.a), r(P.HBFIT.ku.b)], ka: [r(P.HBFIT.ka.a), r(P.HBFIT.ka.b)] },
  dbzColor: [5, 10, 13, 22, 30.5, 45, 57.9, 58, 70].map((v) => [v, P.dbzColor(v)]),
  orbit: {
    track: [0, 60, 600, 2781, 5562, 20000, 86400].map((t) => [t, ...P.orbit.track(t).map(r)]),
    offset: [
      [[0, 0], [1, 1], 1.1],
      [[78, 21], [79, 23], -4.06],
      [[170, 60], [-175, 62], 2],
    ].map(([p, q, d]) => [p, q, d, ...P.orbit.offset(p, q, d).map(r)]),
  },
  scan: {
    angOf: [0, 12, 24, 36, 48].map((b) => [b, r(P.scan.angOf(b))]),
    cfbOf: [0, 12, 24, 36, 48].map((b) => [b, r(P.scan.cfbOf(b))]),
    scenes: Object.fromEntries(
      ['squall', 'strat', 'shallow'].map((k) => [k, [0, 10, 24, 30, 48].map((b) => [b, arr(P.scan.scenes[k][b])])]),
    ),
  },
  classify: P.classify.SPECS.map((s) => {
    const p = P.classify.profile(s)
    return { a: s.a, ku: arr(p.ku), ka: arr(p.ka) }
  }),
  pipeline: { zm: arr(P.pipe.zm), ze: arr(P.pipe.ze), rr: arr(P.pipe.rr) },
}

const outPath = resolve(root, 'tests/physics/reference.json')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(ref))
console.log('wrote tests/physics/reference.json', JSON.stringify(ref).length, 'bytes')
console.log('sample: Box A Z/R', r(P.Zray(2.72, P.nwForZ(29, 2.72, 3), 3)), r(P.Rrate(2.72, P.nwForZ(29, 2.72, 3), 3)))
