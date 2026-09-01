// ─────────────────────────────────────────────────────────────────────────────
// RDA — an exact reproduction of the one cropped section of the AIWC
// floor plan (workstations W79–W106): the top bench, the back-to-back island
// (split by the staircase / pillar), the lower bench, Meeting Room 4, the low-
// height storage blocks and the wide corridor.
//
// Only the people who sit in THIS section are shown; everyone seated elsewhere
// is intentionally omitted. Self-contained (no legacy seed dependency).
// ─────────────────────────────────────────────────────────────────────────────

export type NStatus = 'occupied' | 'vacant' | 'notice' | 'maintenance' | 'blocked'
export type NType = 'employee' | 'intern' | 'partner'
export type NZone = 'workstation' | 'cabin' | 'vr' | 'flex'
export type RoomKind = NZone | 'meeting'

export interface NPerson {
  id: string
  number?: string
  code: string
  name: string
  type: NType
  title: string
  email?: string
  hue: number
}

export interface NDesk {
  id: string
  label: string // the drawing's workstation number (W86, W80…)
  zone: NZone
  pod: string
  x: number
  y: number
  w: number
  h: number
  chair: 'top' | 'bottom' | 'left' | 'right'
  personId?: string
  status: NStatus
  note?: string
}

export interface Rect { x: number; y: number; w: number; h: number }
export interface NRoom extends Rect { id: string; label: string; sub?: string; kind: RoomKind }
export interface Cluster extends Rect { id: string }
export interface Storage extends Rect { id: string; label?: string }
export interface ZoneLabel { text: string; x: number; y: number; color: string }

function hue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % 360
}

const TYPE_TITLE: Record<NType, string> = {
  employee: 'Team Member · RDA',
  intern: 'Intern · RDA',
  partner: 'Partner · Silver Touch',
}

// roster — only the people who occupy this section (28 workstations W79–W106),
// in the order they are seated across the drawing.
type Raw = [string, string, NType]
const ROSTER: Raw[] = [
  ['Intern', 'Aarnav Raj', 'intern'],
  ['Silver Touch', 'Shivangi', 'partner'],
  ['11307HO', 'Kesar Sharma', 'employee'],
  ['10431HO', 'Anantika Bisht', 'employee'],
  ['Silver Touch', 'Vinit Mishra', 'partner'],
  ['10712HO', 'Anoop Kumar Srivastava', 'employee'],
  ['Silver Touch', 'Sachin Dagar', 'partner'],
  ['8381HO', 'Harshit Kumar', 'employee'],
  ['10481HO', 'Parkhar Prakash', 'employee'],
  ['10452HO', 'Maaz Shahid', 'employee'],
  ['9006HO', 'Piyush Agnihotri', 'employee'],
  ['Silver Touch', 'Gokul Bhatt', 'partner'],
  ['Silver Touch', 'Arnav Nath', 'partner'],
  ['10338HO', 'Umesh Verma', 'employee'],
  ['6015HO', 'Vineet Kumar Sachan', 'employee'],
  ['11285HO', 'Ankit Jangid', 'employee'],
  ['Silver Touch', 'Sachin Bansal / Archna', 'partner'],
  ['10645HO', 'Aashima Banga', 'employee'],
  ['9842HO', 'Amrit Kumar Singh', 'employee'],
  ['Silver Touch', 'Pintu Kumar Chaurasia', 'partner'],
  ['11384HO', 'Chanchal Kumar', 'employee'],
  ['10347HO', 'Aakirti Rai', 'employee'],
  ['9202HO', 'Syed Nabeel Hussain', 'employee'],
  ['9201BR', 'Prernika', 'employee'],
  ['93671HO', 'Md. Shafiullah Qurashi', 'employee'],
  ['9391HO', 'Aryan Giri', 'employee'],
  ['5862HO', 'Ajit Kumar', 'employee'],
  ['6235MH', 'Nishant Sagar', 'employee'],
]

function mkPerson(code: string, name: string, type: NType): NPerson {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '')
  return {
    id: `np_${slug}`,
    code,
    name,
    type,
    title: TYPE_TITLE[type],
    email: type === 'employee' && /HO|BR|MH/.test(code) ? `${slug.split('-')[0]}.${slug.split('-').slice(-1)[0]}@rodic.co` : undefined,
    hue: hue(name),
  }
}

