// ─────────────────────────────────────────────────────────────────────────────
// AIWC Floor Map — the REAL floor-plan layout.
//
// Seat positions come straight from the architect's drawing (FLOOR1_SEATS,
// normalized 0–1 over a 920×731 viewBox) and the rooms from FLOOR1_ROOMS. People
// from "Final Seating Data.xlsx" are placed at their real desks (Excel seat N =
// drawing W{N}) and coloured by department. This reproduces the actual office
// layout with a clean seat-map UI.
// ─────────────────────────────────────────────────────────────────────────────

import { FLOOR1_SEATS } from '@/features/seating/floor1Seats'
import { FLOOR1_ROOMS } from '@/features/seating/floor1Rooms'
import { AIWC_ROWS } from './aiwcRoster'

export type NStatus = 'occupied' | 'vacant' | 'notice' | 'maintenance' | 'blocked'
export type NType = 'employee' | 'intern' | 'partner'

export interface Department { id: string; name: string; short: string; color: string }

export interface NPerson {
  id: string
  seat: string
  code: string
  name: string
  deptId: string
  type: NType
  title: string
  email?: string
  hue: number
}

export interface NDesk {
  id: string
  label: string // drawing seat number (W86, C1…)
  seatType: 'workstation' | 'cabin'
  pod: string // department
  deptId: string
  deptColor: string
  x: number // centre, in scaled viewBox px
  y: number
  personId?: string
  status: NStatus
  note?: string
}

export interface Rect { x: number; y: number; w: number; h: number }
export type FloorRoomKind = 'meeting' | 'service' | 'reception' | 'office' | 'open' | 'balcony' | 'courtyard' | 'cabin'
export interface FloorRoom extends Rect { id: string; label: string; kind: FloorRoomKind }

// ── departments (colour coding) ──────────────────────────────────────────────
const DEPT_DEFS: [string, string, string, string][] = [
  ['tech', 'TECH INNOVATION', 'Tech Innovation', '#6366F1'],
  ['fin', 'FINANCE', 'Finance', '#10B981'],
  ['water', 'WATER AND URBAN', 'Water & Urban', '#0EA5E9'],
  ['power', 'POWER', 'Power', '#F59E0B'],
  ['cmd', 'CMD OFFICE', 'CMD Office', '#F43F5E'],
  ['brand', 'Branding and Communication', 'Branding & Comm.', '#EC4899'],
  ['hr', 'HR Operations', 'HR Operations', '#8B5CF6'],
  ['cos', 'COS Cell', 'COS Cell', '#14B8A6'],
  ['bd', 'BD DEPARTMENT', 'Business Dev.', '#F97316'],
  ['admin', 'ADMIN', 'Admin', '#64748B'],
  ['talentmgmt', 'Talent Management', 'Talent Mgmt', '#06B6D4'],
  ['compliance', 'COMPLIANCE CELL', 'Compliance', '#84CC16'],
  ['it', 'IT DEPARTMENT', 'IT', '#3B82F6'],
  ['talentacq', 'Talent Acquisition', 'Talent Acq.', '#D946EF'],
  ['coo', 'COO', 'COO', '#EF4444'],
  ['open', 'Open / Unassigned', 'Open / Unassigned', '#94A3B8'],
]
export const DEPARTMENTS: Department[] = DEPT_DEFS.map(([id, name, short, color]) => ({ id, name, short, color }))
const DEPT_BY_ID = new Map(DEPARTMENTS.map((d) => [d.id, d]))
const deptColor = (id: string) => DEPT_BY_ID.get(id)?.color ?? '#94A3B8'

function deptId(raw: string): string {
  const r = raw.trim().toLowerCase()
  if (r.startsWith('tech')) return 'tech'
  if (r.startsWith('finance')) return 'fin'
  if (r.includes('water') || r.includes('urban') || r.includes('hydro')) return 'water'
  if (r.startsWith('power')) return 'power'
  if (r.startsWith('cmd')) return 'cmd'
  if (r.startsWith('brand')) return 'brand'
  if (r.startsWith('hr')) return 'hr'
  if (r.startsWith('cos')) return 'cos'
  if (r.startsWith('bd')) return 'bd'
  if (r.startsWith('admin')) return 'admin'
  if (r.startsWith('talent management')) return 'talentmgmt'
  if (r.startsWith('talent acquisition')) return 'talentacq'
  if (r.startsWith('compliance')) return 'compliance'
  if (r.startsWith('it')) return 'it'
  if (r === 'coo') return 'coo'
  return 'open'
}

