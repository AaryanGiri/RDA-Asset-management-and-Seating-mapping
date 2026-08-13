import {
  FLOOR_GEOMETRY,
  generateFloorSeats,
} from '@/features/seating/floorplans'
import type {
  Asset,
  AssetCategory,
  AssetCondition,
  AssetStatus,
  Department,
  Employee,
  Floor,
  MovementRequest,
  Notification,
  Office,
  Seat,
  SeatEvent,
  SeatStatus,
  VerificationTask,
} from './types'
import { daysAgoISO, daysFromNowISO, uid } from './utils'

// deterministic RNG so the seeded world is coherent
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260808)
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
const chance = (p: number) => rand() < p
const int = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1))

// ── Offices, floors, departments ────────────────────────────────────────────
export const OFFICES: Office[] = [
  { id: 'hq', name: 'Aster HQ', code: 'HQ', city: 'New Delhi', state: 'Delhi', country: 'India', timezone: 'IST', isPilot: true },
  { id: 'mum', name: 'West Regional Office', code: 'WRO', city: 'Mumbai', state: 'Maharashtra', country: 'India', timezone: 'IST', isPilot: false },
  { id: 'blr', name: 'South Tech Center', code: 'STC', city: 'Bengaluru', state: 'Karnataka', country: 'India', timezone: 'IST', isPilot: false },
  { id: 'sgp', name: 'APAC Hub', code: 'APAC', city: 'Singapore', state: '—', country: 'Singapore', timezone: 'SGT', isPilot: false },
]

export const FLOORS: Floor[] = [
  { id: 'f1', officeId: 'hq', name: 'Aga Khan Foundation · Office', level: 3, plan: 'f1', seatCount: 0 },
  { id: 'f2', officeId: 'hq', name: 'YMCA Building · New Delhi', level: 1, plan: 'f2', seatCount: 0 },
]

export const DEPARTMENTS: Department[] = [
  { id: 'ops', name: 'Operations', color: '#6366F1' },
  { id: 'tech', name: 'Technology', color: '#0EA5E9' },
  { id: 'fin', name: 'Finance', color: '#10B981' },
  { id: 'ppl', name: 'People & Culture', color: '#F59E0B' },
  { id: 'dsn', name: 'Design', color: '#EC4899' },
  { id: 'proj', name: 'Projects', color: '#8B5CF6' },
  { id: 'proc', name: 'Procurement', color: '#14B8A6' },
  { id: 'legal', name: 'Legal & Risk', color: '#64748B' },
  { id: 'comm', name: 'Commercial', color: '#EF4444' },
  { id: 'fac', name: 'Facilities', color: '#A16207' },
]

const FIRST = ['Aarav', 'Sophia', 'Liam', 'Ananya', 'Noah', 'Priya', 'Ethan', 'Mei', 'Kabir', 'Isabella', 'Rohan', 'Amara', 'Lucas', 'Yuki', 'Diego', 'Fatima', 'Arjun', 'Elena', 'Omar', 'Grace', 'Ishaan', 'Nadia', 'Marcus', 'Leila', 'Tara', 'Daniel', 'Zoe', 'Hassan', 'Ivy', 'Vikram', 'Sara', 'Andre', 'Naomi', 'Felix', 'Aisha', 'Jonas', 'Ria', 'Theo', 'Lina', 'Karan', 'Maya', 'Sam', 'Nora', 'Devin', 'Hana', 'Rahul', 'Clara', 'Idris', 'Beatriz', 'Nikhil']
const LAST = ['Sharma', 'Chen', 'Okafor', 'Patel', 'Nguyen', 'Silva', 'Kapoor', 'Rossi', 'Khan', 'Müller', 'Reddy', 'Costa', 'Ali', 'Tanaka', 'Mensah', 'Iyer', 'Novak', 'Haddad', 'Larsen', 'Mehta', 'Santos', 'Cohen', 'Adeyemi', 'Verma', 'Park', 'Fernandes', 'Bhat', 'Dubois', ' Favreau', 'Kaur', 'Osei', 'Rao', 'Gupta', 'Lindqvist', 'Bianchi']