export const PEOPLE: NPerson[] = ROSTER.map(([c, n, t]) => mkPerson(c, n, t))

// ── geometry (matches the drawing crop) ──────────────────────────────────────
const CW = 90 // desk cell width
const CH = 62 // desk cell height

// desk order matches PEOPLE order (top bench → island north → island south → lower bench)
interface Slot { label: string; pod: string; cx: number; y: number; chair: NDesk['chair'] }

const TOP_Y = 78
const ISLAND_N_Y = 250
const ISLAND_S_Y = 314
const BOTTOM_Y = 452

const SLOTS: Slot[] = [
  // top bench (desks against the top wall, people below facing up)
  { label: 'W86', pod: 'RDA', cx: 96, y: TOP_Y, chair: 'bottom' },
  { label: 'W85', pod: 'RDA', cx: 194, y: TOP_Y, chair: 'bottom' },
  { label: 'W84', pod: 'RDA', cx: 292, y: TOP_Y, chair: 'bottom' },
  { label: 'W83', pod: 'RDA', cx: 390, y: TOP_Y, chair: 'bottom' },
  { label: 'W82', pod: 'RDA', cx: 488, y: TOP_Y, chair: 'bottom' },
  { label: 'W81', pod: 'RDA', cx: 586, y: TOP_Y, chair: 'bottom' },
  { label: 'W80', pod: 'RDA', cx: 684, y: TOP_Y, chair: 'bottom' },
  { label: 'W79', pod: 'COS Cell', cx: 782, y: TOP_Y, chair: 'bottom' },
  // island — north row
  { label: 'W87', pod: 'TI · 80–96', cx: 96, y: ISLAND_N_Y, chair: 'top' },
  { label: 'W88', pod: 'TI · 80–96', cx: 194, y: ISLAND_N_Y, chair: 'top' },
  { label: 'W89', pod: 'TI · 80–96', cx: 292, y: ISLAND_N_Y, chair: 'top' },
  { label: 'W90', pod: 'BD · 90–97', cx: 536, y: ISLAND_N_Y, chair: 'top' },
  { label: 'W91', pod: 'BD · 90–97', cx: 634, y: ISLAND_N_Y, chair: 'top' },
  { label: 'W92', pod: 'BD · 90–97', cx: 732, y: ISLAND_N_Y, chair: 'top' },
  { label: 'W93', pod: 'BD · 90–97', cx: 830, y: ISLAND_N_Y, chair: 'top' },
  // island — south row
  { label: 'W100', pod: 'R · 97–102', cx: 96, y: ISLAND_S_Y, chair: 'bottom' },
  { label: 'W99', pod: 'R · 97–102', cx: 194, y: ISLAND_S_Y, chair: 'bottom' },
  { label: 'W98', pod: 'R · 97–102', cx: 292, y: ISLAND_S_Y, chair: 'bottom' },
  { label: 'W97', pod: 'BD · 90–97', cx: 536, y: ISLAND_S_Y, chair: 'bottom' },
  { label: 'W96', pod: 'BD · 90–97', cx: 634, y: ISLAND_S_Y, chair: 'bottom' },
  { label: 'W95', pod: 'BD · 90–97', cx: 732, y: ISLAND_S_Y, chair: 'bottom' },
  { label: 'W94', pod: 'BD · 90–97', cx: 830, y: ISLAND_S_Y, chair: 'bottom' },
  // lower bench (people above facing up toward the island)
  { label: 'W101', pod: 'R · 97–102', cx: 150, y: BOTTOM_Y, chair: 'top' },
  { label: 'W102', pod: 'R · 97–102', cx: 248, y: BOTTOM_Y, chair: 'top' },
  { label: 'W103', pod: 'CC · 103–104', cx: 430, y: BOTTOM_Y, chair: 'top' },
  { label: 'W104', pod: 'CC · 103–104', cx: 528, y: BOTTOM_Y, chair: 'top' },
  { label: 'W105', pod: 'COO Cell', cx: 672, y: BOTTOM_Y, chair: 'top' },
  { label: 'W106', pod: 'COO Cell', cx: 770, y: BOTTOM_Y, chair: 'top' },
  // spare / flexi desks (kept vacant) — available targets for seat-change requests
  { label: 'S-1', pod: 'Flexi / Spare', cx: 150, y: 566, chair: 'top' },
  { label: 'S-2', pod: 'Flexi / Spare', cx: 248, y: 566, chair: 'top' },
  { label: 'S-3', pod: 'Flexi / Spare', cx: 346, y: 566, chair: 'top' },
]

