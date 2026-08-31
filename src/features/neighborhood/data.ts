// ─────────────────────────────────────────────────────────────────────────────
// TECH INNOVATION hall — a faithful sub-layout of the AIWC floor plan.
//
// Modelled on the real drawing: a walled hall with back-to-back desk benches
// (open plan), private cabins, the VR room, a flexi/overhead bench and two
// meeting rooms. Each seat is a real desk + office chair; the ~58 people from
// the floor sheet are seated on them.
//
// Self-contained (no dependency on the legacy floor-map seed) so the old
// blueprint module can be removed later without touching this.
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
  label: string
  zone: NZone
  pod: string // bench / room name
  x: number // desk-cell top-left
  y: number
  w: number
  h: number
  chair: 'top' | 'bottom' | 'left' | 'right'
  personId?: string
  status: NStatus
  note?: string
}

export interface Bench {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

export interface NRoom {
  id: string
  label: string
  sub?: string
  kind: RoomKind
  x: number
  y: number
  w: number
  h: number
}

function hue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % 360
}

const TYPE_TITLE: Record<NType, string> = {
  employee: 'Team Member · Tech Innovation',
  intern: 'Intern · Tech Innovation',
  partner: 'Partner · Silver Touch',
}

type Raw = [string, string, string, NType]
const WS_RAW: Raw[] = [
  ['36', 'Intern', 'Aarnav Raj', 'intern'],
  ['37', 'Silver Touch', 'Shivangi', 'partner'],
  ['38', '11307HO', 'Kesar Sharma', 'employee'],
  ['39', '10431HO', 'Anantika Bisht', 'employee'],
  ['40', 'Silver Touch', 'Vinit Mishra', 'partner'],
  ['41', '10712HO', 'Anoop Kumar Srivastava', 'employee'],
  ['42', 'Silver Touch', 'Sachin Dagar', 'partner'],
  ['54', '8381HO', 'Harshit Kumar', 'employee'],
  ['72', '10481HO', 'Parkhar Prakash', 'employee'],
  ['82', '10452HO', 'Maaz Shahid', 'employee'],
  ['83', '9006HO', 'Piyush Agnihotri', 'employee'],
  ['84', 'Silver Touch', 'Gokul Bhatt', 'partner'],
  ['85', 'Silver Touch', 'Arnav Nath', 'partner'],
  ['86', '10338HO', 'Umesh Verma', 'employee'],
  ['87', '6015HO', 'Vineet Kumar Sachan', 'employee'],
  ['88', '11285HO', 'Ankit Jangid', 'employee'],
  ['89', 'Silver Touch', 'Sachin Bansal / Archna', 'partner'],
  ['90', '10645HO', 'Aashima Banga', 'employee'],
  ['92', '9842HO', 'Amrit Kumar Singh / Raman Kumar', 'employee'],
  ['93', 'Silver Touch', 'Pintu Kumar Chaurasia', 'partner'],
  ['94', '11384HO', 'Chanchal Kumar', 'employee'],
  ['95', '10347HO', 'Aakirti Rai', 'employee'],
  ['96', '9202HO', 'Syed Nabeel Hussain', 'employee'],
  ['97', '9201BR', 'Prernika', 'employee'],
  ['99', '93671HO', 'Md. Shafiullah Qurashi', 'employee'],
  ['100', '9391HO', 'Aryan Giri', 'employee'],
  ['101', '5862HO', 'Ajit Kumar', 'employee'],
  ['102', '6235MH', 'Nishant Sagar', 'employee'],
  ['103', '10539HO', 'Rishish Kumar Jha', 'employee'],
  ['104', '10390HO', 'Naresh Kumar', 'employee'],
  ['106', '9776HO', 'Anusha Mishra', 'employee'],
  ['107', '10662HO', 'Avneesh Pandey', 'employee'],
  ['108', '10616HO', 'Ravi Prakash', 'employee'],
  ['109', '10583HO', 'Saransh Kumar', 'employee'],
  ['110', '10371HO', 'Manoj Kumar', 'employee'],
  ['111', 'Silver Touch', 'Khushwinder', 'partner'],
  ['112', '10525HO', 'Kunal Green', 'employee'],
  ['113', '11265HO', 'Akshay Rajesh Kalje', 'employee'],
  ['114', '11020HO', 'Ali Amjad', 'employee'],
  ['115', '11267HO', 'Devika Badekar', 'employee'],
  ['118', 'N/A', 'Anushree Srivastava', 'employee'],
  ['125', '11273HO', 'Karunya', 'employee'],
  ['126', '11227HO', 'Anurag Rai', 'employee'],
  ['127', 'N/A', 'Alan R Thomas', 'employee'],
  ['128', '11264HO', 'Mohd Amaan', 'employee'],
  ['129', '11274HO', 'Aditya Chinta', 'employee'],
  ['130', '11023HO', 'Puneet Upadhyay', 'employee'],
  ['131', '11022HO', 'Harshil Nandaniya', 'employee'],
  ['132', '11021HO', 'Gaurav Jain', 'employee'],
  ['133', '11263HO', 'Soumav Mitra', 'employee'],
  ['134', '11284HO', 'Anurag Rathore', 'employee'],
  ['135', 'Not generated', 'Anmol Soni', 'employee'],
  ['144', 'Not generated', 'Pawan Rajput', 'employee'],
]

