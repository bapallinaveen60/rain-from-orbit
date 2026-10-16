# Rain from Orbit — web app

The interactive React edition of _Rain from Orbit_, an illustrated guide to the GPM Dual-frequency Precipitation Radar.
The original single-file book lives in `../web/` and is the reference this app is checked against.
See `../web/IMPLEMENTATION_PLAN.md` for the full plan.

## Status

| Phase                                                | State   |
| ---------------------------------------------------- | ------- |
| 0 Scaffold — shell, routing, themes, fonts, PDFs, CI | done    |
| 1 Physics core — typed port, parity tests, worker    | done    |
| 2 Content migration — 70 MDX pages, book components  | done    |
| 3 Simulator parity                                   | next    |
| 4–7                                                  | planned |

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

## Routing

Hash routes (`#/ch/3/2`) so deep links work on any static host. Links to the old book (`#c3p2`) redirect.
Keys: ← → pages, `[` `]` chapters, `T` theme.