const DESIGNATIONS: Record<string, string[]> = {
  ops: ['Operations Lead', 'Operations Analyst', 'Coordinator', 'Ops Manager'],
  tech: ['Senior Engineer', 'Platform Engineer', 'QA Engineer', 'Engineering Manager', 'DevOps Engineer'],
  fin: ['Financial Analyst', 'Accountant', 'Finance Manager', 'Controller'],
  ppl: ['HR Business Partner', 'Recruiter', 'People Ops Lead', 'L&D Specialist'],
  dsn: ['Product Designer', 'UX Researcher', 'Design Lead', 'Brand Designer'],
  proj: ['Project Manager', 'Site Engineer', 'Planning Lead', 'PMO Analyst'],
  proc: ['Procurement Officer', 'Category Manager', 'Buyer'],
  legal: ['Legal Counsel', 'Compliance Officer', 'Risk Analyst'],
  comm: ['Account Director', 'Commercial Manager', 'Business Analyst'],
  fac: ['Facilities Manager', 'Admin Executive', 'Workplace Coordinator'],
}
const MANAGERS = ['N. Sinha', 'L. Singh', 'R. Kapoor', 'A. Menon', 'S. Fernandes', 'D. Osei', 'P. Chandra']
const PROJECTS = ['Meridian', 'Blue Harbor', 'Northwind', 'Atlas Rollout', 'Evergreen', 'Skyline', 'Horizon', 'Corporate Shared', 'Delta Program', 'Lighthouse']

export interface SeedData {
  offices: Office[]
  floors: Floor[]
  departments: Department[]
  employees: Employee[]
  seats: Seat[]
  seatEvents: SeatEvent[]
  categories: AssetCategory[]
  assets: Asset[]
  movements: MovementRequest[]
  verifications: VerificationTask[]
  notifications: Notification[]
}

function makeEmployees(count: number): Employee[] {
  const used = new Set<string>()
  const out: Employee[] = []
  for (let i = 0; i < count; i++) {
    let name = ''
    do {
      name = `${pick(FIRST)} ${pick(LAST)}`.replace('  ', ' ').trim()
    } while (used.has(name))
    used.add(name)
    const dept = pick(DEPARTMENTS)
    const onNotice = chance(0.075)
    const [first, last] = name.split(' ')
    out.push({
      id: `emp_${i + 1}`,
      code: `EMP-${(1000 + i + 1).toString()}`,
      fullName: name,
      designation: pick(DESIGNATIONS[dept.id]),
      departmentId: dept.id,
      project: pick(PROJECTS),
      reportingManager: pick(MANAGERS),
      email: `${first.toLowerCase()}.${last.toLowerCase()}@aster.co`,
      phone: `+91 ${int(70, 99)}${int(10000000, 99999999)}`,
      joiningDate: daysAgoISO(int(40, 2200)),
      employmentStatus: onNotice ? 'notice' : 'active',
      lastWorkingDay: onNotice ? daysFromNowISO(int(4, 42)) : undefined,
      officeId: 'hq',
      avatarHue: int(0, 360),
    })
  }
  return out
}

