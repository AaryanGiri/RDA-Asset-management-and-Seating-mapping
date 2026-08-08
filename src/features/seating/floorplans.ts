import type { SeatType } from '@/lib/types'

// Geometry is authored in viewBox units; seats are emitted as normalized 0–1
// coordinates so the marker overlay stays pixel-perfect through zoom / pan / resize.

export interface Rect { x: number; y: number; w: number; h: number }

export type RoomKind =
  | 'courtyard'
  | 'meeting'
  | 'service'
  | 'reception'
  | 'open'
  | 'balcony'
  | 'collab'
  | 'training'
  | 'office'
  | 'cabin'

export interface RoomShape extends Rect {
  id: string
  label: string
  sub?: string
  kind: RoomKind
  chairs?: number
}

export interface DeskBank {
  zone: string
  type: SeatType
  prefix: string
  startN: number
  x: number
  y: number
  cols: number
  rows: number
  dx: number
  dy: number // full row pitch
}

export interface CabinDef {
  seatNumber: string
  zone: string
  x: number
  y: number
  w: number
  h: number
}

export interface GeneratedSeat {
  seatNumber: string
  zone: string
  seatType: SeatType
  x: number // normalized
  y: number
}

export interface FloorGeometry {
  id: string
  vbw: number
  vbh: number
  slab: string
  slabRect: Rect
  rooms: RoomShape[]
  banks: DeskBank[]
  cabins: CabinDef[]
  cores: Rect[]
  /** When set, the floor is rendered from a real drawing image instead of vector rooms. */
  bg?: { src: string }
  /** Exact per-seat coordinates (used instead of generated banks when present). */
  fixedSeats?: GeneratedSeat[]
  /** Standalone zone captions drawn over open areas. */
  zoneLabels?: { x: number; y: number; text: string }[]
  /** Building floor plate (architectural rendering). */
  plate?: Rect
  /** Walkable circulation lanes. */
  corridors?: (Rect & { dir?: 'h' | 'v' })[]
  /** Points of interest (entry, etc.). */
  markers?: { x: number; y: number; label: string; kind: 'entry' }[]
  /** Seat marker radius in viewBox units (default 12). */
  markerR?: number
}

// ── Floor 1 — RODIC "Office at Aga Khan Foundation" · 2D architectural plan ───
// Rendered as a proper floor plan: floor plate + exterior wall, walkable corridors,
// rooms as walled cells grouped into blocks, and open workstation bays. viewBox 1200×780.
const FLOOR_1: FloorGeometry = {
  id: 'f1',
  vbw: 1200,
  vbh: 780,
  slabRect: { x: 32, y: 30, w: 1136, h: 720 },
  slab: '',
  plate: { x: 32, y: 30, w: 1136, h: 720 },
  cores: [],
  markerR: 8,
  banks: [
    // West Wing open bay — W1–W28 (clean 7×4 grid)
    { zone: 'West Wing', type: 'workstation', prefix: 'W', startN: 1, x: 62, y: 448, cols: 7, rows: 4, dx: 28, dy: 34 },
    // East Wing open bay — W29–W68 (clean 8×5 grid)
    { zone: 'East Wing', type: 'workstation', prefix: 'W', startN: 29, x: 858, y: 442, cols: 8, rows: 5, dx: 39, dy: 56 },
  ],
  cabins: [
    { seatNumber: 'C1', zone: 'Cabins', x: 300, y: 404, w: 66, h: 140 },
    { seatNumber: 'C2', zone: 'Cabins', x: 370, y: 404, w: 66, h: 140 },
    { seatNumber: 'C3', zone: 'Cabins', x: 440, y: 404, w: 66, h: 140 },
    { seatNumber: 'C4', zone: 'Cabins', x: 510, y: 404, w: 66, h: 140 },
    { seatNumber: 'C5', zone: 'Cabins', x: 580, y: 404, w: 66, h: 140 },
    { seatNumber: 'C6', zone: 'Cabins', x: 650, y: 404, w: 66, h: 140 },
    { seatNumber: 'C7', zone: 'Cabins', x: 300, y: 592, w: 118, h: 120 },
    { seatNumber: 'C8', zone: 'Cabins', x: 424, y: 592, w: 118, h: 120 },
  ],
  corridors: [
    { x: 250, y: 34, w: 46, h: 712, dir: 'v' }, // left spine
    { x: 36, y: 352, w: 1128, h: 46, dir: 'h' }, // main spine
    { x: 296, y: 550, w: 524, h: 40, dir: 'h' }, // lower spine (centre)
  ],
  markers: [{ x: 273, y: 748, label: 'Entry', kind: 'entry' }],
  rooms: [
    // ── left column ──
    { id: 'av', label: 'Audio Visual Room', sub: '35ʹ8 × 25ʹ', kind: 'training', x: 36, y: 34, w: 214, h: 182 },
    { id: 'courtyard', label: 'Central Courtyard', kind: 'courtyard', x: 36, y: 216, w: 214, h: 136 },
    { id: 'westWing', label: 'West Wing', kind: 'open', x: 36, y: 398, w: 214, h: 200 },
    { id: 'meet4', label: 'Meeting Room 4', sub: '9ʹ × 8ʹ10', kind: 'meeting', chairs: 4, x: 36, y: 602, w: 214, h: 144 },
    // ── centre-top ──
    { id: 'reception', label: 'Reception', sub: 'Foyer', kind: 'reception', x: 296, y: 34, w: 114, h: 318 },
    { id: 'meet1', label: 'Meeting Room 1', sub: '23ʹ6 × 12ʹ9', kind: 'meeting', chairs: 12, x: 412, y: 34, w: 180, h: 158 },
    { id: 'meet2', label: 'Meeting Room 2', sub: '15ʹ6 × 12ʹ3', kind: 'meeting', chairs: 8, x: 412, y: 194, w: 180, h: 158 },
    { id: 'cmd', label: 'CMD Office', sub: '22ʹ6 × 21ʹ6', kind: 'office', x: 594, y: 34, w: 226, h: 206 },
    { id: 'lounge', label: 'Lounge & Waiting', kind: 'reception', x: 594, y: 242, w: 226, h: 110 },
    // ── right-top ──
    { id: 'store', label: 'Store', sub: '7ʹ3 × 7ʹ6', kind: 'service', x: 822, y: 34, w: 156, h: 102 },
    { id: 'cmdToilet', label: 'CMD Toilet', sub: '8ʹ5 × 7ʹ6', kind: 'service', x: 822, y: 138, w: 156, h: 104 },
    { id: 'openBalcony', label: 'Open Balcony', sub: '8ʹ3 × 6ʹ6', kind: 'balcony', x: 822, y: 244, w: 156, h: 108 },
    { id: 'breakout', label: 'Breakout Lounge', kind: 'collab', x: 980, y: 34, w: 184, h: 318 },
    // ── centre-middle ──
    { id: 'meet3', label: 'Meeting Room 3', sub: '9ʹ6 × 13ʹ7 · 6 pax', kind: 'meeting', chairs: 6, x: 738, y: 398, w: 82, h: 146 },
    // ── east wing (open bay) ──
    { id: 'eastWing', label: 'East Wing', kind: 'open', x: 824, y: 398, w: 340, h: 348 },
    // ── centre-bottom ──
    { id: 'female', label: 'Female Toilet', sub: '14ʹ6 × 12ʹ8', kind: 'service', x: 550, y: 592, w: 132, h: 120 },
    { id: 'male', label: 'Male Toilet', sub: '10ʹ9 × 17ʹ9', kind: 'service', x: 686, y: 592, w: 132, h: 120 },
  ],
}

