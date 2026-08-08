# Locus — Asset & Workplace OS

A clickable, front-end-only **concept demo** of a unified Asset & Workplace Management
platform. Built to *look and feel like a real, mature product* — a sales/vision piece,
not a pilot or production build. Everything is mock data held in-memory and persisted to
`localStorage`; there is no backend, login, or real integration.

Product branding sits behind a neutral placeholder — **"Locus · Workplace OS"** — so it
reads as a platform any organisation could buy (construction, manufacturing, healthcare,
logistics, IT, government).

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
- Two custom vector floor plans (Level 3 corporate, Level 5 studio) with a clean floor switcher.
- Seats overlaid as markers using **normalized 0–1 coordinates** — pixel-perfect through
  zoom / pan / resize. Scroll to zoom, drag to pan, fit-to-screen, zoom-to-seat on search.
- Five seat statuses (Vacant / Occupied / On Notice / Maintenance / Blocked), each with a
  colour **and** a non-colour glyph cue, plus an interactive legend.
- Click a seat → detail panel (occupant, allocation history); hover → tooltip; search a
  person → floor switches, zooms and highlights their seat.
- Allocate / release / move / block / maintenance flows with confirmation and an audit trail.
- Employee Locator directory and a Seating Analytics dashboard (occupancy, vacancy,
  upcoming-vacancy) with premium charts.

**Module B — Asset Lifecycle Management (QR-based)**
- Asset register with generated **QR codes** and a printable label view.
- A rich asset **passport**: identity, location, custodian, condition, photo history
  (guided capture slots), and a full lifecycle timeline.
- Simulated **scan-to-open** (mobile-first), guided photo capture, and a governed
  **movement workflow** (request → AI condition suggestion + confidence → human confirm →
  in-transit → receipt scan) on a kanban board.
- Monthly **condition verification** with a simulated AI suggestion (New / Good / Fair /
  Damaged / Beyond-Repair + confidence + a highlighted "changed area") and a human decision.
  *AI moments are clearly assistive — no real model runs.*
- Asset Analytics dashboard (category / value / condition / status / verification compliance).

**Shared shell**
- One executive dashboard spanning both modules, a global command palette (⌘/Ctrl-K),
  a notifications area, light + dark mode, skeleton loaders, and micro-interactions throughout.
- Fully responsive; the scan / verify flows are designed for phones.

## Tech

React + Vite + TypeScript + Tailwind · Recharts · framer-motion · qrcode.react · zustand
(with `localStorage` persistence). Mock data sits behind a thin fake-API layer with a touch
of simulated latency so it feels live. **Reset demo data** any time from the sidebar footer.

## Notes for reviewers

- The two source floor-plan drawings informed the structure; the map itself is redrawn as
  crisp vector floors so seat markers align flawlessly and the screen reads as a designed
  product rather than a CAD scan. *(The supplied `YMCA Floor Plan.pdf` was corrupt /
  truncated and could not be opened; a complementary studio floor was designed in its place.)*
- All data is seeded and in-memory — every screen is deliberately populated so nothing looks
  empty. Actions persist across refresh via `localStorage`.