function buildSeatsAndAssign(employees: Employee[]): { seats: Seat[]; events: SeatEvent[] } {
  const seats: Seat[] = []
  const events: SeatEvent[] = []
  for (const floorId of ['f1', 'f2']) {
    const geo = FLOOR_GEOMETRY[floorId]
    const gen = generateFloorSeats(geo)
    for (const g of gen) {
      seats.push({
        id: uid('seat'),
        seatNumber: g.seatNumber,
        officeId: 'hq',
        floorId,
        zone: g.zone,
        seatType: g.seatType,
        x: g.x,
        y: g.y,
        status: 'vacant',
        isActive: true,
      })
    }
  }
  FLOORS.forEach((f) => (f.seatCount = seats.filter((s) => s.floorId === f.id).length))

  // Employees available to seat (leave a handful unseated → "awaiting allocation")
  const noticeEmps = employees.filter((e) => e.employmentStatus === 'notice')
  const activeEmps = employees.filter((e) => e.employmentStatus === 'active')
  const toSeatActive = activeEmps.slice(0, activeEmps.length - 6) // last 6 remain unseated

  // shuffle seats deterministically
  const order = [...seats].sort(() => rand() - 0.5)
  let ai = 0
  let ni = 0
  const blockedTargets = int(2, 3)
  const maintTargets = int(2, 4)
  let blocked = 0
  let maint = 0

  for (const seat of order) {
    // reserve a few for maintenance / blocked (prefer far seats)
    if (blocked < blockedTargets && chance(0.04)) {
      seat.status = 'blocked'
      seat.remarks = pick(['Held for Q3 restructuring', 'Reserved — incoming team', 'Awaiting furniture install'])
      blocked++
      events.push(mkEvent(seat, 'blocked', undefined, seat.remarks!))
      continue
    }
    if (maint < maintTargets && chance(0.05)) {
      seat.status = 'maintenance'
      seat.remarks = pick(['Desk power fault — IT ticket #4821', 'Chair replacement pending', 'Monitor arm repair'])
      maint++
      events.push(mkEvent(seat, 'maintenance', undefined, seat.remarks!))
      continue
    }
    // place notice employees
    if (ni < noticeEmps.length && chance(0.6)) {
      const e = noticeEmps[ni++]
      seat.status = 'notice'
      seat.employeeId = e.id
      seat.allocationDate = daysAgoISO(int(120, 900))
      e.currentSeatId = seat.id
      events.push(mkEvent(seat, 'allocated', e, 'Initial allocation'))
      continue
    }
    // place active employees
    if (ai < toSeatActive.length && chance(0.82)) {
      const e = toSeatActive[ai++]
      seat.status = 'occupied'
      seat.employeeId = e.id
      seat.allocationDate = daysAgoISO(int(30, 1400))
      e.currentSeatId = seat.id
      events.push(mkEvent(seat, 'allocated', e, 'Initial allocation'))
      continue
    }
    // else vacant
  }
  // Ensure remaining notice employees are placed even if skipped by chance
  for (; ni < noticeEmps.length; ni++) {
    const e = noticeEmps[ni]
    const free = order.find((s) => s.status === 'vacant')
    if (!free) break
    free.status = 'notice'
    free.employeeId = e.id
    free.allocationDate = daysAgoISO(int(120, 900))
    e.currentSeatId = free.id
    events.push(mkEvent(free, 'allocated', e, 'Initial allocation'))
  }
  // Ensure a healthy number of vacant seats exist (target ~14%)
  return { seats, events }
}

function mkEvent(seat: Seat, type: SeatEvent['type'], emp: Employee | undefined, reason: string): SeatEvent {
  return {
    id: uid('sev'),
    seatId: seat.id,
    seatNumber: seat.seatNumber,
    type,
    employeeId: emp?.id,
    employeeName: emp?.fullName,
    reason,
    effectiveDate: seat.allocationDate ?? daysAgoISO(int(10, 400)),
    actor: pick(['A. Menon (Admin)', 'S. Fernandes (Admin)', 'System']),
    timestamp: seat.allocationDate ?? daysAgoISO(int(10, 400)),
  }
}

// ── Assets ──────────────────────────────────────────────────────────────────
export const CATEGORIES: AssetCategory[] = [
  { id: 'monitor', name: 'Monitor', icon: 'monitor', photoViews: ['Front', 'Rear ports', 'Serial label', 'Damage area'] },
  { id: 'laptop', name: 'Laptop', icon: 'laptop', photoViews: ['Lid closed', 'Open / screen', 'Serial label', 'Damage area'] },
  { id: 'chair', name: 'Task Chair', icon: 'armchair', photoViews: ['Front', 'Base & castors', 'Label', 'Damage area'] },
  { id: 'desk', name: 'Desk', icon: 'table', photoViews: ['Top surface', 'Frame', 'Label', 'Damage area'] },
  { id: 'ac', name: 'AC Unit', icon: 'wind', photoViews: ['Front grille', 'Rating plate', 'Filter', 'Damage area'] },
  { id: 'printer', name: 'Printer', icon: 'printer', photoViews: ['Front', 'Rear', 'Serial label', 'Damage area'] },
  { id: 'projector', name: 'Projector', icon: 'projector', photoViews: ['Lens side', 'Ports', 'Serial label', 'Damage area'] },
  { id: 'switch', name: 'Network Switch', icon: 'network', photoViews: ['Front ports', 'Rear', 'Asset label', 'Damage area'] },
]