function hue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % 360
}
const TYPE_LABEL: Record<NType, string> = { employee: 'Employee', intern: 'Intern', partner: 'Silver Touch (Partner)' }
function typeOf(cat: string): NType {
  const c = cat.toLowerCase()
  if (c.includes('intern')) return 'intern'
  if (c.includes('silver')) return 'partner'
  return 'employee'
}

interface Row { seat: string; code: string; name: string; deptRaw: string; seatcat: string; cat: string }
const ROWS: Row[] = AIWC_ROWS.map(([seat, code, name, deptRaw, seatcat, cat]) => ({ seat, code, name, deptRaw, seatcat, cat }))
const isVacant = (r: Row) => r.cat.toLowerCase().startsWith('vacant') || r.name.toLowerCase().startsWith('vacant') || !r.name

const personByRow = new Map<Row, NPerson>()
export const PEOPLE: NPerson[] = []
ROWS.forEach((r, i) => {
  if (isVacant(r)) return
  const id = deptId(r.deptRaw)
  const type = typeOf(r.cat)
  const slug = r.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '') || `p${i}`
  const p: NPerson = {
    id: `np_${slug}_${i}`,
    seat: r.seat,
    code: r.code,
    name: r.name.replace(/\s+/g, ' ').trim(),
    deptId: id,
    type,
    title: `${TYPE_LABEL[type]} · ${DEPT_BY_ID.get(id)?.short ?? 'AIWC'}`,
    email: type === 'employee' && /HO|BR|MH/.test(r.code) ? `${slug.split('-')[0]}@rodic.co` : undefined,
    hue: hue(r.name),
  }
  PEOPLE.push(p)
  personByRow.set(r, p)
})

// seat number → workstation row
const wsRowBySeat = new Map<string, Row>()
for (const r of ROWS) if (r.seatcat === 'Workstation') wsRowBySeat.set(r.seat, r)
// cabin-type rows (private offices), in sheet order, to map onto drawing cabins
const cabinRows = ROWS.filter((r) => r.seatcat !== 'Workstation' && (r.seatcat.includes('Cabin') || r.seat.startsWith('LHS') || r.seat.startsWith('RHS')))

// ── geometry: real drawing coords, scaled up for legibility ──────────────────
const DVBW = 920
const DVBH = 731
const SCALE = 3
export const VBW = DVBW * SCALE
export const VBH = DVBH * SCALE

const NOTICE = new Set(['54', '97', '112', '10'])

let cabinCursor = 0
export const BASE_DESKS: NDesk[] = FLOOR1_SEATS.map((s) => {
  const isCabin = s.seatType === 'cabin'
  const numMatch = /^W(\d+)$/.exec(s.seatNumber)
  let row: Row | undefined
  if (isCabin) row = cabinRows[cabinCursor++]
  else if (numMatch) row = wsRowBySeat.get(numMatch[1])

  const person = row && !isVacant(row) ? personByRow.get(row) : undefined
  const dId = person ? person.deptId : row ? deptId(row.deptRaw) : 'open'
  const onNotice = numMatch ? NOTICE.has(numMatch[1]) : false
  return {
    id: `desk_${s.seatNumber}`,
    label: s.seatNumber,
    seatType: isCabin ? 'cabin' : 'workstation',
    pod: person ? (DEPT_BY_ID.get(dId)?.short ?? 'AIWC') : 'Unassigned',
    deptId: dId,
    deptColor: deptColor(dId),
    x: s.x * VBW,
    y: s.y * VBH,
    personId: person?.id,
    status: person ? (onNotice ? 'notice' : 'occupied') : 'vacant',
    note: person ? (onNotice ? 'On notice — last working day within 30 days' : undefined) : 'Vacant',
  }
})

// ── rooms (real drawing, scaled) ─────────────────────────────────────────────
export const ROOMS: FloorRoom[] = FLOOR1_ROOMS.map((r) => ({
  id: r.id,
  label: r.label,
  kind: r.kind as FloorRoomKind,
  x: r.x * SCALE,
  y: r.y * SCALE,
  w: r.w * SCALE,
  h: r.h * SCALE,
}))

export const PLATE: Rect = { x: 0, y: 0, w: VBW, h: VBH }

export const DEFAULT_PERSONA = (PEOPLE.find((p) => p.name.toLowerCase().startsWith('aryan giri')) ?? PEOPLE[0]).id

export const NEIGHBORHOOD = {
  name: 'AIWC Floor',
  office: 'AIWC · Aga Khan Foundation',
  floor: '3rd Floor',
  department: 'All departments',
}
