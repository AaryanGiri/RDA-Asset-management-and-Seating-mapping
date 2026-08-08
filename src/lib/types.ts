// ─────────────────────────────────────────────────────────────
// Locus domain model — shared master data across both modules
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

export interface Floor {
  id: string
  officeId: string
  name: string
  level: number
  plan: string // key identifying the SVG floor component
  seatCount: number
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

// ── Assets ──────────────────────────────────────────────────

export type AssetCondition = 'new' | 'good' | 'fair' | 'damaged' | 'beyond-repair'
export type AssetStatus = 'in-use' | 'in-transit' | 'under-repair' | 'in-storage' | 'disposed'

export interface AssetCategory {
  id: string
  name: string
  icon: string
  photoViews: string[] // required guided photo views
}

export interface AssetPhoto {
  id: string
  view: string
  hue: number // placeholder tint for the generated photo slot
  capturedAt: string
  note?: string
}

export interface AssetTimelineEvent {
  id: string
  type:
    | 'onboarded'
    | 'moved'
    | 'verified'
    | 'repair'
    | 'condition-change'
    | 'custodian-change'
    | 'flagged'
    | 'disposed'
  title: string
  detail: string
  actor: string
  timestamp: string
  condition?: AssetCondition
  ai?: boolean
}

export interface Asset {
  id: string
  tag: string // human asset ID / QR payload, e.g. LOC-MON-0142
  categoryId: string
  name: string
  brand: string
  model: string
  serialNumber: string
  purchaseDate: string
  purchaseValue: number
  supplier: string
  warrantyUntil: string
  officeId: string
  floorId: string
  room: string
  custodianId: string
  department: string
  condition: AssetCondition
  status: AssetStatus
  lastVerifiedAt?: string
  nextVerificationDue: string
  photos: AssetPhoto[]
  timeline: AssetTimelineEvent[]
  flagged?: string // exception note
}

export type MovementStage =
  | 'requested'
  | 'ai-review'
  | 'approved'
  | 'in-transit'
  | 'received'
  | 'rejected'

export interface MovementRequest {
  id: string
  assetId: string
  assetTag: string
  assetName: string
  fromOfficeId: string
  fromRoom: string
  toOfficeId: string
  toRoom: string
  reason: string
  requestedBy: string
  approver: string
  expectedDate: string
  stage: MovementStage
  aiCondition?: AssetCondition
  aiConfidence?: number
  humanCondition?: AssetCondition
  createdAt: string
  updatedAt: string
}

export interface VerificationTask {
  id: string
  assetId: string
  assetTag: string
  assetName: string
  officeId: string
  dueDate: string
  status: 'pending' | 'completed' | 'overdue'
  priorCondition: AssetCondition
  aiCondition?: AssetCondition
  aiConfidence?: number
  aiChangeArea?: { x: number; y: number; r: number }
  humanDecision?: 'accepted' | 'accepted-remark' | 'rejected' | 'reinspect' | 'flag-repair'
  completedAt?: string
}

export interface Notification {
  id: string
  kind: 'seat' | 'asset' | 'movement' | 'verification' | 'system'
  title: string
  body: string
  timestamp: string
  read: boolean
  tone: 'info' | 'success' | 'warning' | 'danger'
}
