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

// ── Floor 1 — HQ · faithful to the Rodic "Aga Khan Foundation" plan ──────────
// Rooms, cabins C1–C8 and the 68 workstations (W1–W68) reproduce the source
// drawing: Audio-Visual room, Central Courtyard, Meeting Rooms 1–4, CMD Office,
// CMD toilet / Store / Open Balcony, Male/Female toilets, Pantry.
const FLOOR_1: FloorGeometry = {
  id: 'f1',
  vbw: 1440,
  vbh: 900,
  slabRect: { x: 50, y: 70, w: 1340, h: 790 },
  slab: 'M90 70 L1350 70 Q1390 70 1390 110 L1390 820 Q1390 860 1350 860 L90 860 Q50 860 50 820 L50 110 Q50 70 90 70 Z',
  cores: [{ x: 1120, y: 760, w: 96, h: 100 }],
  rooms: [
    { id: 'balcony1', label: '3ʹ Balcony', kind: 'balcony', x: 70, y: 76, w: 320, h: 24 },
    { id: 'balcony2', label: '3ʹ Balcony', kind: 'balcony', x: 430, y: 76, w: 810, h: 24 },
    { id: 'av', label: 'Audio Visual Room', sub: '35ʹ8 × 25ʹ · 24 seats', kind: 'training', x: 70, y: 112, w: 320, h: 300 },
    { id: 'meet1', label: 'Meeting Room 1', sub: '15 seats', kind: 'meeting', x: 420, y: 112, w: 300, h: 150, chairs: 14 },
    { id: 'meet2', label: 'Meeting Room 2', sub: '9 seats', kind: 'meeting', x: 740, y: 112, w: 230, h: 150, chairs: 8 },
    { id: 'cmd', label: 'CMD Office', sub: '22ʹ6 × 21ʹ6', kind: 'office', x: 990, y: 112, w: 250, h: 250 },
    { id: 'cmdToilet', label: 'CMD Toilet', kind: 'service', x: 1258, y: 112, w: 118, h: 76 },
    { id: 'store', label: 'Store', kind: 'service', x: 1258, y: 200, w: 118, h: 76 },
    { id: 'openBalcony', label: 'Open Balcony', kind: 'balcony', x: 1258, y: 288, w: 118, h: 74 },
    { id: 'meet4', label: 'Meeting Room 4', sub: '4 pax', kind: 'meeting', x: 420, y: 286, w: 150, h: 124, chairs: 4 },
    { id: 'lounge', label: 'Lounge & Waiting', kind: 'reception', x: 590, y: 286, w: 150, h: 124 },
    { id: 'courtyard', label: 'Central Courtyard', kind: 'courtyard', x: 70, y: 430, w: 320, h: 250 },
    { id: 'meet3', label: 'Meeting Room 3', sub: '6 pax', kind: 'meeting', x: 740, y: 430, w: 200, h: 128, chairs: 6 },
    { id: 'femaleToilet', label: 'Female Toilet', kind: 'service', x: 1000, y: 600, w: 160, h: 130 },
    { id: 'maleToilet', label: 'Male Toilet', kind: 'service', x: 1226, y: 600, w: 150, h: 150 },
    { id: 'pantry', label: 'Pantry', kind: 'service', x: 1000, y: 740, w: 160, h: 100 },
  ],
  cabins: [
    { seatNumber: 'C1', zone: 'Cabins', x: 420, y: 430, w: 96, h: 116 },
    { seatNumber: 'C2', zone: 'Cabins', x: 526, y: 430, w: 96, h: 116 },
    { seatNumber: 'C3', zone: 'Cabins', x: 632, y: 430, w: 96, h: 116 },
    { seatNumber: 'C4', zone: 'Cabins', x: 420, y: 560, w: 96, h: 116 },
    { seatNumber: 'C5', zone: 'Cabins', x: 526, y: 560, w: 96, h: 116 },
    { seatNumber: 'C6', zone: 'Cabins', x: 632, y: 560, w: 96, h: 116 },
    { seatNumber: 'C7', zone: 'Cabins', x: 748, y: 574, w: 150, h: 116 },
    { seatNumber: 'C8', zone: 'Cabins', x: 908, y: 574, w: 90, h: 116 },
  ],
  banks: [
    // West Bay — bottom-left open plan (W1–W30)
    { zone: 'West Bay', type: 'workstation', prefix: 'W', startN: 1, x: 150, y: 706, cols: 10, rows: 3, dx: 50, dy: 48 },
    // East Bay — right-side open plan (W31–W54)
    { zone: 'East Bay', type: 'workstation', prefix: 'W', startN: 31, x: 1000, y: 402, cols: 8, rows: 3, dx: 48, dy: 60 },
    // South Bay — bottom-centre (W55–W68)
    { zone: 'South Bay', type: 'workstation', prefix: 'W', startN: 55, x: 660, y: 720, cols: 7, rows: 2, dx: 52, dy: 52 },
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
