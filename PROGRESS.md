# Locus — Asset & Workplace OS · Build Progress

> Sales-concept demo (front-end only, mock data). Goal: a unified Asset & Workplace
> Management platform that looks like a real, mature product. **Polish > completeness.**

## Product decisions

- **Product name:** **Locus** — "Workplace OS" (industry-agnostic placeholder; no client-specific branding in the UI).
- **Stack:** React 18 + Vite + TypeScript + Tailwind 3 · Recharts (charts) · framer-motion (motion) · lucide-react (icons) · qrcode.react (QR) · zustand + persist (state → `localStorage`) · react-router 6.
- **Theme:** light + dark via `class` strategy + CSS-variable design tokens (`src/index.css`). Dark is default.
- **Fake API:** mutations run through the zustand store with simulated latency (`latency()` in `src/lib/utils.ts`); views use `useSimulatedLoad` for skeletons so it "feels live".
- **Persistence keys:** `locus.db` (data, versioned), `locus.theme` (theme).
- **Floor plans (v12 — both from real drawings):** both floors now render directly from the client's architect PDFs, image-backed.
  - **Floor 1 = Office at Aga Khan Foundation** (`AIWC Floor Plan-21Aug25.pdf`, J+AM Storey, FINAL FLOOR LAYOUT PLAN). Background `public/floors/floor1.png` (1840×1462, title/legend/tables cropped). **144 workstations (W1–W146) + 10 cabins (C1–C6 ×2 wings)** overlaid at exact coords → `floor1Seats.ts`. Zones mapped from the drawing's department legend (Highway/Bridge & Tunnel, Finance, IT, Tech Innovation, People & Culture, …).
  - **Floor 2 = Proposed RODIC Office at YMCA Building, New Delhi** (`YMCA Floor Plan.pdf`, DIRECTIONS, Seating Arrangement Plan). Background `public/floors/floor2.png` (2072×1094). **88 numbered workstations + 10 named executive cabins** (CEO, CMD, DIRECTOR, H.C Arora, B.P Singh, Chitranjan, Dr Kazmi, Sapan Gupta, Adarsh Bagharia, Rajnikant) → `floor2Seats.ts`.
  - Extraction: pymupdf renders the page (YMCA is rotated 270° → mapped via `page.rotation_matrix`), seat coords read from the PDF text layer, filtered to the drawing crop, normalized 0–1. `FloorGeometry.bg`/`FloorPlan.bg` drive `FloorSVG` to draw an `<image>` (on a white plate) as the map; seat markers overlay unchanged and stay editable. Regenerate via the one-off `gen.py` (pymupdf + PIL).
  - **Hybrid editing:** the image is a *reference layer*, not a dead end — the editor's Room/Wall/Door/Furniture tools render on top of it (`FloorSVG` draws `plan.rooms/walls/doors/furniture` over the image, rooms translucent so the drawing shows through), and the drawing dims to 50% in edit mode so traced elements stand out. So the whole floor is buildable/re-traceable from the frontend while the exact drawing stays as the base. "Reset plan" clears the overlay back to just the drawing + seats.
  - ✅ The previously-corrupt YMCA PDF was **replaced by a working file** from the user (`YMCA Floor Plan (1).pdf`) — now used as Floor 2. The earlier note about it being unrecoverable no longer applies.

## Mock-data shape (`src/lib/types.ts`, seeded in `src/lib/seed.ts`)

- Location hierarchy: Country → State → City → **Office → Building → Floor → Zone → Seat**.
- 4 offices (HQ pilot + 3 scaffolded), 2 live floors (both real drawings — see above), 10 departments, **~208 employees** (a few on notice, 6 unseated new joiners), **252 seats** across both floors (154 on Floor 1, 98 on Floor 2 → ~80% occupancy).
- Both floors are image-backed from the real PDFs (see the Floor-plans note above); seat coords live in `floor1Seats.ts` / `floor2Seats.ts`, consumed by `floorplans.ts` (`fixedSeats`). Employee names are neutral placeholders (not the real staff printed on the drawings).
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
| Front-end layout editor — move/add/remove/edit seats + reset | ✅ commit 6 |
| Architectural floor-plan editor — rooms/walls/doors/furniture + measurements + from-scratch office/floor builder + dashboard wiring | ✅ commit 7 |

All screens verified via headless-Chromium screenshots (dark + light, desktop + mobile).
`npm run build` passes; `npx tsc --noEmit` clean. Dev screenshot harness lives at
`shots.mjs` (git-ignored) — `node shots.mjs <dark|light> <desktop|mobile> [filter]`.

