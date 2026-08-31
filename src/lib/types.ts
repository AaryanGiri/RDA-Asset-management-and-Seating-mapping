// ─────────────────────────────────────────────────────────────
// Rodic AssetSpace domain model — shared master data across both modules
// Location hierarchy: Country → State → City → Office → Building → Floor → Zone → Seat
// ─────────────────────────────────────────────────────────────

export type SeatStatus =
  | 'vacant'
  | 'occupied'
  | 'notice'
  | 'maintenance'
  | 'blocked'

export type SeatType = 'workstation' | 'cabin' | 'meeting' | 'hotdesk' | 'phonebooth'

export interface Office {
  id: string
  name: string
  code: string
  city: string
  state: string
  country: string
  timezone: string
  isPilot: boolean
}

export interface FloorProperties {
  carpetArea?: number // sq ft
  superBuiltUpArea?: number // sq ft
  rentalCost?: number // INR / month
  maintenanceCharge?: number // INR / month
  overheadExpenses?: number // INR / month
  miscExpense?: number // INR / month
}

export interface Floor {
  id: string
  officeId: string
  name: string
  level: number
  plan: string // key identifying the SVG floor component
  seatCount: number
  properties?: FloorProperties
}

// ── Access roles ────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'employee'

// ── Seat change / swap requests (employee → admin approval) ──────────────────
export type SeatRequestType = 'change' | 'swap'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface SeatRequest {
  id: string
  type: SeatRequestType
  requesterId: string
  requesterName: string
  requesterCode: string
  currentSeatId?: string
  currentSeatNumber?: string
  requestedSeatId?: string // seat change target
  requestedSeatNumber?: string
  otherEmployeeId?: string // swap counterpart
  otherEmployeeName?: string
  otherSeatId?: string
  otherSeatNumber?: string
  reason: string
  remarks?: string
  requestDate: string
  status: RequestStatus
  decisionReason?: string
  decidedAt?: string
}

// ── Meeting rooms & bookings ─────────────────────────────────────────────────
export type MeetingRoomStatus = 'available' | 'booked' | 'in-use'

export interface MeetingRoom {
  id: string
  name: string // e.g. MR-01
  label: string // human name from the plan
  floorId: string
  capacity: number
  extension: string // telephone extension to reach the room directly
}

export interface MeetingBooking {
  id: string
  roomId: string
  roomName: string
  bookedById: string
  bookedByName: string
  title: string
  date: string // ISO date
  start: string // "10:00"
  end: string // "11:00"
  durationMins: number
  status: 'upcoming' | 'active' | 'done'
}

export interface Department {
  id: string
  name: string
  color: string
}

export interface Employee {
  id: string
  code: string
  fullName: string
  designation: string
  departmentId: string
  project: string
  reportingManager: string
  email: string
  phone: string
  joiningDate: string
  employmentStatus: 'active' | 'notice'
  lastWorkingDay?: string
  currentSeatId?: string
  officeId: string
  avatarHue: number
}

export interface Seat {
  id: string
  seatNumber: string
  officeId: string
  floorId: string
  zone: string
  seatType: SeatType
  x: number // normalized 0–1
  y: number // normalized 0–1
  status: SeatStatus
  employeeId?: string
  isActive: boolean
  remarks?: string
  allocationDate?: string
}

export interface SeatEvent {
  id: string
  seatId: string
  seatNumber: string
  type: 'allocated' | 'released' | 'moved-in' | 'moved-out' | 'blocked' | 'maintenance' | 'configured'
  employeeId?: string
  employeeName?: string
  reason: string
  effectiveDate: string
  actor: string
  timestamp: string
}

// ── Assets (Section 7 — a simple, traceable asset register) ──────────────────
// Three primary categories, each with admin-maintainable subcategories. Every
// asset carries assignment, a responsible person, status, remarks, images
// (deployment / current / defect) and a lifecycle trail — no QR, no complexity.

export type AssetPrimaryCategory = 'tangible' | 'intangible' | 'land-building'

export interface AssetCategory {
  id: AssetPrimaryCategory
  name: string
  subcategories: string[] // maintained by Admin
}

export type AssetStatus = 'in-use' | 'in-storage' | 'defective' | 'discarded'

export type AssetImageKind = 'deployment' | 'current' | 'defect'
export interface AssetImage {
  id: string
  kind: AssetImageKind
  src?: string // uploaded data URL, when a real image is attached
  hue: number // placeholder tint used when no file is attached
  capturedAt: string
  note?: string
}

export type AssetEventType =
  | 'deployed' | 'reassigned' | 'relocated' | 'image' | 'remark' | 'defective' | 'action' | 'discarded'

export interface AssetLifecycleEvent {
  id: string
  type: AssetEventType
  title: string
  detail: string
  actor: string
  timestamp: string
}

export interface Asset {
  id: string
  assetId: string // unique Asset ID, e.g. RDA-LAP-0142
  category: AssetPrimaryCategory
  subcategory: string
  name: string // name / description
  assignedEmployeeId?: string // person the asset is assigned to
  officeId: string // office / location
  location?: string // room / area within the office
  responsiblePerson: string
  status: AssetStatus
  remarks?: string
  deploymentDate: string
  images: AssetImage[] // deployment / current / defect
  actionTaken?: string // Admin decision for a defective asset
  lifecycle: AssetLifecycleEvent[]
}

export interface Notification {
  id: string
  kind: 'seat' | 'asset' | 'system'
  title: string
  body: string
  timestamp: string
  read: boolean
  tone: 'info' | 'success' | 'warning' | 'danger'
}
