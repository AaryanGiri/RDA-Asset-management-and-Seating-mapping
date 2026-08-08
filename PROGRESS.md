# Locus — Asset & Workplace OS · Build Progress

> Sales-concept demo (front-end only, mock data). Goal: a unified Asset & Workplace
> Management platform that looks like a real, mature product. **Polish > completeness.**

## Product decisions

- **Product name:** **Locus** — "Workplace OS" (industry-agnostic placeholder; no client-specific branding in the UI).
- **Stack:** React 18 + Vite + TypeScript + Tailwind 3 · Recharts (charts) · framer-motion (motion) · lucide-react (icons) · qrcode.react (QR) · zustand + persist (state → `localStorage`) · react-router 6.
- **Theme:** light + dark via `class` strategy + CSS-variable design tokens (`src/index.css`). Dark is default.
- **Fake API:** mutations run through the zustand store with simulated latency (`latency()` in `src/lib/utils.ts`); views use `useSimulatedLoad` for skeletons so it "feels live".
- **Persistence keys:** `locus.db` (data, versioned), `locus.theme` (theme).
- **Floor plans:** custom hand-authored **SVG** floors (not the source PDFs). Floor 1 mirrors the RODIC layout structure (courtyard, cabins C1–C8, boardroom, meeting rooms, training room, open workstation bays). Floor 2 is a modern open-plan studio. Geometry authored in viewBox units in `src/features/seating/floorplans.ts`; **seats emitted as normalized 0–1 coords** so markers stay pixel-perfect through zoom/pan/resize.
  - ⚠️ The supplied **`YMCA Floor Plan.pdf` is corrupt** (truncated — missing catalog/page-tree/trailer, no embedded images; unrecoverable). Custom SVG floors used instead — better for demo polish & seat alignment anyway. Flag to user in final report.

## Mock-data shape (`src/lib/types.ts`, seeded in `src/lib/seed.ts`)

- Location hierarchy: Country → State → City → **Office → Building → Floor → Zone → Seat**.
- 4 offices (HQ pilot + 3 scaffolded), 2 live floors, 10 departments, **~98 employees** (a few on notice, 6 unseated new joiners), **~108 seats** across both floors.
- **Floor 1 (Level 3) uses the REAL RODIC drawing as the map background** (`public/floors/floor1.png` — rendered from `RODIC LAYOUT.pdf` via pymupdf, legend/title block whited-out, cropped). The 68 workstations (W1–W68) and 8 cabins (C1–C8) are overlaid at **exact coordinates extracted from the PDF's own text** → `src/features/seating/floor1Seats.ts` (auto-generated). `FloorGeometry` gained `bg` + `fixedSeats`; `FloorCanvas` renders an `<img>` (on a white sheet) instead of `FloorSVG` when `bg` is set, with a smaller marker radius. This is the client's actual office — the earlier vector redraw was rejected as not exact. Floor 2 (Level 5) remains a vector studio.
  - To regenerate the background + coords from an updated PDF, re-run the pymupdf render/extract (redaction boxes + CLIP in the one-off script; seats written to `floor1Seats.ts`).
- Seat status: `vacant | occupied | notice | maintenance | blocked` (color + non-color cue).
- **~48 assets**, 8 categories, condition `new|good|fair|damaged|beyond-repair`, status `in-use|in-transit|under-repair|in-storage|disposed`; each with photos, timeline, verification due. 6 movement requests across stages, 16 verification tasks, 7 notifications.

## Folder structure

```
src/
  components/   shell (Sidebar, Topbar, Shell), CommandPalette, Notifications, Toaster, Logo, Page, ui.tsx (primitives)
  features/
    seating/    floorplans.ts (geometry + seat generator)  [map/panel/flows next]
    assets/     [next]
  lib/          types, utils, status, seed, store (data), uiStore (theme/toasts/palette)
  pages/        Placeholder (stub) → real pages per module
  hooks.ts      useSimulatedLoad, useMediaQuery, useCountUp
```

## Status — BUILD COMPLETE ✅

| Piece | State |
|---|---|
| Scaffold + design system + shell + store + seed | ✅ commit 1 |
| Module A — seating map, detail panel, directory, analytics | ✅ commit 2 |
| Module B — register, QR passport, movements, verification, analytics, scan | ✅ commit 3 |
| Executive dashboard + command palette + notifications | ✅ commit 4 |
| Self-review pass (screenshots, mobile, build, polish) | ✅ commit 5 |

All screens verified via headless-Chromium screenshots (dark + light, desktop + mobile).
`npm run build` passes; `npx tsc --noEmit` clean. Dev screenshot harness lives at
`shots.mjs` (git-ignored) — `node shots.mjs <dark|light> <desktop|mobile> [filter]`.

## What's done

- Vite/TS/Tailwind configs, design tokens (light+dark), typography, scrollbars, component classes (btn/input/card/chip/kbd/skeleton).
- App shell: Sidebar (nav groups + live badges + reset), Topbar (⌘K trigger, theme, notifications), page transitions.
- Command palette (⌘/Ctrl-K) — searches people/seats/assets + navigation, keyboard nav. Wired to route `?seat=`/`/assets/:id`.
- Notifications sheet + toast system.
- Full domain types, seeded in-memory world, persisted store with latency-simulated mutations for seating + assets + movements + verifications.

## Next step (exact)

Build is feature-complete and demo-ready. If resuming for enhancements, candidate polish
items (all optional): route-level code-splitting (`React.lazy`) to shrink the 922 kB bundle;
a seat-configuration "place marker on map" admin mode; CSV import UI; more seeded activity.
Run `npm run dev`, then `node shots.mjs dark desktop` to regenerate review screenshots.

## Conventions

- Money in INR. Dates via `formatDate`/`relativeTime`. Status meta centralized in `src/lib/status.ts`.
- Keep every screen filled (seeded data) — no empty demo screens. Designed empty/loading/success states required.
