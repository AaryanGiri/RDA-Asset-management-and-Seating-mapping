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

export interface RoomShape extends Rect {
  id: string
  label: string
  sub?: string
  kind: RoomKind
  chairs?: number // decorative chairs drawn around a table (meeting rooms)
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
  dy: number
}

export interface CabinDef {
  seatNumber: string
  zone: string
  x: number
  y: number
  w: number
  h: number
}

export interface FloorGeometry {
  id: string
  vbw: number
  vbh: number
  slab: string // SVG path for the floor slab / exterior wall
  slabRect: Rect
  rooms: RoomShape[]
  banks: DeskBank[]
  cabins: CabinDef[]
  cores: Rect[] // structural cores / lift shafts (hatched)
}

// ── Floor 1 — Level 3 · corporate HQ (echoes the Rodic layout) ──────────────
const FLOOR_1: FloorGeometry = {
  id: 'f1',
  vbw: 1200,
  vbh: 820,
  slabRect: { x: 40, y: 48, w: 1120, h: 726 },
  slab: 'M40 88 Q40 48 80 48 L1120 48 Q1160 48 1160 88 L1160 734 Q1160 774 1120 774 L80 774 Q40 774 40 734 Z',
  cores: [{ x: 1064, y: 690, w: 96, h: 84 }],
  rooms: [
    { id: 'courtyard', label: 'Central Courtyard', kind: 'courtyard', x: 70, y: 78, w: 236, h: 250 },
    { id: 'training', label: 'Training Room', sub: '24 pax', kind: 'meeting', x: 70, y: 344, w: 236, h: 150, chairs: 10 },
    { id: 'reception', label: 'Reception & Lounge', kind: 'reception', x: 70, y: 506, w: 236, h: 140 },
    { id: 'pantry', label: 'Pantry', kind: 'service', x: 70, y: 658, w: 236, h: 108 },
    { id: 'boardroom', label: 'Boardroom', sub: '16 pax', kind: 'meeting', x: 330, y: 90, w: 300, h: 156, chairs: 12 },
    { id: 'meetA', label: 'Meeting Room A', sub: '8 pax', kind: 'meeting', x: 642, y: 90, w: 214, h: 156, chairs: 8 },
    { id: 'meetB', label: 'Meeting Room B', sub: '6 pax', kind: 'meeting', x: 868, y: 90, w: 250, h: 156, chairs: 6 },
    { id: 'restrooms', label: 'Restrooms', kind: 'service', x: 880, y: 620, w: 238, h: 70 },
    { id: 'store', label: 'Store & Records', kind: 'service', x: 880, y: 700, w: 168, h: 66 },
  ],
  cabins: [
    { seatNumber: 'C1', zone: 'Cabins', x: 336, y: 372, w: 122, h: 96 },
    { seatNumber: 'C2', zone: 'Cabins', x: 468, y: 372, w: 122, h: 96 },
    { seatNumber: 'C3', zone: 'Cabins', x: 600, y: 372, w: 122, h: 96 },
    { seatNumber: 'C4', zone: 'Cabins', x: 732, y: 372, w: 122, h: 96 },
    { seatNumber: 'C5', zone: 'Cabins', x: 864, y: 372, w: 122, h: 96 },
    { seatNumber: 'C6', zone: 'Cabins', x: 996, y: 372, w: 122, h: 96 },
    { seatNumber: 'C7', zone: 'Cabins', x: 336, y: 488, w: 150, h: 108 },
    { seatNumber: 'C8', zone: 'Cabins', x: 498, y: 488, w: 150, h: 108 },
  ],
  banks: [
    { zone: 'North Bay', type: 'workstation', prefix: 'W', startN: 1, x: 360, y: 286, cols: 10, rows: 2, dx: 76, dy: 46 },
    { zone: 'Central Bay', type: 'workstation', prefix: 'W', startN: 21, x: 690, y: 512, cols: 5, rows: 2, dx: 78, dy: 46 },
    { zone: 'South Bay', type: 'workstation', prefix: 'W', startN: 31, x: 360, y: 650, cols: 7, rows: 2, dx: 72, dy: 50 },
  ],
}

// ── Floor 2 — Level 5 · open-plan studio ────────────────────────────────────
const FLOOR_2: FloorGeometry = {
  id: 'f2',
  vbw: 1200,
  vbh: 760,
  slabRect: { x: 40, y: 44, w: 1120, h: 672 },
  slab: 'M80 44 L1120 44 Q1160 44 1160 84 L1160 676 Q1160 716 1120 716 L80 716 Q40 716 40 676 L40 84 Q40 44 80 44 Z',
  cores: [{ x: 556, y: 320, w: 90, h: 120 }],
  rooms: [
    { id: 'welcome', label: 'Welcome & Lounge', kind: 'reception', x: 70, y: 80, w: 250, h: 200 },
    { id: 'kitchen', label: 'Kitchen & Breakout', kind: 'service', x: 70, y: 300, w: 250, h: 176 },
    { id: 'townhall', label: 'Town Hall', sub: 'tiered', kind: 'collab', x: 70, y: 496, w: 250, h: 190 },
    { id: 'focusRow', label: 'Focus Rooms', kind: 'meeting', x: 700, y: 80, w: 200, h: 130, chairs: 4 },
    { id: 'huddle', label: 'Huddle', sub: '4 pax', kind: 'meeting', x: 920, y: 80, w: 200, h: 130, chairs: 4 },
    { id: 'wellness', label: 'Wellness Room', kind: 'service', x: 920, y: 556, w: 200, h: 130 },
    { id: 'collabHub', label: 'Collaboration Hub', kind: 'collab', x: 700, y: 556, w: 190, h: 130 },
  ],
  cabins: [
    { seatNumber: 'P1', zone: 'Phone Booths', x: 926, y: 232, w: 90, h: 78 },
    { seatNumber: 'P2', zone: 'Phone Booths', x: 1028, y: 232, w: 90, h: 78 },
    { seatNumber: 'P3', zone: 'Phone Booths', x: 926, y: 330, w: 90, h: 78 },
    { seatNumber: 'P4', zone: 'Phone Booths', x: 1028, y: 330, w: 90, h: 78 },
  ],
  banks: [
    { zone: 'Studio East', type: 'workstation', prefix: 'S', startN: 1, x: 380, y: 132, cols: 6, rows: 2, dx: 78, dy: 46 },
    { zone: 'Studio Core', type: 'workstation', prefix: 'S', startN: 13, x: 700, y: 300, cols: 6, rows: 2, dx: 78, dy: 46 },
    { zone: 'Studio South', type: 'workstation', prefix: 'S', startN: 25, x: 380, y: 470, cols: 5, rows: 2, dx: 82, dy: 50 },
  ],
}

export const FLOOR_GEOMETRY: Record<string, FloorGeometry> = {
  f1: FLOOR_1,
  f2: FLOOR_2,
}

export interface GeneratedSeat {
  seatNumber: string
  zone: string
  seatType: SeatType
  x: number // normalized
  y: number
}

/** Emit seats (normalized coords) for a floor from its bank + cabin geometry. */
export function generateFloorSeats(geo: FloorGeometry): GeneratedSeat[] {
  const seats: GeneratedSeat[] = []
  for (const bank of geo.banks) {
    let n = bank.startN
    // Two facing rows separated by a small aisle inside each pod row.
    for (let r = 0; r < bank.rows; r++) {
      for (let c = 0; c < bank.cols; c++) {
        const cx = bank.x + c * bank.dx
        const cy = bank.y + r * (bank.dy + 42)
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