// ── Floor 2 — Level 5 · open-plan studio ────────────────────────────────────
const FLOOR_2: FloorGeometry = {
  id: 'f2',
  vbw: 1200,
  vbh: 760,
  slabRect: { x: 40, y: 44, w: 1120, h: 672 },
  slab: 'M80 44 L1120 44 Q1160 44 1160 84 L1160 676 Q1160 716 1120 716 L80 716 Q40 716 40 676 L40 84 Q40 44 80 44 Z',
  cores: [],
  rooms: [
    { id: 'welcome', label: 'Welcome & Lounge', kind: 'reception', x: 70, y: 80, w: 250, h: 180 },
    { id: 'kitchen', label: 'Kitchen & Breakout', kind: 'service', x: 70, y: 276, w: 250, h: 180 },
    { id: 'townhall', label: 'Town Hall', sub: 'tiered seating', kind: 'collab', x: 70, y: 472, w: 250, h: 214 },
    { id: 'focusRow', label: 'Focus Rooms', sub: '2 pax', kind: 'meeting', x: 740, y: 80, w: 180, h: 130, chairs: 4 },
    { id: 'huddle', label: 'Huddle', sub: '4 pax', kind: 'meeting', x: 936, y: 80, w: 184, h: 130, chairs: 4 },
    { id: 'collabHub', label: 'Collaboration Hub', kind: 'collab', x: 900, y: 480, w: 220, h: 104 },
    { id: 'wellness', label: 'Wellness Room', kind: 'service', x: 900, y: 600, w: 220, h: 104 },
  ],
  cabins: [
    { seatNumber: 'P1', zone: 'Phone Booths', x: 980, y: 268, w: 76, h: 80 },
    { seatNumber: 'P2', zone: 'Phone Booths', x: 1064, y: 268, w: 76, h: 80 },
    { seatNumber: 'P3', zone: 'Phone Booths', x: 980, y: 360, w: 76, h: 80 },
    { seatNumber: 'P4', zone: 'Phone Booths', x: 1064, y: 360, w: 76, h: 80 },
  ],
  banks: [
    { zone: 'Studio North', type: 'workstation', prefix: 'S', startN: 1, x: 380, y: 300, cols: 7, rows: 2, dx: 78, dy: 72 },
    { zone: 'Studio South', type: 'workstation', prefix: 'S', startN: 15, x: 380, y: 500, cols: 7, rows: 2, dx: 78, dy: 68 },
  ],
}

export const FLOOR_GEOMETRY: Record<string, FloorGeometry> = {
  f1: FLOOR_1,
  f2: FLOOR_2,
}

/** Emit seats (normalized coords) for a floor — exact fixedSeats if present, else banks. */
export function generateFloorSeats(geo: FloorGeometry): GeneratedSeat[] {
  if (geo.fixedSeats) return geo.fixedSeats
  const seats: GeneratedSeat[] = []
  for (const bank of geo.banks) {
    let n = bank.startN
    for (let r = 0; r < bank.rows; r++) {
      for (let c = 0; c < bank.cols; c++) {
        const cx = bank.x + c * bank.dx
        const cy = bank.y + r * bank.dy
        seats.push({
          seatNumber: `${bank.prefix}${n}`,
          zone: bank.zone,
          seatType: bank.type,
          x: cx / geo.vbw,
          y: cy / geo.vbh,
        })
        n++
      }
    }
  }
  for (const cab of geo.cabins) {
    seats.push({
      seatNumber: cab.seatNumber,
      zone: cab.zone,
      seatType: cab.seatNumber.startsWith('P') ? 'phonebooth' : 'cabin',
      x: (cab.x + cab.w / 2) / geo.vbw,
      y: (cab.y + cab.h / 2) / geo.vbh,
    })
  }
  return seats
}
