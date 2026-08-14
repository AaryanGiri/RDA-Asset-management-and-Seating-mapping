# Rodic AssetSpace — Asset & Workplace Platform

A clickable, front-end-only **concept demo** of a unified Asset & Workplace Management
platform. Built to *look and feel like a real, mature product* — a sales/vision piece,
not a pilot or production build. Everything is mock data held in-memory and persisted to
`localStorage`; there is no backend, login, or real integration.

The product is branded **"Rodic AssetSpace"** — a unified workplace-seating and
asset-management platform.

## Run it

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173). No login — you land straight
in the app. Use **⌘K / Ctrl-K** for the command palette; toggle light/dark from the top bar.

Build a static bundle with `npm run build` (output in `dist/`).

## What's inside

**Module A — Interactive Seating & Workplace Map**
- Two real architectural floor plans rendered straight from the client's CAD drawings —
  the **Aga Khan Foundation office** (AIWC, 144 workstations + 10 cabins) and the
  **YMCA Building office** (88 workstations + 10 named cabins) — with a clean floor switcher.
- Seats overlaid as markers using **normalized 0–1 coordinates** extracted from each PDF's
  own text layer, so they stay pixel-perfect on the drawing through zoom / pan / resize.
  Scroll to zoom, drag to pan, fit-to-screen, zoom-to-seat on search.
- Five seat statuses (Vacant / Occupied / On Notice / Maintenance / Blocked), each with a
  colour **and** a non-colour glyph cue, plus an interactive legend.
- Click a seat → detail panel (occupant, allocation history); hover → tooltip; search a
  person → floor switches, zooms and highlights their seat.
- Allocate / release / move / block / maintenance flows with confirmation and an audit trail.
- Employee Locator directory and a Seating Analytics dashboard (occupancy, vacancy,
  upcoming-vacancy) with premium charts.

**Module B — Asset Management (Section 7 — simple & traceable, no QR)**
- Asset register classified into **Tangible / Intangible / Land & Building**, each with
  admin-maintainable **subcategories**; every asset has a unique **Asset ID**.
- Asset record: category + subcategory, name, **assigned employee**, office/location,
  **responsible person**, status (In Use / In Storage / Defective / Discarded) and remarks.
- **Image management** — deployment image at assignment, current image over life, and a
  **defect image** required before disposal (real file upload, stored on the record).
- **Defective → action** flow: the responsible person flags a defect with an image + remarks;
  Admin reviews and decides — **discard**, move to storage, or return to use.
- Full **lifecycle timeline** per asset (deployment, reassignment, images, defect, action).
- Add asset + manage categories from the register; CSV export.

**Shared shell**
- One executive dashboard spanning both modules, a global command palette (⌘/Ctrl-K),
  a notifications area, light + dark mode, skeleton loaders, and micro-interactions throughout.
- **Admin / Employee** roles switchable from the top bar; fully responsive.

## Tech

React + Vite + TypeScript + Tailwind · Recharts · framer-motion · qrcode.react · zustand
(with `localStorage` persistence). Mock data sits behind a thin fake-API layer with a touch
of simulated latency so it feels live. **Reset demo data** any time from the sidebar footer.

## Notes for reviewers

- Both floors are rendered directly from the client's actual architect drawings —
  `AIWC Floor Plan-21Aug25.pdf` (Office at Aga Khan Foundation) and `YMCA Floor Plan.pdf`
  (Proposed office at YMCA Building, New Delhi). Each drawing is rasterised as the map
  background (title block / legend / summary tables cropped out) and every seat marker is
  placed at coordinates read from the PDF's own text layer, so the overlay is exact. To
  regenerate from an updated PDF, re-run the pymupdf render/extract that writes
  `public/floors/floorN.png` + `src/features/seating/floorNSeats.ts`.
- All *people* data is seeded and in-memory (neutral placeholder names, not the real staff on
  the drawings) — every screen is deliberately populated so nothing looks empty. Actions
  persist across refresh via `localStorage`.