## What's done

- Vite/TS/Tailwind configs, design tokens (light+dark), typography, scrollbars, component classes (btn/input/card/chip/kbd/skeleton).
- App shell: Sidebar (nav groups + live badges + reset), Topbar (⌘K trigger, theme, notifications), page transitions.
- Command palette (⌘/Ctrl-K) — searches people/seats/assets + navigation, keyboard nav. Wired to route `?seat=`/`/assets/:id`.
- Notifications sheet + toast system.
- Full domain types, seeded in-memory world, persisted store with latency-simulated mutations for seating + assets + movements + verifications.
- **Architectural floor-plan editor** (Floor Map → "Edit layout") — a CAD-lite editor where the *entire* floor is editable front-end data, no backend. All geometry now lives in the store as `floorPlans[floorId]` (a `FloorPlan`: rooms, walls, doors, furniture, corridors, markers, `pxPerFoot` scale) seeded from the shipped geometry via `geometryToPlan`; `FloorSVG` renders from the plan (typed partition walls, doors with swing arcs, furniture glyphs), and `FloorCanvas` hosts the interaction overlay.
  - **Tools** (`features/seating/LayoutEditor.tsx` `ToolPalette`): Select/move, Room, Wall, Door, Furniture, Seat, Measure + grid-snap toggle. Contextual option chips per tool (room kind, partition type, door type, furniture kind — all from the RODIC legend/schedule).
  - **Rooms** — draw (drag), move, resize (8 handles), rename/sub-label/kind, live **ft-in dimensions + sq-ft area**, delete. **Walls** — typed gypsum/glass/brick segments at real thickness, draw + move + endpoint-drag + retype. **Doors** — wooden/glass/sliding/double/toilet with swing arcs, place + rotate + flip + resize. **Furniture** — workstation/table/sofa/reception/storage/screen/plant/WC/stairs presets at true sizes, place/drag-size/move/resize/rotate. **Seats** — move/add/rename/type/zone/delete. **Measure** — drag to read a ft-in distance. Grid + snap (0.5 ft) with px-per-ft scale control.
  - **Auto panels** — `PropertiesPanel` (type-specific fields for the selection, dims in feet), `AreaSchedule` (built-up area + per-space counts/areas, mirrors the drawing's schedule), `PlanLegend` (partition types).
  - **From-scratch builder** (`FloorBuilder.tsx`): create a new office (name/city/code) and/or a blank floor at a chosen size (ft) + scale, then draw it up. New floors/offices flow into the store (`createOffice`/`createFloor`) and appear everywhere (floor selector, dashboard).
  - **Dashboard wiring** — the Workplace card subtitle is live: `N floors · M offices · X sq ft built-up`, computed from `floorPlans` (`roomAreaSqFt`). Occupancy/by-floor already live off seats.
  - Store actions: `addRoom/updateRoom/removeRoom`, `addWall/updateWall/removeWall`, `addDoor/updateDoor/removeDoor`, `addFurniture/updateFurniture/removeFurniture`, `setFloorScale`, `updateFloorPlanMeta`, `resetFloorPlan`, `createOffice`, `createFloor`, `removeFloor` (+ the seat actions from commit 6). Persist **v11** with a `migrate` that preserves existing user data while filling `floorPlans` from seed. Files: `features/seating/layout.ts` (model + presets + measurement helpers), `FloorSVG.tsx`, `FloorCanvas.tsx`, `LayoutEditor.tsx`, `FloorBuilder.tsx`, `pages/SeatingPage.tsx`, `pages/DashboardPage.tsx`, `lib/store.ts`.

## Next step (exact)

Build is feature-complete and demo-ready. Optional polish: route-level code-splitting
(`React.lazy`) to shrink the ~950 kB bundle; wall/room **snapping to each other** (endpoint &
edge snapping) for faster precise drawing; door auto-orient to the nearest wall on drop;
undo/redo for the editor; per-floor **Area schedule export** (CSV/print) matching the drawing's
title block; more seeded activity.
Run `npm run dev`, then `node shots.mjs dark desktop` to regenerate review screenshots.

## Conventions

- Money in INR. Dates via `formatDate`/`relativeTime`. Status meta centralized in `src/lib/status.ts`.
- Keep every screen filled (seeded data) — no empty demo screens. Designed empty/loading/success states required.
