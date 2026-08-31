// ─────────────────────────────────────────────────────────────────────────────
// AIWC floor — a seating-first layout of the whole office.
//
// Every workstation, cabin, cell and special room from "Final Seating Data.xlsx"
// (Office = AIWC) is laid out as department NEIGHBOURHOODS: each department is a
// titled block of back-to-back desk benches, colour-coded, with its real people
// seated. Cabins / cells / VR / overhead are drawn as private rooms. Toilets,
// pantry and other non-seating spaces are intentionally omitted.
// ─────────────────────────────────────────────────────────────────────────────

import { AIWC_ROWS } from './aiwcRoster'

export type NStatus = 'occupied' | 'vacant' | 'notice' | 'maintenance' | 'blocked'
export type NType = 'employee' | 'intern' | 'partner'
export type NZone = 'workstation' | 'cabin' | 'vr' | 'flex'
export type RoomKind = NZone | 'meeting'

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
  label: string
  zone: NZone
  pod: string // department / room name
  deptId: string
  deptColor: string
  x: number
  y: number
  w: number
  h: number
  chair: 'top' | 'bottom'
  personId?: string
  status: NStatus
  note?: string
}

export interface Rect { x: number; y: number; w: number; h: number }
export interface Panel extends Rect { id: string; label: string; color: string; count: number }
export interface NRoom extends Rect { id: string; label: string; sub?: string; kind: RoomKind; color: string }

// ── departments (colour coding) ──────────────────────────────────────────────
const DEPT_DEFS: [string, string, string, string][] = [
  // id, display name, short, colour
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
  ['open', 'Open Desks', 'Open / Unassigned', '#94A3B8'],
]
export const DEPARTMENTS: Department[] = DEPT_DEFS.map(([id, name, short, color]) => ({ id, name, short, color }))
const DEPT_BY_ID = new Map(DEPARTMENTS.map((d) => [d.id, d]))

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
  return 'open' // N/A + Vacant + anything else
}
const deptColor = (id: string) => DEPT_BY_ID.get(id)?.color ?? '#94A3B8'

// ── parse roster into people ─────────────────────────────────────────────────
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
const personForRow = (r: Row) => personByRow.get(r)

// ── geometry ─────────────────────────────────────────────────────────────────
const SW = 92 // seat pitch
const DD = 54 // desk depth
const CWID = SW - 10 // desk cell width
const GAP_ROW = 20 // gap between benches
const TITLE_H = 30
const PAD = 16
const PANEL_GAP = 34
const PCOLS = 6
const CANVAS_W = 1780
const START_X = 40
const START_Y = 40

interface WsGroup { id: string; rows: Row[] }

// workstation rows grouped by department (preserve seat order)
const wsByDept = new Map<string, Row[]>()
for (const r of ROWS) {
  if (r.seatcat !== 'Workstation') continue
  const id = deptId(r.deptRaw)
  if (!wsByDept.has(id)) wsByDept.set(id, [])
  wsByDept.get(id)!.push(r)
}
// order departments by the declared order, largest first among leftovers
const wsGroups: WsGroup[] = DEPARTMENTS
  .filter((d) => wsByDept.has(d.id))
  .map((d) => ({ id: d.id, rows: wsByDept.get(d.id)! }))

const PANELS: Panel[] = []
const wsDesks: NDesk[] = []

let curX = START_X
let curY = START_Y
let rowMaxH = 0

for (const g of wsGroups) {
  const n = g.rows.length
  const cols = Math.min(n, PCOLS)
  const nRows = Math.ceil(n / cols)
  const benches = Math.ceil(nRows / 2)
  const contentH = benches * (2 * DD) + (benches - 1) * GAP_ROW - (nRows % 2 === 1 ? DD : 0) + (nRows === 1 ? 0 : 0)
  const panelW = cols * SW + 2 * PAD
  const panelH = TITLE_H + Math.max(DD, contentH) + 2 * PAD
  if (curX + panelW > CANVAS_W + START_X) {
    curX = START_X
    curY += rowMaxH + PANEL_GAP
    rowMaxH = 0
  }
  const px = curX
  const py = curY
  const color = deptColor(g.id)
  PANELS.push({ id: `panel_${g.id}`, label: DEPT_BY_ID.get(g.id)?.name ?? g.id, color, count: n, x: px, y: py, w: panelW, h: panelH })

  g.rows.forEach((r, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const bench = Math.floor(row / 2)
    const within = row % 2
    const cellX = px + PAD + col * SW + (SW - CWID) / 2
    const cellY = py + TITLE_H + bench * (2 * DD + GAP_ROW) + within * DD
    const chair: NDesk['chair'] = within === 0 ? 'top' : 'bottom'
    const vac = isVacant(r)
    const person = vac ? undefined : personForRow(r)
    wsDesks.push({
      id: `desk_ws_${g.id}_${r.seat}`,
      label: r.seat,
      zone: 'workstation',
      pod: DEPT_BY_ID.get(g.id)?.short ?? g.id,
      deptId: g.id,
      deptColor: color,
      x: cellX, y: cellY, w: CWID, h: DD, chair,
      personId: person?.id,
      status: vac ? 'vacant' : 'occupied',
      note: vac ? 'Available' : undefined,
    })
  })

  curX += panelW + PANEL_GAP
  rowMaxH = Math.max(rowMaxH, panelH)
}