const BRANDS: Record<string, [string, string][]> = {
  monitor: [['Dell', 'U2723QE'], ['LG', '27UP850'], ['Samsung', 'ViewFinity S8'], ['BenQ', 'PD2705U']],
  laptop: [['Apple', 'MacBook Pro 14'], ['Dell', 'Latitude 7440'], ['Lenovo', 'ThinkPad X1'], ['HP', 'EliteBook 840']],
  chair: [['Herman Miller', 'Aeron'], ['Steelcase', 'Series 2'], ['Featherlite', 'Optima'], ['Godrej', 'Teardrop HB']],
  desk: [['Steelcase', 'Ology'], ['Featherlite', 'Contact'], ['Godrej', 'Elance'], ['Haworth', 'Jump']],
  ac: [['Daikin', 'FTKF50'], ['Voltas', 'SAC 185V'], ['Blue Star', 'IC518'], ['Hitachi', 'RAU518']],
  printer: [['HP', 'LaserJet M479'], ['Canon', 'iR 2630'], ['Epson', 'WF-C5790'], ['Brother', 'MFC-L8900']],
  projector: [['Epson', 'EB-L200'], ['BenQ', 'LK936ST'], ['Sony', 'VPL-PHZ11']],
  switch: [['Cisco', 'C9200-24'], ['Aruba', '2930F'], ['Ubiquiti', 'USW-Pro-24']],
}
const SUPPLIERS = ['Redington Distribution', 'Ingram Micro', 'Compuage', 'Savex Technologies', 'Direct — OEM']
const CONDITIONS: AssetCondition[] = ['new', 'good', 'good', 'good', 'fair', 'fair', 'damaged', 'beyond-repair']
const STATUSES: AssetStatus[] = ['in-use', 'in-use', 'in-use', 'in-use', 'in-storage', 'under-repair']
const ROOMS_F1 = ['Tech Innovation', 'CMD Room', 'Meeting Room 1', 'Audio Visual Room', 'Cafe', 'Pantry', 'Store', 'Reception']
const ROOMS_F2 = ['Conference Room', 'Server Room', 'Meeting Room', 'CEO Cabin', 'Director Cabin', 'R.Innovation Hub', 'Pantry', 'Reception']

