import type { SeatType } from '@/lib/types'
import { FLOOR1_SEATS } from './floor1Seats'

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
}

// ── Floor 1 — RODIC "Office at Aga Khan Foundation" · vector re-creation ──────
// Room layout matches the real plan (positions traced from the drawing); the 68
// workstations (W1–W68) and 8 cabins (C1–C8) sit at EXACT coordinates extracted
// from the source PDF's text layer (floor1Seats.ts). viewBox 932 × 714.
const FLOOR_1: FloorGeometry = {
  id: 'f1',
  vbw: 932,
  vbh: 714,
  slabRect: { x: 0, y: 0, w: 932, h: 714 },
  slab: 'M22 0 H910 Q932 0 932 22 V692 Q932 714 910 714 H22 Q0 714 0 692 V22 Q0 0 22 0 Z',
  cores: [{ x: 690, y: 618, w: 60, h: 92 }],
  fixedSeats: FLOOR1_SEATS,
  banks: [],
  cabins: [],
  rooms: [
    // ── top band (aligned tops / shared edges) ──
    { id: 'av', label: 'Audio Visual Room', sub: '35ʹ8 × 25ʹ', kind: 'training', x: 4, y: 6, w: 250, h: 190 },
    { id: 'balcony1', label: '3ʹ Balcony', kind: 'balcony', x: 278, y: 56, w: 150, h: 22 },
    { id: 'meet1', label: 'Meeting Room 1', sub: '15 seats', kind: 'meeting', chairs: 12, x: 278, y: 84, w: 150, h: 106 },
    { id: 'balcony2', label: '3ʹ Balcony', kind: 'balcony', x: 470, y: 56, w: 180, h: 22 },
    { id: 'cmd', label: 'CMD Office', sub: '22ʹ6 × 21ʹ6', kind: 'office', x: 470, y: 84, w: 180, h: 152 },
    { id: 'store', label: 'Store', kind: 'service', x: 664, y: 84, w: 86, h: 50 },
    { id: 'cmdToilet', label: 'CMD Toilet', kind: 'service', x: 664, y: 140, w: 86, h: 50 },
    { id: 'openBalcony', label: 'Open Balcony', kind: 'balcony', x: 664, y: 196, w: 86, h: 50 },
    // ── centre-left column ──
    { id: 'foyer', label: 'Foyer', kind: 'reception', x: 190, y: 202, w: 88, h: 40 },
    { id: 'courtyard', label: 'Central Courtyard', kind: 'courtyard', x: 4, y: 204, w: 178, h: 166 },
    { id: 'cabin1', label: 'Cabin 1', kind: 'cabin', x: 196, y: 300, w: 72, h: 64 },
    // ── centre band ──
    { id: 'meet2', label: 'Meeting Room 2', sub: '9 seats', kind: 'meeting', chairs: 8, x: 278, y: 204, w: 150, h: 96 },
    { id: 'lounge', label: 'Lounge', kind: 'reception', x: 470, y: 252, w: 80, h: 36 },
    { id: 'waiting', label: 'Waiting', kind: 'reception', x: 360, y: 306, w: 80, h: 30 },
    { id: 'cabin2', label: 'C2', kind: 'cabin', x: 337, y: 360, w: 40, h: 92 },
    { id: 'cabin3', label: 'C3', kind: 'cabin', x: 374, y: 360, w: 40, h: 92 },
    { id: 'cabin4', label: 'C4', kind: 'cabin', x: 431, y: 356, w: 40, h: 92 },
    { id: 'cabin5', label: 'C5', kind: 'cabin', x: 510, y: 360, w: 40, h: 92 },
    { id: 'cabin6', label: 'C6', kind: 'cabin', x: 545, y: 360, w: 40, h: 92 },
    { id: 'meet3', label: 'Meeting Room 3', sub: '6 pax', kind: 'meeting', chairs: 6, x: 595, y: 352, w: 60, h: 98 },
    // ── lower band ──
    { id: 'cabin7', label: 'Cabin 7', kind: 'cabin', x: 356, y: 500, w: 80, h: 100 },
    { id: 'cabin8', label: 'Cabin 8', kind: 'cabin', x: 440, y: 505, w: 76, h: 100 },
    { id: 'meet4', label: 'Meeting Room 4', sub: '4 pax', kind: 'meeting', chairs: 4, x: 60, y: 560, w: 96, h: 64 },
    { id: 'female', label: 'Female Toilet', kind: 'service', x: 560, y: 486, w: 96, h: 90 },
    { id: 'male', label: 'Male Toilet', kind: 'service', x: 600, y: 600, w: 84, h: 110 },
  ],
  zoneLabels: [
    { x: 20, y: 502, text: 'West Wing' },
    { x: 758, y: 296, text: 'East Wing' },
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
