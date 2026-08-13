import {
  FLOOR_GEOMETRY,
  generateFloorSeats,
} from '@/features/seating/floorplans'
import type {
  Asset,
  AssetCategory,
  AssetStatus,
  Department,
  Employee,
  Floor,
  MeetingBooking,
  MeetingRoom,
  Notification,
  Office,
  RequestStatus,
  Seat,
  SeatEvent,
  SeatRequest,
  SeatRequestType,
  SeatStatus,
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
  {
    id: 'f1', officeId: 'hq', name: 'Aga Khan Foundation · Office', level: 3, plan: 'f1', seatCount: 0,
    properties: { carpetArea: 18500, superBuiltUpArea: 24200, rentalCost: 2650000, maintenanceCharge: 385000, overheadExpenses: 240000, miscExpense: 65000 },
  },
  {
    id: 'f2', officeId: 'hq', name: 'YMCA Building · New Delhi', level: 1, plan: 'f2', seatCount: 0,
    properties: { carpetArea: 12400, superBuiltUpArea: 16100, rentalCost: 1720000, maintenanceCharge: 246000, overheadExpenses: 158000, miscExpense: 42000 },
  },
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
  notifications: Notification[]
  meetingRooms: MeetingRoom[]
  meetingBookings: MeetingBooking[]
  seatRequests: SeatRequest[]
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

// ── Assets (Section 7 — three primary categories + subcategories) ────────────
export const CATEGORIES: AssetCategory[] = [
  { id: 'tangible', name: 'Tangible Assets', subcategories: ['Laptop', 'Desktop', 'Monitor', 'Printer', 'Furniture', 'Networking', 'Projector', 'Mobile Phone'] },
  { id: 'intangible', name: 'Intangible Assets', subcategories: ['Software', 'License', 'Subscription', 'Domain', 'Cloud Service'] },
  { id: 'land-building', name: 'Land & Building', subcategories: ['Office Space', 'Building', 'Land', 'Parking'] },
]

const ASSET_NAMES: Record<string, string[]> = {
  Laptop: ['Dell Latitude 7440', 'MacBook Pro 14', 'Lenovo ThinkPad X1', 'HP EliteBook 840'],
  Desktop: ['Dell OptiPlex 7010', 'HP ProDesk 400', 'Lenovo ThinkCentre M70'],
  Monitor: ['Dell U2723QE 27"', 'LG 27UP850', 'Samsung ViewFinity S8'],
  Printer: ['HP LaserJet M479', 'Canon iR 2630', 'Epson WF-C5790'],
  Furniture: ['Herman Miller Aeron Chair', 'Steelcase Ology Desk', 'Godrej Storage Cabinet', 'Conference Table (8-seat)'],
  Networking: ['Cisco C9200-24 Switch', 'Aruba 2930F Switch', 'Fortinet FG-60F Firewall'],
  Projector: ['Epson EB-L200', 'BenQ LK936ST'],
  'Mobile Phone': ['iPhone 14', 'Samsung Galaxy S23'],
  Software: ['AutoCAD 2024', 'MS Office 365', 'Adobe Creative Cloud', 'Primavera P6'],
  License: ['Windows 11 Pro License', 'SQL Server License', 'Antivirus Enterprise'],
  Subscription: ['Zoom Enterprise', 'Slack Business+', 'GitHub Enterprise'],
  Domain: ['rodic.co domain', 'rda-platform.in domain'],
  'Cloud Service': ['AWS Reserved Instance', 'Azure Subscription'],
  'Office Space': ['3rd Floor Office — AKF', '1st Floor Office — YMCA'],
  Building: ['Aga Khan Foundation Wing', 'YMCA Building Block'],
  Land: ['Gurugram Plot A-258', 'Delhi Plot 12'],
  Parking: ['Basement Parking Bay', 'Surface Parking Lot'],
}
const RESPONSIBLE = ['A. Menon (Admin)', 'S. Fernandes (Facilities)', 'R. Kapoor (IT)', 'N. Sinha (Admin)', 'P. Chandra (Facilities)']
const DEFECT_REMARKS = ['Screen flickering — proposed for disposal', 'Hinge broken, not repairable', 'Motor failure — beyond economic repair', 'Water damage after ceiling leak', 'Battery swollen — safety risk']
const OK_REMARKS = ['In good working condition', 'Warranty active', 'Recently serviced', 'No issues reported']
const ROOMS_F1 = ['Tech Innovation', 'CMD Room', 'Meeting Room 1', 'Audio Visual Room', 'Cafe', 'Pantry', 'Store', 'Reception']
const ROOMS_F2 = ['Conference Room', 'Server Room', 'Meeting Room', 'CEO Cabin', 'Director Cabin', 'R.Innovation Hub', 'Pantry', 'Reception']
const officeNm = (id: string) => OFFICES.find((o) => o.id === id)?.name ?? id

function makeAssets(employees: Employee[]): Asset[] {
  const out: Asset[] = []
  const active = employees.filter((e) => e.employmentStatus === 'active')
  const total = 44
  let n = 140
  for (let i = 0; i < total; i++) {
    const cat = i < 30 ? CATEGORIES[0] : i < 40 ? CATEGORIES[1] : CATEGORIES[2]
    const subcategory = pick(cat.subcategories)
    const name = pick(ASSET_NAMES[subcategory] ?? [subcategory])
    const isProperty = cat.id === 'land-building'
    const assignedEmployee = isProperty ? undefined : pick(active)
    const officeId = chance(0.8) ? 'hq' : pick(['mum', 'blr'])
    const floorId = chance(0.6) ? 'f1' : 'f2'
    const location = isProperty ? 'Whole floor' : floorId === 'f1' ? pick(ROOMS_F1) : pick(ROOMS_F2)
    const responsiblePerson = pick(RESPONSIBLE)
    const deployDaysAgo = int(60, 1500)
    const roll = rand()
    let status: AssetStatus = roll < 0.68 ? 'in-use' : roll < 0.82 ? 'in-storage' : roll < 0.94 ? 'defective' : 'discarded'
    if (isProperty) status = 'in-use'
    const code = (subcategory.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'AST').toUpperCase()
    const assetId = `RDA-${code}-${(n++).toString().padStart(4, '0')}`

    const images: Asset['images'] = [
      { id: uid('img'), kind: 'deployment', hue: (i * 47) % 360, capturedAt: daysAgoISO(deployDaysAgo - 1), note: 'Condition at deployment' },
    ]
    if (chance(0.4) && !isProperty) images.push({ id: uid('img'), kind: 'current', hue: (i * 47 + 120) % 360, capturedAt: daysAgoISO(int(5, 40)), note: 'Latest condition' })

    const lifecycle: Asset['lifecycle'] = [
      { id: uid('al'), type: 'deployed', title: 'Asset deployed', detail: isProperty ? `Recorded under ${officeNm(officeId)}` : `Assigned to ${assignedEmployee?.fullName}`, actor: 'A. Menon (Admin)', timestamp: daysAgoISO(deployDaysAgo) },
    ]
    if (chance(0.35) && !isProperty) lifecycle.push({ id: uid('al'), type: 'relocated', title: 'Relocated', detail: `Moved to ${location}`, actor: responsiblePerson, timestamp: daysAgoISO(int(30, deployDaysAgo - 5)) })

    let remarks: string | undefined
    let actionTaken: string | undefined
    if (status === 'defective') {
      remarks = pick(DEFECT_REMARKS)
      images.push({ id: uid('img'), kind: 'defect', hue: 12, capturedAt: daysAgoISO(int(1, 15)), note: 'Damage / defect' })
      lifecycle.push({ id: uid('al'), type: 'defective', title: 'Flagged defective', detail: remarks, actor: responsiblePerson, timestamp: daysAgoISO(int(1, 12)) })
    } else if (status === 'discarded') {
      remarks = pick(DEFECT_REMARKS)
      images.push({ id: uid('img'), kind: 'defect', hue: 12, capturedAt: daysAgoISO(int(20, 60)), note: 'Condition before disposal' })
      actionTaken = 'Approved for disposal'
      lifecycle.push({ id: uid('al'), type: 'defective', title: 'Flagged defective', detail: remarks, actor: responsiblePerson, timestamp: daysAgoISO(int(40, 80)) })
      lifecycle.push({ id: uid('al'), type: 'action', title: 'Admin action', detail: 'Reviewed image & remarks — approved for disposal', actor: 'A. Menon (Admin)', timestamp: daysAgoISO(int(20, 39)) })
      lifecycle.push({ id: uid('al'), type: 'discarded', title: 'Discarded', detail: 'Removed from the active register', actor: 'A. Menon (Admin)', timestamp: daysAgoISO(int(1, 19)) })
    } else if (chance(0.35)) {
      remarks = pick(OK_REMARKS)
    }

    lifecycle.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
    out.push({
      id: uid('ast'), assetId, category: cat.id, subcategory, name,
      assignedEmployeeId: assignedEmployee?.id, officeId, location, responsiblePerson,
      status, remarks, deploymentDate: daysAgoISO(deployDaysAgo), images, actionTaken, lifecycle,
    })
  }
  return out
}

function makeNotifications(): Notification[] {
  const base: Omit<Notification, 'id' | 'timestamp'>[] = [
    { kind: 'asset', title: 'Asset flagged defective', body: 'RDA-LAP-0146 reported defective — image & remarks awaiting Admin review.', read: false, tone: 'warning' },
    { kind: 'seat', title: '5 seats freeing up soon', body: 'Employees on notice vacate within 30 days.', read: false, tone: 'info' },
    { kind: 'asset', title: 'Asset deployed', body: 'RDA-MON-0142 assigned and deployment image captured.', read: true, tone: 'success' },
    { kind: 'seat', title: 'New joiners awaiting seats', body: '6 new joiners not yet allocated a seat.', read: true, tone: 'warning' },
    { kind: 'asset', title: 'Disposal approved', body: 'RDA-CHA-0151 approved for disposal after Admin review.', read: true, tone: 'info' },
    { kind: 'system', title: 'Asset register updated', body: '44 assets tracked across three categories.', read: true, tone: 'info' },
  ]
  return base.map((b, i) => ({ ...b, id: uid('ntf'), timestamp: daysAgoISO(i * 0.4 + rand()) }))
}

// ── Meeting rooms + bookings ─────────────────────────────────────────────────
function makeMeetingRooms(): MeetingRoom[] {
  const out: MeetingRoom[] = []
  let n = 1
  for (const floorId of ['f1', 'f2']) {
    const geo = FLOOR_GEOMETRY[floorId]
    const rooms = (geo.fixedRooms ?? []).filter((r) => r.kind === 'meeting')
    for (const r of rooms) {
      out.push({
        id: `mr_${n}`,
        name: `MR-${n.toString().padStart(2, '0')}`,
        label: r.label.replace(/\b(\w)(\w*)/g, (_, a, b) => a + b.toLowerCase()),
        floorId,
        capacity: pick([4, 6, 6, 8, 10, 12]),
      })
      n++
    }
  }
  return out
}

const MEETING_TITLES = ['Project Sync', 'Design Review', 'Client Call', 'Sprint Planning', 'Interview', '1:1', 'Leadership Review', 'Vendor Meeting', 'Standup', 'Budget Review']
const TIME_SLOTS: [string, string, number][] = [
  ['09:00', '09:30', 30], ['10:00', '11:00', 60], ['11:30', '12:30', 60],
  ['14:00', '15:00', 60], ['15:30', '16:30', 60], ['16:00', '16:30', 30], ['17:00', '18:00', 60],
]

function makeMeetingBookings(rooms: MeetingRoom[], employees: Employee[]): MeetingBooking[] {
  const out: MeetingBooking[] = []
  const active = employees.filter((e) => e.employmentStatus === 'active')
  let id = 1
  rooms.forEach((room, ri) => {
    // 3–5 bookings per room across the last week + today + next few days
    const count = int(3, 5)
    for (let i = 0; i < count; i++) {
      const emp = pick(active)
      const [start, end, dur] = TIME_SLOTS[(ri + i) % TIME_SLOTS.length]
      // spread: some past (done), one today (active/booked), some future (upcoming)
      let dayOffset: number
      let status: MeetingBooking['status']
      if (i === 0 && ri % 3 === 0) { dayOffset = 0; status = 'active' }
      else if (i === 0) { dayOffset = 0; status = 'upcoming' }
      else if (i <= 2) { dayOffset = int(1, 6); status = 'upcoming' }
      else { dayOffset = -int(1, 6); status = 'done' }
      const date = dayOffset >= 0 ? daysFromNowISO(dayOffset) : daysAgoISO(-dayOffset)
      out.push({
        id: `bk_${id++}`,
        roomId: room.id,
        roomName: room.name,
        bookedById: emp.id,
        bookedByName: emp.fullName,
        title: pick(MEETING_TITLES),
        date,
        start,
        end,
        durationMins: dur,
        status,
      })
    }
  })
  return out
}

// ── Sample seat change / swap requests for the Admin inbox ───────────────────
function makeSeatRequests(employees: Employee[], seats: Seat[]): SeatRequest[] {
  const seated = employees.filter((e) => e.currentSeatId)
  const seatById = new Map(seats.map((s) => [s.id, s]))
  const vacant = seats.filter((s) => s.status === 'vacant')
  const out: SeatRequest[] = []
  const reasonsChange = ['Prefer a quieter zone', 'Closer to my team', 'Near a window', 'Ergonomic needs', 'Team reshuffle']
  const reasonsSwap = ['Sit with my project team', 'Mutually agreed swap', 'Closer to manager']

  // 2 pending change, 1 pending swap, 1 approved, 1 rejected
  const plan: { type: SeatRequestType; status: RequestStatus }[] = [
    { type: 'change', status: 'pending' },
    { type: 'change', status: 'pending' },
    { type: 'swap', status: 'pending' },
    { type: 'change', status: 'approved' },
    { type: 'swap', status: 'rejected' },
  ]
  let vi = 0
  plan.forEach((p, i) => {
    const requester = seated[(i * 7 + 3) % seated.length]
    const cur = requester.currentSeatId ? seatById.get(requester.currentSeatId) : undefined
    const base: SeatRequest = {
      id: uid('req'),
      type: p.type,
      requesterId: requester.id,
      requesterName: requester.fullName,
      requesterCode: requester.code,
      currentSeatId: cur?.id,
      currentSeatNumber: cur?.seatNumber,
      reason: p.type === 'swap' ? pick(reasonsSwap) : pick(reasonsChange),
      requestDate: daysAgoISO(int(0, 6)),
      status: p.status,
      decisionReason: p.status === 'rejected' ? 'Requested seat reserved for an incoming team.' : undefined,
      decidedAt: p.status !== 'pending' ? daysAgoISO(int(0, 3)) : undefined,
    }
    if (p.type === 'change') {
      const target = vacant[(vi++) % vacant.length]
      base.requestedSeatId = target?.id
      base.requestedSeatNumber = target?.seatNumber
    } else {
      const other = seated[(i * 11 + 9) % seated.length]
      const otherSeat = other.currentSeatId ? seatById.get(other.currentSeatId) : undefined
      base.otherEmployeeId = other.id
      base.otherEmployeeName = other.fullName
      base.otherSeatId = otherSeat?.id
      base.otherSeatNumber = otherSeat?.seatNumber
    }
    out.push(base)
  })
  return out
}

export function buildSeed(): SeedData {
  const employees = makeEmployees(208)
  const { seats, events } = buildSeatsAndAssign(employees)
  const assets = makeAssets(employees)
  const notifications = makeNotifications()
  const meetingRooms = makeMeetingRooms()
  const meetingBookings = makeMeetingBookings(meetingRooms, employees)
  const seatRequests = makeSeatRequests(employees, seats)
  return {
    offices: OFFICES,
    floors: FLOORS,
    departments: DEPARTMENTS,
    employees,
    seats,
    seatEvents: events,
    categories: CATEGORIES,
    assets,
    notifications,
    meetingRooms,
    meetingBookings,
    seatRequests,
  }
}