const NOTICE = new Set(['W83', 'W97']) // a couple on notice, for realism

export const BASE_DESKS: NDesk[] = SLOTS.map((s, i) => {
  const p = PEOPLE[i]
  const onNotice = NOTICE.has(s.label)
  return {
    id: `desk_${s.label}`,
    label: s.label,
    zone: 'workstation',
    pod: s.pod,
    x: s.cx - CW / 2,
    y: s.y,
    w: CW,
    h: CH,
    chair: s.chair,
    personId: p?.id,
    status: p ? (onNotice ? 'notice' : 'occupied') : 'vacant',
    note: onNotice ? 'On notice — last working day within 30 days' : undefined,
  }
})

// ── furniture / decor (from the drawing) ─────────────────────────────────────
export const CLUSTERS: Cluster[] = [
  { id: 'c_top', x: 45, y: 72, w: 788, h: 74 },
  { id: 'c_isl_l', x: 45, y: 244, w: 298, h: 138 },
  { id: 'c_isl_r', x: 485, y: 244, w: 396, h: 138 },
  { id: 'c_bot_l', x: 99, y: 446, w: 200, h: 74 },
  { id: 'c_bot_m', x: 379, y: 446, w: 200, h: 74 },
  { id: 'c_bot_r', x: 621, y: 446, w: 200, h: 74 },
  { id: 'c_spare', x: 99, y: 552, w: 298, h: 74 },
]

export const STORAGE: Storage[] = [
  { id: 's_top', x: 840, y: 72, w: 22, h: 74, label: 'LOW HEIGHT STORAGE' },
  { id: 's_isl_l', x: 350, y: 244, w: 24, h: 138, label: 'STORAGE' },
  { id: 's_isl_r', x: 462, y: 244, w: 24, h: 138, label: 'STORAGE' },
  { id: 's_bot_0', x: 45, y: 446, w: 44, h: 74, label: 'LOW HEIGHT STORAGE' },
  { id: 's_bot_1', x: 309, y: 446, w: 60, h: 74, label: 'LOW HEIGHT STORAGE' },
  { id: 's_bot_2', x: 589, y: 446, w: 22, h: 74, label: 'STORAGE' },
]

export const STAIR: Rect = { x: 388, y: 250, w: 60, h: 108 }
export const PILLAR: Rect = { x: 452, y: 292, w: 24, h: 24 }
export const WIFI: Rect = { x: 392, y: 398, w: 66, h: 24 }
export const CORRIDOR: Rect = { x: 906, y: 60, w: 46, h: 546 }

export const ROOMS: NRoom[] = [
  { id: 'room_mr4', label: 'Meeting Room 4', sub: '9\'-0" × 8\'-10" · 4 pax', kind: 'meeting', x: 648, y: 624, w: 224, h: 158 },
]

export const LABELS: ZoneLabel[] = [
  { text: 'RDA', x: 54, y: 200, color: 'rgb(var(--c-text))' },
  { text: 'TI · 80 TO 96', x: 360, y: 226, color: '#16a34a' },
  { text: 'R · 97 TO 102', x: 108, y: 420, color: '#0891b2' },
  { text: 'BD · 90 TO 97, 103 TO 105', x: 556, y: 410, color: '#db2777' },
  { text: 'CC · 103 TO 104', x: 372, y: 438, color: '#2563eb' },
  { text: 'COO CELL', x: 636, y: 430, color: '#7c3aed' },
]

export const VBW = 972
export const VBH = 800

export const DEFAULT_PERSONA = PEOPLE.find((p) => p.name === 'Aryan Giri')?.id ?? PEOPLE[0].id

export const NEIGHBORHOOD = {
  name: 'RDA',
  office: 'AIWC · Aga Khan Foundation',
  floor: '3rd Floor',
  department: 'Technology',
}