const panelsBottom = curY + rowMaxH

// ── rooms: cabins, cells, VR, overhead ───────────────────────────────────────
function roomKey(r: Row): { key: string; kind: RoomKind; label: string } {
  const s = r.seat
  if (r.seatcat === 'VR Room' || s === 'VR Room') return { key: 'VR Room', kind: 'vr', label: 'VR Room' }
  if (r.seatcat === 'Overhead' || s === 'Workstation') return { key: 'Overhead', kind: 'flex', label: 'Overhead / Flex' }
  if (s === 'COS Cell') return { key: 'COS Cell', kind: 'cabin', label: 'COS Cell' }
  if (s === 'CMD Cell') return { key: 'CMD Cell', kind: 'cabin', label: 'CMD Cell' }
  return { key: s, kind: 'cabin', label: s } // LHS-x / RHS-x / Manthan
}

const roomGroups = new Map<string, { kind: RoomKind; label: string; rows: Row[] }>()
for (const r of ROWS) {
  if (r.seatcat === 'Workstation') continue
  const { key, kind, label } = roomKey(r)
  if (!roomGroups.has(key)) roomGroups.set(key, { kind, label, rows: [] })
  roomGroups.get(key)!.rows.push(r)
}
// order rooms: multi-occupant first, then single cabins
const roomList = [...roomGroups.values()].sort((a, b) => b.rows.length - a.rows.length || a.label.localeCompare(b.label))

const ROOMS: NRoom[] = []
const roomDesks: NDesk[] = []
let rx = START_X
let ry = panelsBottom + 46
let rRowH = 0
const ROOM_GAP = 30

for (let i = 0; i < roomList.length; i++) {
  const g = roomList[i]
  const cols = Math.min(g.rows.length, 3)
  const roomW = cols * SW + 2 * PAD
  const roomH = TITLE_H + DD + 2 * PAD
  if (rx + roomW > CANVAS_W + START_X) { rx = START_X; ry += rRowH + ROOM_GAP; rRowH = 0 }
  // colour by the dominant department in the room
  const domId = deptId(g.rows.find((r) => !isVacant(r))?.deptRaw ?? 'open')
  const color = deptColor(domId)
  const room: NRoom = { id: `room_${g.label.replace(/\W+/g, '_')}`, label: g.label, kind: g.kind, color, x: rx, y: ry, w: roomW, h: roomH, sub: `${g.rows.length} seat${g.rows.length > 1 ? 's' : ''}` }
  ROOMS.push(room)
  g.rows.forEach((r, j) => {
    const cellX = rx + PAD + j * SW + (SW - CWID) / 2
    const cellY = ry + TITLE_H + PAD
    const vac = isVacant(r)
    const person = vac ? undefined : personForRow(r)
    const id = deptId(r.deptRaw)
    roomDesks.push({
      id: `desk_room_${room.id}_${j}`,
      label: g.label === 'VR Room' ? `VR-${j + 1}` : g.label === 'Overhead' ? `OH-${j + 1}` : g.label,
      zone: g.kind === 'vr' ? 'vr' : g.kind === 'flex' ? 'flex' : 'cabin',
      pod: g.label,
      deptId: id,
      deptColor: deptColor(id),
      x: cellX, y: cellY, w: CWID, h: DD, chair: 'top',
      personId: person?.id,
      status: vac ? 'vacant' : 'occupied',
      note: vac ? 'Available' : undefined,
    })
  })
  rx += roomW + ROOM_GAP
  rRowH = Math.max(rRowH, roomH)
}

export const BASE_DESKS: NDesk[] = [...wsDesks, ...roomDesks]
export { PANELS, ROOMS }

export const VBW = CANVAS_W + START_X * 2
export const VBH = ry + rRowH + START_Y

export const DEFAULT_PERSONA = (PEOPLE.find((p) => p.name.toLowerCase().startsWith('aryan giri')) ?? PEOPLE[0]).id

export const NEIGHBORHOOD = {
  name: 'AIWC Floor',
  office: 'AIWC · Aga Khan Foundation',
  floor: '3rd Floor',
  department: 'All departments',
}