const SPECIAL_RAW = [
  { number: 'RHS-3', code: '10345HO', name: 'N N Sinha', type: 'employee' as NType },
  { number: 'VR-1', code: 'Silver Touch', name: 'Kaushal Jha', type: 'partner' as NType },
  { number: 'VR-2', code: 'Intern', name: 'Pradeep Singh', type: 'intern' as NType },
  { number: 'FX-1', code: 'Intern', name: 'Priya Priyadarshini', type: 'intern' as NType },
  { number: 'FX-2', code: 'Intern', name: 'Ashmit Sharma', type: 'intern' as NType },
]

function mkPerson(number: string | undefined, code: string, name: string, type: NType): NPerson {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '')
  return {
    id: `np_${slug}`,
    number,
    code,
    name,
    type,
    title: TYPE_TITLE[type],
    email: type === 'employee' && /HO|BR|MH/.test(code) ? `${slug.split('-')[0]}.${slug.split('-').slice(-1)[0]}@rodic.co` : undefined,
    hue: hue(name),
  }
}

export const PEOPLE: NPerson[] = [
  ...WS_RAW.map(([n, c, nm, t]) => mkPerson(n, c, nm, t)),
  ...SPECIAL_RAW.map((s) => mkPerson(s.number, s.code, s.name, s.type)),
]
const personByName = (name: string) => PEOPLE.find((p) => p.name === name)!

// ── geometry ────────────────────────────────────────────────────────────────
export const SW = 96 // seat pitch along a bench
export const DD = 56 // desk depth (one row)

// A back-to-back bench: `cols` desks on top (chairs up) + `cols` on the bottom
// (chairs down), sharing one long table.
function bench2(id: string, label: string, x: number, y: number, cols: number): { bench: Bench; cells: Omit<NDesk, 'personId' | 'status' | 'note' | 'label'>[] } {
  const bench: Bench = { id, label, x, y, w: cols * SW, h: 2 * DD }
  const cells: Omit<NDesk, 'personId' | 'status' | 'note' | 'label'>[] = []
  for (let i = 0; i < cols; i++) cells.push({ id: `${id}_t${i}`, zone: 'workstation', pod: label, x: x + i * SW, y, w: SW, h: DD, chair: 'top' })
  for (let i = 0; i < cols; i++) cells.push({ id: `${id}_b${i}`, zone: 'workstation', pod: label, x: x + i * SW, y: y + DD, w: SW, h: DD, chair: 'bottom' })
  return { bench, cells }
}

// open-plan islands, echoing the drawing (three long benches + a shorter one)
const OPEN_X = 320
const islandA = bench2('bench_a', 'Bench 1', OPEN_X, 78, 8)
const islandB = bench2('bench_b', 'Bench 2', OPEN_X, 300, 8)
const islandC = bench2('bench_c', 'Bench 3', OPEN_X, 522, 8)
const islandD = bench2('bench_d', 'Bench 4', OPEN_X, 744, 5)

export const BENCHES: Bench[] = [islandA.bench, islandB.bench, islandC.bench, islandD.bench]
const openCells = [...islandA.cells, ...islandB.cells, ...islandC.cells, ...islandD.cells]

