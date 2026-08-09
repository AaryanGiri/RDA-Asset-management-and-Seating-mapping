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
  vbw: 932,
  vbh: 714,
  slabRect: { x: 0, y: 0, w: 932, h: 714 },
  slab: '',
  plate: { x: 2, y: 2, w: 928, h: 710 },
  cores: [],
  markerR: 6,
  fixedSeats: FLOOR1_SEATS, // exact W1–W68 & C1–C8 positions from the PDF
  banks: [],
  cabins: [],
  // rooms positioned to match the drawing (label centres extracted from the PDF),
  // sized so adjacent cells share edges without overlapping
  rooms: [
    { id: 'av', label: 'Audio Visual Room', sub: '35ʹ8 × 25ʹ', kind: 'training', x: 6, y: 10, w: 244, h: 192 },
    { id: 'courtyard', label: 'Central Courtyard', kind: 'courtyard', x: 6, y: 208, w: 180, h: 164 },
    { id: 'foyer', label: 'Foyer', kind: 'reception', x: 192, y: 206, w: 96, h: 90 },
    { id: 'cabin1', label: 'Cabin 1', sub: '12ʹ × 9ʹ6', kind: 'cabin', x: 196, y: 300, w: 80, h: 92 },
    { id: 'meet1', label: 'Meeting Room 1', sub: '23ʹ6 × 12ʹ9 · 15 seats', kind: 'meeting', chairs: 12, x: 290, y: 96, w: 152, h: 94 },
    { id: 'meet2', label: 'Meeting Room 2', sub: '15ʹ6 × 12ʹ3 · 9 seats', kind: 'meeting', chairs: 8, x: 290, y: 194, w: 152, h: 92 },
    { id: 'cmd', label: 'CMD Office', sub: '22ʹ6 × 21ʹ6', kind: 'office', x: 448, y: 150, w: 134, h: 162 },
    { id: 'lounge', label: 'Lounge & Waiting', kind: 'reception', x: 448, y: 316, w: 134, h: 34 },
    { id: 'waiting', label: 'Waiting', kind: 'reception', x: 356, y: 318, w: 64, h: 30 },
    { id: 'store', label: 'Store', sub: '7ʹ3 × 7ʹ6', kind: 'service', x: 588, y: 150, w: 66, h: 72 },
    { id: 'cmdToilet', label: 'CMD Toilet', sub: '8ʹ5 × 7ʹ6', kind: 'service', x: 588, y: 226, w: 66, h: 86 },
    { id: 'openBalcony', label: 'Open Balcony', sub: '8ʹ3 × 6ʹ6', kind: 'balcony', x: 750, y: 306, w: 76, h: 58 },
    // cabin cells (marker supplied by fixedSeats)
    { id: 'cabin2', label: 'C2', kind: 'cabin', x: 335, y: 362, w: 42, h: 96 },
    { id: 'cabin3', label: 'C3', kind: 'cabin', x: 373, y: 362, w: 42, h: 96 },
    { id: 'cabin4', label: 'C4', kind: 'cabin', x: 430, y: 360, w: 42, h: 96 },
    { id: 'cabin5', label: 'C5', kind: 'cabin', x: 509, y: 362, w: 42, h: 96 },
    { id: 'cabin6', label: 'C6', kind: 'cabin', x: 545, y: 362, w: 42, h: 96 },
    { id: 'meet3', label: 'Meeting Room 3', sub: '9ʹ6 × 13ʹ7 · 6 pax', kind: 'meeting', chairs: 6, x: 616, y: 398, w: 62, h: 94 },
    { id: 'cabin7', label: 'Cabin 7', sub: '9ʹ10 × 15ʹ6', kind: 'cabin', x: 358, y: 502, w: 74, h: 98 },
    { id: 'cabin8', label: 'Cabin 8', sub: '16ʹ3 × 12ʹ9', kind: 'cabin', x: 440, y: 506, w: 72, h: 98 },
    { id: 'meet4', label: 'Meeting Room 4', sub: '9ʹ × 8ʹ10', kind: 'meeting', chairs: 4, x: 202, y: 512, w: 66, h: 66 },
    { id: 'female', label: 'Female Toilet', sub: '14ʹ6 × 12ʹ8', kind: 'service', x: 576, y: 484, w: 66, h: 62 },
    { id: 'male', label: 'Male Toilet', sub: '10ʹ9 × 17ʹ9', kind: 'service', x: 576, y: 556, w: 66, h: 96 },
  ],
  // main circulation axes (6ʹ-0 wide corridors) — walk-path centrelines
  corridors: [
    { x: 285, y: 96, w: 6, h: 500, dir: 'v' },
    { x: 190, y: 350, w: 636, h: 6, dir: 'h' },
    { x: 296, y: 470, w: 524, h: 6, dir: 'h' },
  ],
  markers: [{ x: 300, y: 600, label: 'Entry', kind: 'entry' }],
  zoneLabels: [
    { x: 34, y: 502, text: 'West Wing' },
    { x: 760, y: 292, text: 'East Wing' },
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
