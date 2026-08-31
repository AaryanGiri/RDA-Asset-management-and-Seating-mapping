// ─────────────────────────────────────────────────────────────────────────────
// TECH INNOVATION neighborhood — standardized, market-style seat map.
//
// A self-contained dataset (real people + a clean pod-based desk layout) for the
// new seating experience. It intentionally does NOT depend on the legacy floor-
// map seed, so the old blueprint module can be removed later without touching it.
//
// Layout: workstations are grouped into "pods" (back-to-back benches of 6), the
// way commercial products (Robin / OfficeSpace / deskbird) render an open plan.
// Cabins, the VR room and flexi/overhead desks sit in a side strip.
// ─────────────────────────────────────────────────────────────────────────────

export type NStatus = 'occupied' | 'vacant' | 'notice' | 'maintenance' | 'blocked'
export type NType = 'employee' | 'intern' | 'partner'
export type NZone = 'workstation' | 'cabin' | 'vr' | 'flex'

export interface NPerson {
  id: string
  number?: string // workstation number from the floor sheet
  code: string // employee code (or vendor / intern marker)
  name: string
  type: NType
  title: string
  email?: string
  hue: number
}

export interface NDesk {
  id: string
  label: string // desk / seat number shown on the map
  zone: NZone
  pod: string
  x: number
  y: number
  w: number
  h: number
  chair: 'top' | 'bottom'
  personId?: string
  status: NStatus
  note?: string
}

export interface NRoom {
  id: string
  label: string
  sub?: string
  kind: NZone
  x: number
  y: number
  w: number
  h: number
}

// deterministic avatar hue from a name (stable across reloads, no RNG)
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

// raw roster (workstation seats) — [number, code, name, type]
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