const DEMO: { label: string; status: NStatus; note?: string }[] = [
  { label: '136', status: 'vacant', note: 'Available — ready for a new joiner' },
  { label: '137', status: 'vacant', note: 'Available' },
  { label: '138', status: 'maintenance', note: 'Desk power fault — IT ticket #4821' },
  { label: '139', status: 'blocked', note: 'Reserved — incoming QA squad (Q4)' },
  { label: '140', status: 'vacant', note: 'Available' },
]
const NOTICE = new Set(['54', '97', '112'])

const openDesks: NDesk[] = openCells.map((cell, i) => {
  if (i < WS_RAW.length) {
    const [number, , name] = WS_RAW[i]
    const p = personByName(name)
    const onNotice = NOTICE.has(number)
    return { ...cell, label: number, personId: p.id, status: onNotice ? 'notice' : 'occupied', note: onNotice ? 'On notice — last working day within 30 days' : undefined }
  }
  const demo = DEMO[i - WS_RAW.length]
  return { ...cell, label: demo?.label ?? `${100 + i}`, status: demo?.status ?? 'vacant', note: demo?.note }
})

// ── walled rooms (cabins / VR / flex / meeting) along the right + left edges ──
const RX = OPEN_X + 8 * SW + 40 // right column
export const ROOMS: NRoom[] = [
  { id: 'room_mr5', label: 'Meeting Room 5', sub: '9\'-0" × 8\'-10"', kind: 'meeting', x: 40, y: 60, w: 250, h: 190 },
  { id: 'room_mr4', label: 'Meeting Room 4', sub: '4 pax', kind: 'meeting', x: 40, y: 690, w: 250, h: 190 },
  { id: 'room_cabin', label: 'Cabin RHS-3', sub: 'N N Sinha', kind: 'cabin', x: RX, y: 60, w: 300, h: 150 },
  { id: 'room_cabin2', label: 'Cabin C2', sub: 'Reserved', kind: 'cabin', x: RX, y: 226, w: 300, h: 150 },
  { id: 'room_vr', label: 'VR Room', sub: 'Immersive lab', kind: 'vr', x: RX, y: 392, w: 300, h: 230 },
  { id: 'room_flex', label: 'Flex / Overhead', sub: 'Shared desks', kind: 'flex', x: RX, y: 638, w: 300, h: 200 },
]

function roomDesk(id: string, label: string, name: string | undefined, room: NRoom, dx: number, dy: number, chair: NDesk['chair'], zone: NZone, status: NStatus = 'occupied', note?: string): NDesk {
  const p = name ? personByName(name) : undefined
  return { id, label, zone, pod: room.label, x: room.x + dx, y: room.y + dy, w: SW, h: DD, chair, personId: p?.id, status: p ? status : 'vacant', note }
}
const cabin = ROOMS[2]
const vr = ROOMS[4]
const flex = ROOMS[5]

const roomDesks: NDesk[] = [
  roomDesk('desk_cabin', 'RHS-3', 'N N Sinha', cabin, (cabin.w - SW) / 2, 70, 'top', 'cabin'),
  roomDesk('desk_vr1', 'VR-1', 'Kaushal Jha', vr, (vr.w - SW) / 2 - 60, 92, 'top', 'vr'),
  roomDesk('desk_vr2', 'VR-2', 'Pradeep Singh', vr, (vr.w - SW) / 2 + 60, 92, 'top', 'vr'),
  roomDesk('desk_flex1', 'FX-1', 'Priya Priyadarshini', flex, 34, 86, 'top', 'flex'),
  roomDesk('desk_flex2', 'FX-2', 'Ashmit Sharma', flex, flex.w - SW - 34, 86, 'top', 'flex'),
]

export const BASE_DESKS: NDesk[] = [...openDesks, ...roomDesks]

export const VBW = RX + 300 + 40
export const VBH = 920

export const DEFAULT_PERSONA = personByName('Aryan Giri').id

export const NEIGHBORHOOD = {
  name: 'Tech Innovation',
  office: 'AIWC · Aga Khan Foundation',
  floor: '3rd Floor',
  department: 'Technology',
}
