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
- 4 offices (HQ pilot + 3 scaffolded), 2 live floors, 10 departments, **~92 employees** (a few on notice, 6 unseated new joiners), **~98 seats** across both floors.
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

## Status

| Piece | State |
|---|---|
| Scaffold + design system + shell + store + seed | ✅ done (commit 1) |
| Module A — seating map | ⬜ next |
| Module B — assets | ⬜ |
| Executive dashboard + palette + notifications | 🟡 palette/notifications/toaster done; exec dashboard pending |
| Self-review pass | ⬜ |

## What's done

- Vite/TS/Tailwind configs, design tokens (light+dark), typography, scrollbars, component classes (btn/input/card/chip/kbd/skeleton).
- App shell: Sidebar (nav groups + live badges + reset), Topbar (⌘K trigger, theme, notifications), page transitions.
- Command palette (⌘/Ctrl-K) — searches people/seats/assets + navigation, keyboard nav. Wired to route `?seat=`/`/assets/:id`.
- Notifications sheet + toast system.
- Full domain types, seeded in-memory world, persisted store with latency-simulated mutations for seating + assets + movements + verifications.

## Next step (exact)

Build **Module A** — replace `/seating` placeholder with the interactive floor map:
`src/features/seating/FloorMap.tsx` (zoom/pan stage with normalized markers), legend, hover tooltip, seat detail `Sheet`, allocate/release/move flows (use `useData` actions already present), and search-to-zoom (read `?seat=` param). Then `/directory` and `/seating-analytics`. Commit as "Module A".

## Conventions

- Money in INR. Dates via `formatDate`/`relativeTime`. Status meta centralized in `src/lib/status.ts`.
- Keep every screen filled (seeded data) — no empty demo screens. Designed empty/loading/success states required.
