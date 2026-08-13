import type { SeatType } from '@/lib/types'
import { FLOOR1_SEATS } from './floor1Seats'
import { FLOOR2_SEATS } from './floor2Seats'
import { FLOOR1_ROOMS } from './floor1Rooms'
import { FLOOR2_ROOMS } from './floor2Rooms'

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
  /** When set, the floor renders a real drawing image as its base map. */
  bg?: { src: string }
  /** Pre-placed editable rooms shown over an image-backed floor (in edit mode). */
  fixedRooms?: RoomShape[]
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

// ── Floor 1 — RODIC "Office at Aga Khan Foundation" ──────────────────────────
// Rendered directly from the architect's FINAL FLOOR LAYOUT PLAN (J+AM Storey,
// 21-Aug-25). The drawing is the map background; W1–W146 workstations + 10 cabins
// are overlaid at exact coordinates extracted from the PDF's own text layer
// (→ floor1Seats.ts). viewBox matches the cropped background's aspect (1840×1462).
const FLOOR_1: FloorGeometry = {
  id: 'f1',
  vbw: 920,
  vbh: 731,
  slabRect: { x: 0, y: 0, w: 920, h: 731 },
  slab: '',
  plate: { x: 0, y: 0, w: 920, h: 731 },
  cores: [],
  markerR: 5.5,
  bg: { src: 'floors/floor1.png' },
  fixedSeats: FLOOR1_SEATS,
  fixedRooms: FLOOR1_ROOMS,
  banks: [],
  cabins: [],
  rooms: [],
}

// ── Floor 2 — RODIC "Proposed Office at YMCA Building, New Delhi" ─────────────
// Rendered from the DIRECTIONS Seating Arrangement Plan (30-03-2022). 88 numbered
// workstations + 10 named executive cabins overlaid at exact PDF coordinates
// (→ floor2Seats.ts). viewBox matches the cropped background's aspect (2072×1094).
const FLOOR_2: FloorGeometry = {
  id: 'f2',
  vbw: 1036,
  vbh: 547,
  slabRect: { x: 0, y: 0, w: 1036, h: 547 },
  slab: '',
  plate: { x: 0, y: 0, w: 1036, h: 547 },
  cores: [],
  markerR: 6,
  bg: { src: 'floors/floor2.png' },
  fixedSeats: FLOOR2_SEATS,
  fixedRooms: FLOOR2_ROOMS,
  banks: [],
  cabins: [],
  rooms: [],
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