function makeAssets(employees: Employee[]): Asset[] {
  const out: Asset[] = []
  const total = 48
  for (let i = 0; i < total; i++) {
    const cat = pick(CATEGORIES)
    const [brand, model] = pick(BRANDS[cat.id])
    const condition = pick(CONDITIONS)
    let status: AssetStatus = pick(STATUSES)
    if (condition === 'beyond-repair') status = chance(0.5) ? 'under-repair' : 'in-storage'
    const custodian = pick(employees.filter((e) => e.employmentStatus === 'active'))
    const officeId = chance(0.8) ? 'hq' : pick(['mum', 'blr'])
    const floorId = chance(0.6) ? 'f1' : 'f2'
    const room = floorId === 'f1' ? pick(ROOMS_F1) : pick(ROOMS_F2)
    const purchaseDaysAgo = int(60, 1600)
    const lastVerified = chance(0.7) ? daysAgoISO(int(3, 55)) : undefined
    const overdue = chance(0.22)
    const catCode = cat.id.slice(0, 3).toUpperCase()
    const tag = `AST-${catCode}-${(140 + i).toString().padStart(4, '0')}`
    const photos = cat.photoViews.slice(0, int(2, 4)).map((view, idx) => ({
      id: uid('ph'),
      view,
      hue: (i * 47 + idx * 60) % 360,
      capturedAt: daysAgoISO(int(2, 60)),
    }))
    const timeline = buildTimeline(tag, brand, condition, purchaseDaysAgo, custodian.fullName)
    out.push({
      id: uid('ast'),
      tag,
      categoryId: cat.id,
      name: `${brand} ${model}`,
      brand,
      model,
      serialNumber: `${brand.slice(0, 2).toUpperCase()}${int(100000, 999999)}${pick(['A', 'B', 'C', 'X'])}`,
      purchaseDate: daysAgoISO(purchaseDaysAgo),
      purchaseValue: assetValue(cat.id),
      supplier: pick(SUPPLIERS),
      warrantyUntil: daysFromNowISO(int(-200, 700)),
      officeId,
      floorId,
      room,
      custodianId: custodian.id,
      department: pick(DEPARTMENTS).name,
      condition,
      status,
      lastVerifiedAt: lastVerified,
      nextVerificationDue: overdue ? daysAgoISO(int(1, 12)) : daysFromNowISO(int(1, 26)),
      photos,
      timeline,
      flagged:
        condition === 'damaged' && chance(0.5)
          ? 'Condition mismatch flagged at last verification'
          : overdue && chance(0.4)
            ? 'Verification overdue'
            : undefined,
    })
  }
  return out
}

function assetValue(cat: string) {
  const base: Record<string, [number, number]> = {
    monitor: [18000, 65000], laptop: [70000, 240000], chair: [9000, 95000], desk: [12000, 45000],
    ac: [32000, 90000], printer: [25000, 180000], projector: [90000, 340000], switch: [45000, 220000],
  }
  const [lo, hi] = base[cat] ?? [10000, 50000]
  return Math.round((lo + rand() * (hi - lo)) / 500) * 500
}

function buildTimeline(tag: string, brand: string, condition: AssetCondition, purchaseDaysAgo: number, custodian: string) {
  const t = []
  t.push({ id: uid('tl'), type: 'onboarded' as const, title: 'Asset onboarded', detail: `Registered & QR-tagged (${tag})`, actor: 'A. Menon (Admin)', timestamp: daysAgoISO(purchaseDaysAgo - 2), condition: 'new' as AssetCondition })
  if (chance(0.5)) t.push({ id: uid('tl'), type: 'custodian-change' as const, title: 'Custodian assigned', detail: `Handed over to ${custodian}`, actor: 'A. Menon (Admin)', timestamp: daysAgoISO(int(200, purchaseDaysAgo - 5)) })
  if (chance(0.6)) t.push({ id: uid('tl'), type: 'moved' as const, title: 'Relocated', detail: 'Moved between zones — receipt scan confirmed', actor: 'S. Fernandes (Admin)', timestamp: daysAgoISO(int(60, 200)) })
  if (chance(0.8)) t.push({ id: uid('tl'), type: 'verified' as const, title: 'Monthly verification', detail: 'AI-assisted condition check confirmed by Admin', actor: 'System · AI assist', timestamp: daysAgoISO(int(20, 60)), condition: condition === 'new' ? 'good' : condition, ai: true })
  if (condition === 'damaged' || condition === 'beyond-repair') t.push({ id: uid('tl'), type: 'flagged' as const, title: 'Condition downgraded', detail: `Marked ${condition.replace('-', ' ')} — repair/replace review`, actor: 'A. Menon (Admin)', timestamp: daysAgoISO(int(5, 25)), condition })
  return t.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
}

