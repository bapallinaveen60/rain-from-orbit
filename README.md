# Rain from Orbit — web app

The interactive React edition of _Rain from Orbit_, an illustrated guide to the GPM Dual-frequency Precipitation Radar.

**Live app: <https://bapallinaveen60.github.io/rain-from-orbit/>**

There is also an Android app in [`android/`](android/README.md) that bundles the same book for offline reading.

The original single-file book lives in `../web/` and is the reference this app is checked against.
See `../web/IMPLEMENTATION_PLAN.md` for the full plan.

## Status

| Phase                                                | State |
| ---------------------------------------------------- | ----- |
| 0 Scaffold — shell, routing, themes, fonts, PDFs, CI | done  |
| 1 Physics core — typed port, parity tests, worker    | done  |
| 2 Content migration — 70 MDX pages, book components  | done  |
| 3 Simulator parity — all 8 sims rebuilt in React     | done  |
| 4 Shared storm state + learning tools                | done  |
| 5 Simulator upgrades                                 | done  |
| 6 Reader features + ship                             | done  |
| 7 Real data (granule explorer)                       | done  |

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # physics unit + parity tests (Vitest)
npm run test:e2e     # every page × light/dark × phone/desktop (Playwright; run `npx playwright install chromium` once)
npm run lint         # oxlint
npm run typecheck
npm run build        # static site in dist/ (set BASE=/repo-name/ for GitHub Pages)
```

## Layout

```
src/app/        shell: routes, chapter rail, page dots, pager, keyboard shortcuts
src/content/    chNN/pPP.mdx (one per page), figures/*.svg, manifest.json + chapters.ts helpers
src/components/book/  page vocabulary used by the MDX: Box, Talk, Calc, Alert, Note, Quiz, Sim, figures
src/physics/    the book's maths as pure TypeScript — Mie, gamma DSD, attenuation/HB, DFR,
                melting model, orbit, scan geometry, classify profiles, Level-2 chain ray
src/sims/       the 8 simulators (canvas + React controls); shared/ has usePlot, draw helpers, controls
src/store/      Zustand stores (settings, reading progress), persisted to localStorage
src/styles/     tokens.css + book.css extracted verbatim from the original; app.css for additions
scripts/        extract-shell.mjs (CSS, SVG defs, manifest) · extract-pages.mjs (pages, figures, quizzes)
                capture-reference.mjs (parity snapshot)
tests/physics/  reference.json is produced by running the ORIGINAL code; the port must match it
```

## The physics is checked, not trusted

`tests/physics/snapshot.test.ts` compares every ported function to outputs captured from the original HTML's own
code (to 1 part in 10¹⁰). `tests/physics/physics.test.ts` checks the numbers the book prints: Box A's 794 mm⁶ m⁻³ /
29.0 dBZ / 0.50 mm h⁻¹, Mie within 0.01 dB of Rayleigh for small drops, the ρ_b = √P_w table, the U step at
ρ_b = 0.09, and the melting-particle size/speed table.

One interpretation is flagged in code: the ATBD's third fall-speed regime is printed only as "interpolate to the
raindrop speed". `melting.ts` interpolates linearly in ρ_b, which matches the book's table to within 0.01 m s⁻¹.

## Simulator upgrades (Phase 5)

- **Orbit** — map or draggable globe, 407 → 442 km boost (period and swath), click any place for DPR/GMI pass counts and the longest gap.
- **DSD lab** — drag the curve, storm presets, solve N_w to match a target Z.
- **Scan curtain** — send an animated pulse down the selected ray.
- **Attenuation** — HB vs SRT-constrained HB, with calibration and SRT error knobs.
- **DFR** — inverse mode: drag a measured DFR and see every Dₘ that explains it.
- **Classify** — 12 profiles, streaks, evidence overlay after you commit, shuffled replays.
- **Level-2 chain** — inputs → outputs for each module, an R–Dₘ plane and an ε sweep. The R–Dₘ relation is fitted to the book's own DSD model (the ATBD coefficients are not printed in the book), and is labelled as illustrative.

## Routing

Hash routes (`#/ch/3/2`) so deep links work on any static host. Links to the old book (`#c3p2`) redirect.
Keys: ← → pages, `[` `]` chapters, `Ctrl K` or `/` search, `S` your storm, `T` theme, `?` help.
Other routes: `#/glossary`, `#/notes`, `#/review`.

## Learning tools

- **Your storm** — one DSD (Dₘ, N_w, μ, depth) shared by the DSD, attenuation and DFR simulators; each can be unlinked. Save storms, or share one with a link (`?storm=Dm_logNw_mu_depth`).
- **Live drop box** — the Ch2 by-hand pages let you scrub each drop diameter and watch the arithmetic recompute.
- **I'll do it** — any worked-maths block with a highlighted numeric result can hide its results for you to fill in and check.
- **Glossary** — the MDX build (`scripts/rehype-glossary.ts`) links the first mention of each term in `src/data/glossary.json` on every page.
- **Review** — missed self-check questions collect on one page to retry.

`src/content` is hand-edited now; `npm run extract:pages` refuses to overwrite it without `--force`.

## Reader features (Phase 6)

- **Progress** per chapter in the rail; opening `#/` resumes where you left off.
- **Bookmarks** (☆ in the page bar) and **notes** — select any passage, press ✎ Note. Both live on `#/notes`,
  with export/import of everything the app stores in the browser.
- **Search** (Ctrl K) over every page and the glossary, from `src/content/search-index.json`
  (run `npm run build:search` after editing content; a test fails if the index is stale).
- **Story mode** skips the Details pages for a lighter read.
- **Offline / installable** (vite-plugin-pwa): the app and figures are precached; PDFs cache on first download.
  Icons are drawn by `scripts/make-icons.mjs`.
- **Accessibility**: skip link, every control named (checked in the browser), the `--ink3` grey darkened to meet
  WCAG AA.

## Deploying

`.github/workflows/deploy.yml` lints, type-checks, runs Vitest and the Playwright sweep, builds with
`BASE=/<repo>/` and deploys to GitHub Pages on every push to `main`. One-time setup in the GitHub repo:
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Licence

Not chosen yet. The usual pairing is CC BY 4.0 for text and illustrations and MIT for code; the five ATBD figures stay
under their own terms (JAXA/NASA) and must not be used commercially without permission.

## Granule explorer (Phase 7)

`#/explore` opens a real GPM Level-2 radar granule — `2A.GPM.Ku`, `2A.GPM.Ka` or `2A.GPM.DPR`, V07, from NASA PPS
or JAXA G-Portal — entirely in the browser: the orbit on a real map (Leaflet, with key-free Esri grey/satellite and OpenStreetMap basemaps; click to pick a pixel), a near-surface rain strip (click any pixel), the
across-track and along-track reflectivity curtains drawn from each bin's own `PRE/height`, and the full ray profile
with storm top, 0 °C, bright band, clutter-free bottom, PIA (final and SRT), Dₘ, N_w and the Solver's ε.

- `src/granule/reader.ts` reads only the slices on screen; `src/granule/worker.ts` mounts the picked file with
  h5wasm's WORKERFS, so a 600 MB granule opens in about half a second and is never uploaded.
- h5wasm (≈4 MB) loads only on the explorer route.
- `public/data/sample-granule.h5` (2 MB) is **synthetic** — the book's storm scenes written in the real V07 layout by
  `scripts/make-sample-granule.ts` — so the explorer can be tried without a download. It is labelled in the UI.
- Conventions checked against a real V07B 2A-Ku granule: bin numbers are **1-based** (index = bin − 1), missing values
  are below −1000, `typePrecip`'s leading digit is the class. `tests/granule.test.ts` runs against the sample always,
  and against a real granule when `GPM_GRANULE` points to one.

This replaces the plan's Python converter: reading the HDF5 directly needs no install and no intermediate files.