// special seats (cabin / VR / flex-overhead)
const SPECIAL_RAW: { key: string; number: string; code: string; name: string; type: NType }[] = [
  { key: 'cabin', number: 'RHS-3', code: '10345HO', name: 'N N Sinha', type: 'employee' },
  { key: 'vr1', number: 'VR-1', code: 'Silver Touch', name: 'Kaushal Jha', type: 'partner' },
  { key: 'vr2', number: 'VR-2', code: 'Intern', name: 'Pradeep Singh', type: 'intern' },
  { key: 'flex1', number: 'FX-1', code: 'Intern', name: 'Priya Priyadarshini', type: 'intern' },
  { key: 'flex2', number: 'FX-2', code: 'Intern', name: 'Ashmit Sharma', type: 'intern' },
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
export const DESK_W = 104
export const DESK_H = 52
const DGAP = 12
const CH = 22 // chair band
const SPINE = 10 // gap between the two back-to-back desk rows
const PAD = 18
const LABELH = 24
const COLS = 3 // desks per row in a pod (pod = 2 rows = 6 desks)

const podInnerW = COLS * DESK_W + (COLS - 1) * DGAP
const podInnerH = 2 * CH + 2 * DESK_H + SPINE
export const POD_BOX_W = podInnerW + 2 * PAD
export const POD_BOX_H = podInnerH + 2 * PAD + LABELH

const X0 = 44
const Y0 = 44
const STEPX = POD_BOX_W + 40
const STEPY = POD_BOX_H + 40
const PODS_PER_ROW = 3

export interface Pod {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

// Build a pod bench (6 desks) at grid slot `index`; returns the pod box + desks.
function buildPod(index: number, label: string): { pod: Pod; desks: Omit<NDesk, 'personId' | 'status' | 'note'>[] } {
  const col = index % PODS_PER_ROW
  const row = Math.floor(index / PODS_PER_ROW)
  const boxX = X0 + col * STEPX
  const boxY = Y0 + row * STEPY
  const ox = boxX + PAD
  const oy = boxY + PAD + LABELH
  const pod: Pod = { id: `pod_${label}`, label: `Pod ${label}`, x: boxX, y: boxY, w: POD_BOX_W, h: POD_BOX_H }
  const desks: Omit<NDesk, 'personId' | 'status' | 'note'>[] = []
  const topY = oy + CH
  const botY = oy + CH + DESK_H + SPINE
  for (let i = 0; i < COLS; i++) {
    const dx = ox + i * (DESK_W + DGAP)
    desks.push({ id: `${pod.id}_t${i}`, label: '', zone: 'workstation', pod: pod.label, x: dx, y: topY, w: DESK_W, h: DESK_H, chair: 'top' })
  }
  for (let i = 0; i < COLS; i++) {
    const dx = ox + i * (DESK_W + DGAP)
    desks.push({ id: `${pod.id}_b${i}`, label: '', zone: 'workstation', pod: pod.label, x: dx, y: botY, w: DESK_W, h: DESK_H, chair: 'bottom' })
  }
  return { pod, desks }
}

const POD_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

// build 10 workstation pods = 60 desk slots
const built = POD_LABELS.map((l, i) => buildPod(i, l))
export const PODS: Pod[] = built.map((b) => b.pod)
const wsSlots = built.flatMap((b) => b.desks)

// demo (unoccupied) desks: a few free / maintenance / blocked to exercise every status
const DEMO: { label: string; status: NStatus; note?: string }[] = [
  { label: '136', status: 'vacant', note: 'Available — ready for a new joiner' },
  { label: '137', status: 'vacant', note: 'Available' },
  { label: '138', status: 'maintenance', note: 'Desk power fault — IT ticket #4821' },
  { label: '139', status: 'blocked', note: 'Reserved — incoming QA pod (Q4)' },
  { label: '140', status: 'vacant', note: 'Available' },
  { label: '141', status: 'maintenance', note: 'Monitor arm repair pending' },
  { label: '142', status: 'blocked', note: 'Held for team expansion' },
]

// employees currently on notice period (freeing up soon)
const NOTICE = new Set(['54', '97', '112'])

// ── assemble base desks (workstations) ───────────────────────────────────────
const workstationDesks: NDesk[] = wsSlots.map((slot, i) => {
  if (i < WS_RAW.length) {
    const [number, , name] = WS_RAW[i]
    const p = personByName(name)
    const onNotice = NOTICE.has(number)
    return {
      ...slot,
      label: number,
      personId: p.id,
      status: onNotice ? 'notice' : 'occupied',
      note: onNotice ? 'On notice — last working day within 30 days' : undefined,
    }
  }
  const demo = DEMO[i - WS_RAW.length]
  return { ...slot, label: demo?.label ?? `${100 + i}`, status: demo?.status ?? 'vacant', note: demo?.note }
})

// ── side strip: VR room, cabin, flex / overhead ──────────────────────────────
const STRIP_X = X0 + PODS_PER_ROW * STEPX + 6

export const ROOMS: NRoom[] = [
  { id: 'room_vr', label: 'VR Room', sub: 'Immersive lab', kind: 'vr', x: STRIP_X, y: Y0, w: 300, h: 236 },
  { id: 'room_cabin', label: 'Cabin RHS-3', sub: 'N N Sinha', kind: 'cabin', x: STRIP_X, y: Y0 + 268, w: 300, h: 150 },
  { id: 'room_flex', label: 'Flex / Overhead', sub: 'Shared desks', kind: 'flex', x: STRIP_X, y: Y0 + 450, w: 300, h: 210 },
]

function roomDesk(id: string, label: string, name: string, room: NRoom, dx: number, dy: number, chair: 'top' | 'bottom', zone: NZone): NDesk {
  const p = personByName(name)
  return { id, label, zone, pod: room.label, x: room.x + dx, y: room.y + dy, w: DESK_W, h: DESK_H, chair, personId: p.id, status: 'occupied' }
}

const vr = ROOMS[0]
const cabin = ROOMS[1]
const flex = ROOMS[2]

const specialDesks: NDesk[] = [
  roomDesk('desk_vr1', 'VR-1', 'Kaushal Jha', vr, (vr.w - DESK_W) / 2, 58, 'top', 'vr'),
  roomDesk('desk_vr2', 'VR-2', 'Pradeep Singh', vr, (vr.w - DESK_W) / 2, 58 + DESK_H + 34, 'bottom', 'vr'),
  roomDesk('desk_cabin', 'RHS-3', 'N N Sinha', cabin, (cabin.w - DESK_W) / 2, 62, 'top', 'cabin'),
  roomDesk('desk_flex1', 'FX-1', 'Priya Priyadarshini', flex, 30, 70, 'top', 'flex'),
  roomDesk('desk_flex2', 'FX-2', 'Ashmit Sharma', flex, flex.w - DESK_W - 30, 70, 'top', 'flex'),
]

export const BASE_DESKS: NDesk[] = [...workstationDesks, ...specialDesks]

// overall canvas size
export const VBW = STRIP_X + 300 + X0
export const VBH = Y0 + 4 * STEPY + 20

// the persona used for the employee view ("This is me")
export const DEFAULT_PERSONA = personByName('Aryan Giri').id

export const NEIGHBORHOOD = {
  name: 'Tech Innovation',
  office: 'AIWC · Aga Khan Foundation',
  floor: '3rd Floor',
  department: 'Technology',
}
