import type { Rect, RoomShape, RoomKind, FloorGeometry } from './floorplans'
import { FLOOR_GEOMETRY } from './floorplans'

// ─────────────────────────────────────────────────────────────────────────────
// Editable floor-plan model. Geometry is authored in viewBox px (same space as
// the original hand-authored floors); each plan carries a `pxPerFoot` scale so
// the editor can show real ft-in dimensions and sq-ft areas. Everything here is
// store-backed and persisted → the whole office can be reshaped in the browser.
// ─────────────────────────────────────────────────────────────────────────────

export type WallType = 'gypsum' | 'glass' | 'brick'
export type DoorType = 'wooden' | 'glass' | 'sliding' | 'double' | 'toilet'
export type FurnitureKind =
  | 'desk'
  | 'meeting-table'
  | 'sofa'
  | 'plant'
  | 'toilet'
  | 'stairs'
  | 'screen'
  | 'reception'
  | 'storage'

export interface Wall {
  id: string
  type: WallType
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Door {
  id: string
  type: DoorType
  x: number // hinge point (px)
  y: number
  angle: number // degrees, 0 = opening faces +x
  w: number // leaf width (px)
  flip?: boolean // mirror the swing
}

export interface FurnitureItem {
  id: string
  kind: FurnitureKind
  x: number
  y: number
  w: number
  h: number
  rot?: number // degrees
  label?: string
}

export type EditorTool = 'select' | 'room' | 'wall' | 'door' | 'furniture' | 'seat' | 'measure'
export type ElementType = 'seat' | 'room' | 'furniture' | 'wall' | 'door'
export interface Selection {
  type: ElementType
  id: string
}

export interface FloorPlan {
  id: string
  officeId: string
  name: string
  vbw: number
  vbh: number
  pxPerFoot: number
  plate?: Rect
  /** When set, the floor renders from a real drawing image instead of vector rooms. */
  bg?: { src: string }
  rooms: RoomShape[]
  walls: Wall[]
  doors: Door[]
  furniture: FurnitureItem[]
  corridors?: (Rect & { dir?: 'h' | 'v' })[]
  markers?: { x: number; y: number; label: string; kind: 'entry' }[]
  zoneLabels?: { x: number; y: number; text: string }[]
  markerR?: number
}

// ── legend / catalog metadata (mirrors the RODIC drawing legend + schedule) ──
export const WALL_META: Record<WallType, { label: string; short: string; color: string; thicknessIn: number }> = {
  gypsum: { label: '3″ Gypsum partition · full height', short: 'Gypsum', color: '#DC2626', thicknessIn: 3 },
  glass: { label: '3″ Glass partition · up to 8′', short: 'Glass', color: '#0EA5E9', thicknessIn: 3 },
  brick: { label: '4½″ Brick wall', short: 'Brick', color: '#1E3A8A', thicknessIn: 4.5 },
}

export const DOOR_META: Record<DoorType, { label: string; widthFt: number }> = {
  wooden: { label: 'Wooden door', widthFt: 2.5 },
  glass: { label: 'Glass door', widthFt: 3 },
  sliding: { label: 'Sliding glass door', widthFt: 6.667 },
  double: { label: 'Wooden double door', widthFt: 6 },
  toilet: { label: 'Toilet door', widthFt: 2.75 },
}

export const FURNITURE_META: Record<FurnitureKind, { label: string; wFt: number; hFt: number }> = {
  desk: { label: 'Workstation', wFt: 4.5, hFt: 2.5 },
  'meeting-table': { label: 'Meeting table', wFt: 8, hFt: 3.5 },
  sofa: { label: 'Sofa / lounge', wFt: 6, hFt: 2.5 },
  plant: { label: 'Planter', wFt: 1.5, hFt: 1.5 },
  toilet: { label: 'WC fixture', wFt: 1.5, hFt: 2.5 },
  stairs: { label: 'Staircase', wFt: 8, hFt: 4 },
  screen: { label: 'AV screen', wFt: 2.5, hFt: 0.8 },
  reception: { label: 'Reception desk', wFt: 6, hFt: 2.5 },
  storage: { label: 'Storage / cabinet', wFt: 4, hFt: 1.5 },
}

export const FURNITURE_ORDER: FurnitureKind[] = [
  'desk', 'meeting-table', 'sofa', 'reception', 'storage', 'screen', 'plant', 'toilet', 'stairs',
]

// room kinds available in the palette + their display metadata
export const ROOM_META: Record<RoomKind, { label: string; fill: string }> = {
  courtyard: { label: 'Courtyard / void', fill: 'rgb(var(--c-surface))' },
  meeting: { label: 'Meeting room', fill: 'rgb(var(--c-brand-soft))' },
  service: { label: 'Facility / service', fill: 'rgb(var(--c-surface))' },
  reception: { label: 'Reception / lounge', fill: 'rgb(var(--c-surface))' },
  open: { label: 'Open workspace', fill: 'rgb(var(--c-surface))' },
  balcony: { label: 'Balcony', fill: 'rgb(var(--c-surface))' },
  collab: { label: 'Collaboration', fill: 'rgb(var(--c-brand-soft))' },
  training: { label: 'Training / AV room', fill: 'rgb(var(--c-surface))' },
  office: { label: 'Cabin / office', fill: 'rgb(var(--c-brand-soft))' },
  cabin: { label: 'Cabin', fill: 'rgb(var(--c-surface))' },
}

export const ROOM_ORDER: RoomKind[] = [
  'office', 'meeting', 'collab', 'open', 'reception', 'training', 'service', 'cabin', 'balcony', 'courtyard',
]

// ── measurement helpers ──────────────────────────────────────────────────────
export function pxToFeet(px: number, ppf: number): number {
  return px / ppf
}

/** Format a px length as feet-inches, e.g. `23'-6"`. */
export function formatFtIn(px: number, ppf: number): string {
  const totalFeet = Math.abs(px) / ppf
  let ft = Math.floor(totalFeet)
  let inches = Math.round((totalFeet - ft) * 12)
  if (inches === 12) {
    ft += 1
    inches = 0
  }
  return `${ft}′-${inches}″`
}

/** Format an area (two px lengths) as whole sq ft. */
export function formatArea(wpx: number, hpx: number, ppf: number): string {
  const sqft = (Math.abs(wpx) / ppf) * (Math.abs(hpx) / ppf)
  return `${Math.round(sqft).toLocaleString()} sq ft`
}

export function roomAreaSqFt(r: Rect, ppf: number): number {
  return (r.w / ppf) * (r.h / ppf)
}

// ── seed: convert a static FloorGeometry into an editable FloorPlan ───────────
// pxPerFoot is calibrated so displayed dimensions are plausible for each floor.
const PLAN_SCALE: Record<string, number> = { f1: 6.3, f2: 5.2 }
const PLAN_META: Record<string, { officeId: string; name: string }> = {
  f1: { officeId: 'hq', name: 'Aga Khan Foundation · Office' },
  f2: { officeId: 'hq', name: 'YMCA Building · New Delhi' },
}

export function geometryToPlan(geo: FloorGeometry): FloorPlan {
  const meta = PLAN_META[geo.id] ?? { officeId: 'hq', name: geo.id }
  // For image-backed floors the real drawing is the base map, and `fixedRooms`
  // (pre-placed from the drawing's labels + dimensions) become editable rooms
  // shown over it. Vector floors synthesise cabin rooms from their `cabins`.
  const cabinRooms: RoomShape[] = geo.bg
    ? []
    : (geo.cabins ?? []).map((c) => ({
        id: `cab-${c.seatNumber}`,
        label: c.seatNumber,
        kind: 'cabin' as RoomKind,
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
      }))
  return {
    id: geo.id,
    officeId: meta.officeId,
    name: meta.name,
    vbw: geo.vbw,
    vbh: geo.vbh,
    pxPerFoot: PLAN_SCALE[geo.id] ?? 8,
    plate: geo.plate ?? geo.slabRect,
    bg: geo.bg ? { ...geo.bg } : undefined,
    rooms: geo.bg
      ? (geo.fixedRooms ?? []).map((r) => ({ ...r }))
      : [...geo.rooms.map((r) => ({ ...r })), ...cabinRooms],
    walls: [],
    doors: [],
    furniture: [],
    corridors: geo.bg || !geo.corridors ? undefined : geo.corridors.map((c) => ({ ...c })),
    markers: geo.bg || !geo.markers ? undefined : geo.markers.map((m) => ({ ...m })),
    zoneLabels: geo.bg || !geo.zoneLabels ? undefined : geo.zoneLabels.map((z) => ({ ...z })),
    markerR: geo.markerR,
  }
}

/** Build the initial floorPlans map from the shipped geometry. */
export function buildFloorPlans(): Record<string, FloorPlan> {
  const out: Record<string, FloorPlan> = {}
  for (const id of Object.keys(FLOOR_GEOMETRY)) {
    out[id] = geometryToPlan(FLOOR_GEOMETRY[id])
  }
  return out
}

/** A fresh empty floor at a given size (feet) + scale — for the from-scratch builder. */
export function blankFloorPlan(opts: {
  id: string
  officeId: string
  name: string
  widthFt: number
  heightFt: number
  pxPerFoot: number
}): FloorPlan {
  const vbw = Math.round(opts.widthFt * opts.pxPerFoot)
  const vbh = Math.round(opts.heightFt * opts.pxPerFoot)
  return {
    id: opts.id,
    officeId: opts.officeId,
    name: opts.name,
    vbw,
    vbh,
    pxPerFoot: opts.pxPerFoot,
    plate: { x: 2, y: 2, w: vbw - 4, h: vbh - 4 },
    rooms: [],
    walls: [],
    doors: [],
    furniture: [],
    markerR: 8,
  }
}