function makeMovements(assets: Asset[]): MovementRequest[] {
  const stages: MovementRequest['stage'][] = ['requested', 'ai-review', 'approved', 'in-transit', 'received', 'received']
  const out: MovementRequest[] = []
  const pool = [...assets].sort(() => rand() - 0.5).slice(0, 6)
  pool.forEach((a, i) => {
    const stage = stages[i]
    const ai: AssetCondition = pick(['good', 'good', 'fair', 'damaged'])
    out.push({
      id: uid('mov'),
      assetId: a.id,
      assetTag: a.tag,
      assetName: a.name,
      fromOfficeId: a.officeId,
      fromRoom: a.room,
      toOfficeId: pick(['hq', 'mum', 'blr']),
      toRoom: pick(['Tech Innovation', 'Server Room', 'Store', 'Conference Room']),
      reason: pick(['Team relocation', 'Repair at central facility', 'Reallocation to project', 'Office refresh']),
      requestedBy: pick(MANAGERS),
      approver: 'A. Menon (Admin)',
      expectedDate: daysFromNowISO(int(1, 9)),
      stage,
      aiCondition: stage === 'requested' ? undefined : ai,
      aiConfidence: stage === 'requested' ? undefined : int(72, 97),
      humanCondition: stage === 'approved' || stage === 'in-transit' || stage === 'received' ? ai : undefined,
      createdAt: daysAgoISO(int(1, 14)),
      updatedAt: daysAgoISO(int(0, 3)),
    })
  })
  return out
}

function makeVerifications(assets: Asset[]): VerificationTask[] {
  const out: VerificationTask[] = []
  const pool = [...assets].sort(() => rand() - 0.5).slice(0, 16)
  pool.forEach((a, i) => {
    const overdue = i < 4
    const done = i >= 4 && i < 9
    out.push({
      id: uid('ver'),
      assetId: a.id,
      assetTag: a.tag,
      assetName: a.name,
      officeId: a.officeId,
      dueDate: overdue ? daysAgoISO(int(1, 10)) : daysFromNowISO(int(0, 20)),
      status: overdue ? 'overdue' : done ? 'completed' : 'pending',
      priorCondition: a.condition === 'new' ? 'good' : a.condition,
      aiCondition: done ? a.condition : undefined,
      aiConfidence: done ? int(78, 96) : undefined,
      humanDecision: done ? pick(['accepted', 'accepted', 'accepted-remark', 'flag-repair']) : undefined,
      completedAt: done ? daysAgoISO(int(1, 20)) : undefined,
    })
  })
  return out
}

function makeNotifications(): Notification[] {
  const base: Omit<Notification, 'id' | 'timestamp'>[] = [
    { kind: 'verification', title: 'Verification overdue', body: '4 assets at Aster HQ are past their monthly check.', read: false, tone: 'warning' },
    { kind: 'movement', title: 'Movement awaiting approval', body: 'AST-LAP-0146 · Team relocation to South Tech Center.', read: false, tone: 'info' },
    { kind: 'seat', title: '5 seats freeing up soon', body: 'Employees on notice vacate within 30 days.', read: false, tone: 'info' },
    { kind: 'asset', title: 'Condition downgraded', body: 'AST-CHA-0151 marked Damaged after AI review.', read: true, tone: 'danger' },
    { kind: 'seat', title: 'New joiners awaiting seats', body: '6 new joiners not yet allocated a seat.', read: true, tone: 'warning' },
    { kind: 'movement', title: 'Asset received', body: 'AST-MON-0142 receipt-scanned at West Regional Office.', read: true, tone: 'success' },
    { kind: 'system', title: 'Monthly cycle generated', body: '16 verification tasks created for August.', read: true, tone: 'info' },
  ]
  return base.map((b, i) => ({ ...b, id: uid('ntf'), timestamp: daysAgoISO(i * 0.4 + rand()) }))
}

export function buildSeed(): SeedData {
  const employees = makeEmployees(208)
  const { seats, events } = buildSeatsAndAssign(employees)
  const assets = makeAssets(employees)
  const movements = makeMovements(assets)
  const verifications = makeVerifications(assets)
  const notifications = makeNotifications()
  return {
    offices: OFFICES,
    floors: FLOORS,
    departments: DEPARTMENTS,
    employees,
    seats,
    seatEvents: events,
    categories: CATEGORIES,
    assets,
    movements,
    verifications,
    notifications,
  }
}
