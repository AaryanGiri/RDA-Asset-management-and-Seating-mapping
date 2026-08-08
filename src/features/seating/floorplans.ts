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
}

// ── Floor 1 — Level 3 · corporate HQ (echoes the Rodic layout) ──────────────
const FLOOR_1: FloorGeometry = {
  id: 'f1',
  vbw: 1200,
  vbh: 820,
  slabRect: { x: 40, y: 48, w: 1120, h: 726 },
  slab: 'M40 88 Q40 48 80 48 L1120 48 Q1160 48 1160 88 L1160 734 Q1160 774 1120 774 L80 774 Q40 774 40 734 Z',
  cores: [],
  rooms: [
    { id: 'courtyard', label: 'Central Courtyard', kind: 'courtyard', x: 70, y: 84, w: 236, h: 248 },
    { id: 'training', label: 'Training Room', sub: '24 pax', kind: 'meeting', x: 70, y: 348, w: 236, h: 150, chairs: 10 },
    { id: 'reception', label: 'Reception & Lounge', kind: 'reception', x: 70, y: 514, w: 236, h: 128 },
    { id: 'pantry', label: 'Pantry', kind: 'service', x: 70, y: 658, w: 236, h: 108 },
    { id: 'boardroom', label: 'Boardroom', sub: '16 pax', kind: 'meeting', x: 330, y: 84, w: 300, h: 150, chairs: 12 },
    { id: 'meetA', label: 'Meeting Room A', sub: '8 pax', kind: 'meeting', x: 646, y: 84, w: 206, h: 150, chairs: 8 },
    { id: 'meetB', label: 'Meeting Room B', sub: '6 pax', kind: 'meeting', x: 868, y: 84, w: 252, h: 150, chairs: 6 },
    { id: 'restrooms', label: 'Restrooms', kind: 'service', x: 900, y: 628, w: 218, h: 64 },
    { id: 'store', label: 'Store & Records', kind: 'service', x: 900, y: 700, w: 218, h: 66 },
  ],
  cabins: [
    { seatNumber: 'C1', zone: 'Cabins', x: 336, y: 408, w: 120, h: 92 },
    { seatNumber: 'C2', zone: 'Cabins', x: 468, y: 408, w: 120, h: 92 },
    { seatNumber: 'C3', zone: 'Cabins', x: 600, y: 408, w: 120, h: 92 },
    { seatNumber: 'C4', zone: 'Cabins', x: 732, y: 408, w: 120, h: 92 },
    { seatNumber: 'C5', zone: 'Cabins', x: 864, y: 408, w: 120, h: 92 },
    { seatNumber: 'C6', zone: 'Cabins', x: 996, y: 408, w: 120, h: 92 },
    { seatNumber: 'C7', zone: 'Cabins', x: 336, y: 520, w: 150, h: 104 },
    { seatNumber: 'C8', zone: 'Cabins', x: 498, y: 520, w: 150, h: 104 },
  ],
  banks: [
    { zone: 'North Bay', type: 'workstation', prefix: 'W', startN: 1, x: 360, y: 300, cols: 10, rows: 2, dx: 76, dy: 66 },
    { zone: 'Central Bay', type: 'workstation', prefix: 'W', startN: 21, x: 690, y: 540, cols: 5, rows: 2, dx: 78, dy: 64 },
    { zone: 'South Bay', type: 'workstation', prefix: 'W', startN: 31, x: 360, y: 668, cols: 7, rows: 2, dx: 70, dy: 58 },
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

export interface GeneratedSeat {
  seatNumber: string
  zone: string
  seatType: SeatType
  x: number
  y: number
}

/** Emit seats (normalized coords) for a floor from its bank + cabin geometry. */
export function generateFloorSeats(geo: FloorGeometry): GeneratedSeat[] {
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
