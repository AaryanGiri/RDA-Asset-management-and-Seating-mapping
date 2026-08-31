import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeed } from './seed'
import { FLOOR_GEOMETRY, generateFloorSeats } from '@/features/seating/floorplans'
import type { RoomShape } from '@/features/seating/floorplans'
import {
  buildFloorPlans,
  blankFloorPlan,
  geometryToPlan,
  type FloorPlan,
  type Wall,
  type Door,
  type FurnitureItem,
} from '@/features/seating/layout'
import type { Floor, FloorProperties, Office, UserRole } from './types'
import type {
  Asset,
  AssetImageKind,
  AssetPrimaryCategory,
  AssetRequest,
  AssetRequestType,
  PcAction,
  Employee,
  MeetingBooking,
  MeetingRoom,
  MeetingRoomStatus,
  Notification,
  Seat,
  SeatEvent,
  SeatRequest,
  SeatType,
} from './types'
import { latency, uid, daysAgoISO, daysFromNowISO } from './utils'

const seed = buildSeed()

// shared helper: immutably replace one floor plan in the map
function mutatePlan(
  set: (fn: (s: { floorPlans: Record<string, FloorPlan> }) => Partial<{ floorPlans: Record<string, FloorPlan> }>) => void,
  floorId: string,
  fn: (p: FloorPlan) => FloorPlan,
) {
  set((s) => {
    const plan = s.floorPlans[floorId]
    if (!plan) return {}
    return { floorPlans: { ...s.floorPlans, [floorId]: fn(plan) } }
  })
}

interface DataState {
  offices: typeof seed.offices
  floors: typeof seed.floors
  departments: typeof seed.departments
  employees: Employee[]
  seats: Seat[]
  seatEvents: SeatEvent[]
  categories: typeof seed.categories
  assets: Asset[]
  notifications: Notification[]
  floorPlans: Record<string, FloorPlan>
  meetingRooms: MeetingRoom[]
  meetingBookings: MeetingBooking[]
  seatRequests: SeatRequest[]
  assetRequests: AssetRequest[]

  // access / persona (front-end only)
  role: UserRole
  personaId: string
  setRole: (role: UserRole) => void
  setPersona: (employeeId: string) => void

  // floor properties (financials + area) — admin
  updateFloorProperties: (floorId: string, patch: Partial<FloorProperties>) => void

  // seat change / swap requests
  createSeatChangeRequest: (input: { requesterId: string; requestedSeatId: string; reason: string; remarks?: string }) => Promise<void>
  createSeatSwapRequest: (input: { requesterId: string; otherEmployeeId: string; reason: string; remarks?: string }) => Promise<void>
  approveSeatRequest: (id: string) => Promise<void>
  rejectSeatRequest: (id: string, reason: string) => Promise<void>

  // meeting rooms
  bookMeetingRoom: (input: { roomId: string; bookedById: string; title: string; date: string; start: string; end: string }) => Promise<void>
  confirmMeetingUse: (bookingId: string) => void
  releaseMeetingRoom: (bookingId: string) => void

  // seating actions
  allocateSeat: (seatId: string, employeeId: string, reason: string, effectiveDate: string, type: string) => Promise<void>
  releaseSeat: (seatId: string, reason: string, effectiveDate: string) => Promise<void>
  moveSeat: (fromSeatId: string, toSeatId: string, reason: string, effectiveDate: string) => Promise<void>
  setSeatMaintenance: (seatId: string, on: boolean, reason: string) => Promise<void>
  blockSeat: (seatId: string, on: boolean, reason: string) => Promise<void>

  // layout-editor actions (front-end only; persisted with the rest of the data)
  setSeatPosition: (seatId: string, x: number, y: number) => void
  addSeat: (floorId: string, x: number, y: number, seatType?: SeatType) => string
  removeSeat: (seatId: string) => void
  updateSeatMeta: (seatId: string, patch: Pick<Partial<Seat>, 'seatNumber' | 'zone' | 'seatType'>) => void
  resetFloorLayout: (floorId: string) => void

  // floor-plan editor (rooms / walls / doors / furniture) — front-end only
  addRoom: (floorId: string, room: Omit<RoomShape, 'id'>) => string
  updateRoom: (floorId: string, roomId: string, patch: Partial<RoomShape>) => void
  removeRoom: (floorId: string, roomId: string) => void
  addWall: (floorId: string, wall: Omit<Wall, 'id'>) => string
  updateWall: (floorId: string, wallId: string, patch: Partial<Wall>) => void
  removeWall: (floorId: string, wallId: string) => void
  addDoor: (floorId: string, door: Omit<Door, 'id'>) => string
  updateDoor: (floorId: string, doorId: string, patch: Partial<Door>) => void
  removeDoor: (floorId: string, doorId: string) => void
  addFurniture: (floorId: string, item: Omit<FurnitureItem, 'id'>) => string
  updateFurniture: (floorId: string, itemId: string, patch: Partial<FurnitureItem>) => void
  removeFurniture: (floorId: string, itemId: string) => void
  setFloorScale: (floorId: string, pxPerFoot: number) => void
  updateFloorPlanMeta: (floorId: string, patch: Partial<Pick<FloorPlan, 'name' | 'vbw' | 'vbh'>>) => void
  resetFloorPlan: (floorId: string) => void

  // from-scratch builder
  createOffice: (o: Omit<Office, 'id' | 'isPilot'>) => string
  createFloor: (officeId: string, opts: { name: string; widthFt: number; heightFt: number; pxPerFoot: number; level?: number }) => string
  removeFloor: (floorId: string) => void

  // asset actions (Section 7)
  updateAsset: (id: string, patch: Partial<Asset>) => void
  assignAsset: (id: string, employeeId: string, location?: string) => Promise<void>
  addAssetImage: (id: string, kind: AssetImageKind, src?: string, note?: string) => void
  addAssetRemark: (id: string, remarks: string) => void
  flagDefective: (id: string, remarks: string, imageSrc?: string) => Promise<void>
  takeAssetAction: (id: string, action: 'discard' | 'store' | 'use', note?: string) => Promise<void>
  addSubcategory: (categoryId: AssetPrimaryCategory, sub: string) => void
  removeSubcategory: (categoryId: AssetPrimaryCategory, sub: string) => void
  addAsset: (input: {
    assetId: string; category: AssetPrimaryCategory; subcategory: string; name: string
    assignedEmployeeId?: string; officeId: string; location?: string; responsiblePerson: string
    remarks?: string; deploymentImage?: string
  }) => string

  // asset request / action workflow (Section 11.7 — OM → PC → Admin)
  raiseAssetRequest: (input: {
    type: AssetRequestType; reason: string; remarks?: string; raisedBy?: string; imageHue?: number
    category?: AssetPrimaryCategory; subcategory?: string; name?: string; officeId?: string
    assetRef?: string; assetCode?: string
  }) => string
  pcReviewAssetRequest: (id: string, recommendation: string, action: PcAction, pcBy?: string) => void
  adminDecideAssetRequest: (id: string, decision: 'approved' | 'rejected', note?: string, adminBy?: string) => Promise<void>

  // notifications
  markNotificationRead: (id: string) => void
  markAllRead: () => void
  pushNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void

  resetDemo: () => void
}

const actorName = 'A. Menon (Admin)'

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...seed,
      floorPlans: buildFloorPlans(),
      role: 'admin' as UserRole,
      personaId: seed.employees.find((e) => e.currentSeatId && e.employmentStatus === 'active')?.id ?? seed.employees[0].id,

      setRole: (role) => set({ role }),
      setPersona: (employeeId) => set({ personaId: employeeId }),

      updateFloorProperties: (floorId, patch) =>
        set((s) => ({ floors: s.floors.map((f) => (f.id === floorId ? { ...f, properties: { ...f.properties, ...patch } } : f)) })),

      createSeatChangeRequest: async ({ requesterId, requestedSeatId, reason, remarks }) => {
        await latency()
        const emp = get().employees.find((e) => e.id === requesterId)
        const cur = get().seats.find((s) => s.id === emp?.currentSeatId)
        const target = get().seats.find((s) => s.id === requestedSeatId)
        const req: SeatRequest = {
          id: uid('req'), type: 'change', requesterId, requesterName: emp?.fullName ?? '', requesterCode: emp?.code ?? '',
          currentSeatId: cur?.id, currentSeatNumber: cur?.seatNumber, requestedSeatId, requestedSeatNumber: target?.seatNumber,
          reason, remarks, requestDate: new Date().toISOString(), status: 'pending',
        }
        set((s) => ({ seatRequests: [req, ...s.seatRequests] }))
        get().pushNotification({ kind: 'seat', tone: 'info', title: 'Seat change request received', body: `${emp?.fullName} · ${cur?.seatNumber ?? '—'} → ${target?.seatNumber}. Admin notified by email.` })
      },

      createSeatSwapRequest: async ({ requesterId, otherEmployeeId, reason, remarks }) => {
        await latency()
        const emp = get().employees.find((e) => e.id === requesterId)
        const other = get().employees.find((e) => e.id === otherEmployeeId)
        const cur = get().seats.find((s) => s.id === emp?.currentSeatId)
        const otherSeat = get().seats.find((s) => s.id === other?.currentSeatId)
        const req: SeatRequest = {
          id: uid('req'), type: 'swap', requesterId, requesterName: emp?.fullName ?? '', requesterCode: emp?.code ?? '',
          currentSeatId: cur?.id, currentSeatNumber: cur?.seatNumber,
          otherEmployeeId, otherEmployeeName: other?.fullName, otherSeatId: otherSeat?.id, otherSeatNumber: otherSeat?.seatNumber,
          reason, remarks, requestDate: new Date().toISOString(), status: 'pending',
        }
        set((s) => ({ seatRequests: [req, ...s.seatRequests] }))
        get().pushNotification({ kind: 'seat', tone: 'info', title: 'Seat swap request received', body: `${emp?.fullName} (${cur?.seatNumber}) ↔ ${other?.fullName} (${otherSeat?.seatNumber}). Admin notified by email.` })
      },

      approveSeatRequest: async (id) => {
        await latency()
        const req = get().seatRequests.find((r) => r.id === id)
        if (!req) return
        const now = new Date().toISOString()
        const evs: SeatEvent[] = []
        const mk = (seatId: string, seatNumber: string, type: SeatEvent['type'], employeeId?: string, employeeName?: string): SeatEvent => ({
          id: uid('sev'), seatId, seatNumber, type, employeeId, employeeName, reason: `Request ${req.id} approved`, effectiveDate: now, actor: actorName, timestamp: now,
        })
        if (req.type === 'change' && req.requestedSeatId) {
          set((s) => ({
            seats: s.seats.map((seat) => {
              if (seat.id === req.currentSeatId) return { ...seat, status: 'vacant', employeeId: undefined, allocationDate: undefined }
              if (seat.id === req.requestedSeatId) return { ...seat, status: 'occupied', employeeId: req.requesterId, allocationDate: now }
              return seat
            }),
            employees: s.employees.map((e) => (e.id === req.requesterId ? { ...e, currentSeatId: req.requestedSeatId } : e)),
          }))
          if (req.currentSeatId && req.currentSeatNumber) evs.push(mk(req.currentSeatId, req.currentSeatNumber, 'moved-out', req.requesterId, req.requesterName))
          if (req.requestedSeatNumber) evs.push(mk(req.requestedSeatId, req.requestedSeatNumber, 'moved-in', req.requesterId, req.requesterName))
        } else if (req.type === 'swap' && req.currentSeatId && req.otherSeatId && req.otherEmployeeId) {
          set((s) => ({
            seats: s.seats.map((seat) => {
              if (seat.id === req.currentSeatId) return { ...seat, employeeId: req.otherEmployeeId, allocationDate: now }
              if (seat.id === req.otherSeatId) return { ...seat, employeeId: req.requesterId, allocationDate: now }
              return seat
            }),
            employees: s.employees.map((e) => {
              if (e.id === req.requesterId) return { ...e, currentSeatId: req.otherSeatId }
              if (e.id === req.otherEmployeeId) return { ...e, currentSeatId: req.currentSeatId }
              return e
            }),
          }))
          if (req.currentSeatNumber) evs.push(mk(req.currentSeatId, req.currentSeatNumber, 'moved-in', req.otherEmployeeId, req.otherEmployeeName))
          if (req.otherSeatNumber) evs.push(mk(req.otherSeatId, req.otherSeatNumber, 'moved-in', req.requesterId, req.requesterName))
        }
        set((s) => ({
          seatRequests: s.seatRequests.map((r) => (r.id === id ? { ...r, status: 'approved', decidedAt: now } : r)),
          seatEvents: [...evs, ...s.seatEvents],
        }))
        get().pushNotification({ kind: 'seat', tone: 'success', title: 'Request approved', body: `${req.requesterName}'s ${req.type} request approved — seat map updated. Employee notified.` })
      },

      rejectSeatRequest: async (id, reason) => {
        await latency()
        const req = get().seatRequests.find((r) => r.id === id)
        set((s) => ({ seatRequests: s.seatRequests.map((r) => (r.id === id ? { ...r, status: 'rejected', decisionReason: reason, decidedAt: new Date().toISOString() } : r)) }))
        get().pushNotification({ kind: 'seat', tone: 'warning', title: 'Request rejected', body: `${req?.requesterName}'s request was rejected. Employee notified.` })
      },

      bookMeetingRoom: async ({ roomId, bookedById, title, date, start, end }) => {
        await latency()
        const room = get().meetingRooms.find((r) => r.id === roomId)
        const emp = get().employees.find((e) => e.id === bookedById)
        const [sh, sm] = start.split(':').map(Number)
        const [eh, em] = end.split(':').map(Number)
        const durationMins = Math.max(15, eh * 60 + em - (sh * 60 + sm))
        const bk: MeetingBooking = {
          id: uid('bk'), roomId, roomName: room?.name ?? '', bookedById, bookedByName: emp?.fullName ?? '',
          title: title || 'Meeting', date, start, end, durationMins, status: 'upcoming',
        }
        set((s) => ({ meetingBookings: [bk, ...s.meetingBookings] }))
        get().pushNotification({ kind: 'system', tone: 'success', title: 'Meeting room booked', body: `${room?.name} · ${start}–${end} · ${bk.title}.` })
      },

      confirmMeetingUse: (bookingId) => {
        const bk = get().meetingBookings.find((b) => b.id === bookingId)
        get().pushNotification({ kind: 'system', tone: 'info', title: 'Booking confirmed', body: `${bk?.roomName} kept active for the remaining period.` })
      },

      releaseMeetingRoom: (bookingId) => {
        const bk = get().meetingBookings.find((b) => b.id === bookingId)
        set((s) => ({ meetingBookings: s.meetingBookings.map((b) => (b.id === bookingId ? { ...b, status: 'done' } : b)) }))
        get().pushNotification({ kind: 'system', tone: 'success', title: 'Meeting room freed', body: `${bk?.roomName} is now available for others.` })
      },

      allocateSeat: async (seatId, employeeId, reason, effectiveDate, type) => {
        await latency()
        const emp = get().employees.find((e) => e.id === employeeId)
        set((s) => ({
          seats: s.seats.map((seat) =>
            seat.id === seatId
              ? { ...seat, status: 'occupied', employeeId, allocationDate: effectiveDate, remarks: undefined }
              : seat,
          ),
          employees: s.employees.map((e) => (e.id === employeeId ? { ...e, currentSeatId: seatId } : e)),
          seatEvents: [
            {
              id: uid('sev'), seatId, seatNumber: s.seats.find((x) => x.id === seatId)?.seatNumber ?? '',
              type: 'allocated', employeeId, employeeName: emp?.fullName, reason,
              effectiveDate, actor: actorName, timestamp: new Date().toISOString(),
            },
            ...s.seatEvents,
          ],
        }))
        get().pushNotification({ kind: 'seat', tone: 'success', title: 'Seat allocated', body: `${emp?.fullName} assigned to a seat (${type}).` })
      },

      releaseSeat: async (seatId, reason, effectiveDate) => {
        await latency()
        const seat = get().seats.find((s) => s.id === seatId)
        const emp = get().employees.find((e) => e.id === seat?.employeeId)
        set((s) => ({
          seats: s.seats.map((x) => (x.id === seatId ? { ...x, status: 'vacant', employeeId: undefined, allocationDate: undefined } : x)),
          employees: s.employees.map((e) => (e.id === seat?.employeeId ? { ...e, currentSeatId: undefined } : e)),
          seatEvents: [
            {
              id: uid('sev'), seatId, seatNumber: seat?.seatNumber ?? '', type: 'released',
              employeeId: emp?.id, employeeName: emp?.fullName, reason, effectiveDate,
              actor: actorName, timestamp: new Date().toISOString(),
            },
            ...s.seatEvents,
          ],
        }))
        get().pushNotification({ kind: 'seat', tone: 'info', title: 'Seat released', body: `${seat?.seatNumber} is now vacant.` })
      },

      moveSeat: async (fromSeatId, toSeatId, reason, effectiveDate) => {
        await latency()
        const from = get().seats.find((s) => s.id === fromSeatId)
        const emp = get().employees.find((e) => e.id === from?.employeeId)
        const to = get().seats.find((s) => s.id === toSeatId)
        if (!from || !emp || !to) return
        set((s) => ({
          seats: s.seats.map((x) => {
            if (x.id === fromSeatId) return { ...x, status: 'vacant', employeeId: undefined, allocationDate: undefined }
            if (x.id === toSeatId) return { ...x, status: 'occupied', employeeId: emp.id, allocationDate: effectiveDate }
            return x
          }),
          employees: s.employees.map((e) => (e.id === emp.id ? { ...e, currentSeatId: toSeatId } : e)),
          seatEvents: [
            { id: uid('sev'), seatId: toSeatId, seatNumber: to.seatNumber, type: 'moved-in', employeeId: emp.id, employeeName: emp.fullName, reason, effectiveDate, actor: actorName, timestamp: new Date().toISOString() },
            { id: uid('sev'), seatId: fromSeatId, seatNumber: from.seatNumber, type: 'moved-out', employeeId: emp.id, employeeName: emp.fullName, reason, effectiveDate, actor: actorName, timestamp: new Date().toISOString() },
            ...s.seatEvents,
          ],
        }))
        get().pushNotification({ kind: 'seat', tone: 'success', title: 'Seat changed', body: `${emp.fullName} moved ${from.seatNumber} → ${to.seatNumber}.` })
      },

      setSeatMaintenance: async (seatId, on, reason) => {
        await latency(160, 360)
        const seat = get().seats.find((s) => s.id === seatId)
        set((s) => ({
          seats: s.seats.map((x) => (x.id === seatId ? { ...x, status: on ? 'maintenance' : 'vacant', remarks: on ? reason : undefined } : x)),
          seatEvents: on
            ? [{ id: uid('sev'), seatId, seatNumber: seat?.seatNumber ?? '', type: 'maintenance', reason, effectiveDate: new Date().toISOString(), actor: actorName, timestamp: new Date().toISOString() }, ...s.seatEvents]
            : s.seatEvents,
        }))
      },

      blockSeat: async (seatId, on, reason) => {
        await latency(160, 360)
        const seat = get().seats.find((s) => s.id === seatId)
        set((s) => ({
          seats: s.seats.map((x) => (x.id === seatId ? { ...x, status: on ? 'blocked' : 'vacant', remarks: on ? reason : undefined } : x)),
          seatEvents: on
            ? [{ id: uid('sev'), seatId, seatNumber: seat?.seatNumber ?? '', type: 'blocked', reason, effectiveDate: new Date().toISOString(), actor: actorName, timestamp: new Date().toISOString() }, ...s.seatEvents]
            : s.seatEvents,
        }))
      },

      // ── layout editor (front-end only) ─────────────────────────────────────
      // Seats live in the persisted store, so repositioning / adding / removing
      // them here survives reloads without any backend.
      setSeatPosition: (seatId, x, y) => {
        const cx = Math.min(1, Math.max(0, x))
        const cy = Math.min(1, Math.max(0, y))
        set((s) => ({ seats: s.seats.map((seat) => (seat.id === seatId ? { ...seat, x: cx, y: cy } : seat)) }))
      },

      addSeat: (floorId, x, y, seatType = 'workstation') => {
        const id = uid('seat')
        set((s) => {
          const floorSeats = s.seats.filter((seat) => seat.floorId === floorId)
          const base = floorSeats.find((seat) => seat.seatType === seatType) ?? floorSeats[0]
          const prefix = base ? (/^([A-Za-z]*)/.exec(base.seatNumber)?.[1] || 'S') : 'S'
          let maxN = 0
          for (const seat of floorSeats) {
            const m = new RegExp(`^${prefix}(\\d+)$`).exec(seat.seatNumber)
            if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
          }
          const seat: Seat = {
            id, seatNumber: `${prefix}${maxN + 1}`, officeId: base?.officeId ?? 'hq', floorId,
            zone: base?.zone ?? 'New Zone', seatType,
            x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)),
            status: 'vacant', isActive: true,
          }
          return { seats: [...s.seats, seat] }
        })
        return id
      },

      removeSeat: (seatId) => {
        set((s) => {
          const seat = s.seats.find((x) => x.id === seatId)
          return {
            seats: s.seats.filter((x) => x.id !== seatId),
            employees: seat?.employeeId
              ? s.employees.map((e) => (e.id === seat.employeeId ? { ...e, currentSeatId: undefined } : e))
              : s.employees,
          }
        })
      },

      updateSeatMeta: (seatId, patch) => {
        set((s) => ({ seats: s.seats.map((seat) => (seat.id === seatId ? { ...seat, ...patch } : seat)) }))
      },

      resetFloorLayout: (floorId) => {
        const geo = FLOOR_GEOMETRY[floorId]
        if (!geo) return
        const gen = generateFloorSeats(geo)
        set((s) => {
          const genNums = new Set(gen.map((g) => g.seatNumber))
          const onFloor = s.seats.filter((x) => x.floorId === floorId)
          const byNum = new Map(onFloor.map((x) => [x.seatNumber, x]))
          // employees seated on this floor whose seat won't survive the reset
          const orphaned = new Set(
            onFloor.filter((x) => x.employeeId && !genNums.has(x.seatNumber)).map((x) => x.employeeId as string),
          )
          const rebuilt: Seat[] = gen.map((g) => {
            const prev = byNum.get(g.seatNumber)
            if (prev) return { ...prev, x: g.x, y: g.y, zone: g.zone, seatType: g.seatType }
            return {
              id: uid('seat'), seatNumber: g.seatNumber, officeId: 'hq', floorId,
              zone: g.zone, seatType: g.seatType, x: g.x, y: g.y, status: 'vacant', isActive: true,
            }
          })
          return {
            seats: [...s.seats.filter((x) => x.floorId !== floorId), ...rebuilt],
            employees: orphaned.size
              ? s.employees.map((e) => (orphaned.has(e.id) ? { ...e, currentSeatId: undefined } : e))
              : s.employees,
          }
        })
      },

      // ── floor-plan editor (rooms / walls / doors / furniture) ───────────────
      addRoom: (floorId, room) => {
        const id = uid('room')
        mutatePlan(set, floorId, (p) => ({ ...p, rooms: [...p.rooms, { ...room, id }] }))
        return id
      },
      updateRoom: (floorId, roomId, patch) =>
        mutatePlan(set, floorId, (p) => ({ ...p, rooms: p.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)) })),
      removeRoom: (floorId, roomId) =>
        mutatePlan(set, floorId, (p) => ({ ...p, rooms: p.rooms.filter((r) => r.id !== roomId) })),

      addWall: (floorId, wall) => {
        const id = uid('wall')
        mutatePlan(set, floorId, (p) => ({ ...p, walls: [...p.walls, { ...wall, id }] }))
        return id
      },
      updateWall: (floorId, wallId, patch) =>
        mutatePlan(set, floorId, (p) => ({ ...p, walls: p.walls.map((w) => (w.id === wallId ? { ...w, ...patch } : w)) })),
      removeWall: (floorId, wallId) =>
        mutatePlan(set, floorId, (p) => ({ ...p, walls: p.walls.filter((w) => w.id !== wallId) })),

      addDoor: (floorId, door) => {
        const id = uid('door')
        mutatePlan(set, floorId, (p) => ({ ...p, doors: [...p.doors, { ...door, id }] }))
        return id
      },
      updateDoor: (floorId, doorId, patch) =>
        mutatePlan(set, floorId, (p) => ({ ...p, doors: p.doors.map((d) => (d.id === doorId ? { ...d, ...patch } : d)) })),
      removeDoor: (floorId, doorId) =>
        mutatePlan(set, floorId, (p) => ({ ...p, doors: p.doors.filter((d) => d.id !== doorId) })),

      addFurniture: (floorId, item) => {
        const id = uid('furn')
        mutatePlan(set, floorId, (p) => ({ ...p, furniture: [...p.furniture, { ...item, id }] }))
        return id
      },
      updateFurniture: (floorId, itemId, patch) =>
        mutatePlan(set, floorId, (p) => ({ ...p, furniture: p.furniture.map((f) => (f.id === itemId ? { ...f, ...patch } : f)) })),
      removeFurniture: (floorId, itemId) =>
        mutatePlan(set, floorId, (p) => ({ ...p, furniture: p.furniture.filter((f) => f.id !== itemId) })),

      setFloorScale: (floorId, pxPerFoot) =>
        mutatePlan(set, floorId, (p) => ({ ...p, pxPerFoot: Math.max(1, pxPerFoot) })),
      updateFloorPlanMeta: (floorId, patch) => {
        mutatePlan(set, floorId, (p) => ({ ...p, ...patch }))
        if (patch.name) set((s) => ({ floors: s.floors.map((f) => (f.id === floorId ? { ...f, name: patch.name! } : f)) }))
      },
      resetFloorPlan: (floorId) => {
        const geo = FLOOR_GEOMETRY[floorId]
        if (!geo) return
        set((s) => ({ floorPlans: { ...s.floorPlans, [floorId]: geometryToPlan(geo) } }))
      },

      // ── from-scratch builder ────────────────────────────────────────────────
      createOffice: (o) => {
        const id = uid('off')
        set((s) => ({ offices: [...s.offices, { ...o, id, isPilot: false }] }))
        get().pushNotification({ kind: 'system', tone: 'success', title: 'Office created', body: `${o.name} (${o.code}) added.` })
        return id
      },
      createFloor: (officeId, opts) => {
        const id = uid('floor')
        const plan = blankFloorPlan({ id, officeId, name: opts.name, widthFt: opts.widthFt, heightFt: opts.heightFt, pxPerFoot: opts.pxPerFoot })
        const floor: Floor = { id, officeId, name: opts.name, level: opts.level ?? 1, plan: id, seatCount: 0 }
        set((s) => ({ floors: [...s.floors, floor], floorPlans: { ...s.floorPlans, [id]: plan } }))
        get().pushNotification({ kind: 'seat', tone: 'success', title: 'Floor created', body: `${opts.name} · ${opts.widthFt}′ × ${opts.heightFt}′ blank plan ready to design.` })
        return id
      },
      removeFloor: (floorId) => {
        set((s) => {
          const { [floorId]: _drop, ...rest } = s.floorPlans
          return {
            floors: s.floors.filter((f) => f.id !== floorId),
            floorPlans: rest,
            seats: s.seats.filter((x) => x.floorId !== floorId),
          }
        })
      },

      updateAsset: (id, patch) => set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      assignAsset: async (id, employeeId, location) => {
        await latency()
        const emp = get().employees.find((e) => e.id === employeeId)
        const now = new Date().toISOString()
        set((s) => ({
          assets: s.assets.map((a) => (a.id === id ? {
            ...a, assignedEmployeeId: employeeId, location: location ?? a.location, status: a.status === 'in-storage' ? 'in-use' : a.status,
            lifecycle: [...a.lifecycle, { id: uid('al'), type: 'reassigned', title: 'Reassigned', detail: `Assigned to ${emp?.fullName ?? 'employee'}${location ? ` · ${location}` : ''}`, actor: actorName, timestamp: now }],
          } : a)),
        }))
        get().pushNotification({ kind: 'asset', tone: 'success', title: 'Asset assigned', body: `Assigned to ${emp?.fullName}.` })
      },

      addAssetImage: (id, kind, src, note) => {
        const now = new Date().toISOString()
        set((s) => ({
          assets: s.assets.map((a) => (a.id === id ? {
            ...a,
            images: [...a.images, { id: uid('img'), kind, src, hue: kind === 'defect' ? 12 : Math.floor(Math.random() * 360), capturedAt: now, note }],
            lifecycle: [...a.lifecycle, { id: uid('al'), type: 'image', title: kind === 'deployment' ? 'Deployment image added' : kind === 'defect' ? 'Defect image added' : 'Current image added', detail: note ?? 'Image uploaded', actor: actorName, timestamp: now }],
          } : a)),
        }))
      },

      addAssetRemark: (id, remarks) => {
        const now = new Date().toISOString()
        set((s) => ({
          assets: s.assets.map((a) => (a.id === id ? {
            ...a, remarks,
            lifecycle: [...a.lifecycle, { id: uid('al'), type: 'remark', title: 'Remark updated', detail: remarks, actor: actorName, timestamp: now }],
          } : a)),
        }))
      },

      flagDefective: async (id, remarks, imageSrc) => {
        await latency()
        const now = new Date().toISOString()
        const a0 = get().assets.find((a) => a.id === id)
        set((s) => ({
          assets: s.assets.map((a) => (a.id === id ? {
            ...a, status: 'defective', remarks,
            images: [...a.images, { id: uid('img'), kind: 'defect', src: imageSrc, hue: 12, capturedAt: now, note: 'Damage / defect' }],
            lifecycle: [...a.lifecycle, { id: uid('al'), type: 'defective', title: 'Flagged defective', detail: remarks, actor: actorName, timestamp: now }],
          } : a)),
        }))
        get().pushNotification({ kind: 'asset', tone: 'warning', title: 'Asset flagged defective', body: `${a0?.assetId} · image & remarks sent to Admin for review.` })
      },

      takeAssetAction: async (id, action, note) => {
        await latency()
        const now = new Date().toISOString()
        const a0 = get().assets.find((a) => a.id === id)
        set((s) => ({
          assets: s.assets.map((a) => {
            if (a.id !== id) return a
            const status = action === 'discard' ? 'discarded' : action === 'store' ? 'in-storage' : 'in-use'
            const label = action === 'discard' ? 'Approved for disposal' : action === 'store' ? 'Moved to storage' : 'Returned to use'
            return {
              ...a, status, actionTaken: label,
              lifecycle: [
                ...a.lifecycle,
                { id: uid('al'), type: 'action', title: 'Admin action', detail: `${label}${note ? ` — ${note}` : ''}`, actor: actorName, timestamp: now },
                ...(action === 'discard' ? [{ id: uid('al'), type: 'discarded' as const, title: 'Discarded', detail: 'Removed from the active register', actor: actorName, timestamp: now }] : []),
              ],
            }
          }),
        }))
        get().pushNotification({ kind: 'asset', tone: action === 'discard' ? 'info' : 'success', title: 'Action recorded', body: `${a0?.assetId} · ${action === 'discard' ? 'approved for disposal' : action === 'store' ? 'moved to storage' : 'returned to use'}.` })
      },

      addSubcategory: (categoryId, sub) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === categoryId && sub.trim() && !c.subcategories.includes(sub.trim()) ? { ...c, subcategories: [...c.subcategories, sub.trim()] } : c)) })),
      removeSubcategory: (categoryId, sub) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === categoryId ? { ...c, subcategories: c.subcategories.filter((x) => x !== sub) } : c)) })),

      addAsset: (input) => {
        const id = uid('ast')
        const now = new Date().toISOString()
        set((s) => {
          const emp = s.employees.find((e) => e.id === input.assignedEmployeeId)
          const asset: Asset = {
            id, assetId: input.assetId, category: input.category, subcategory: input.subcategory, name: input.name,
            assignedEmployeeId: input.assignedEmployeeId, officeId: input.officeId, location: input.location,
            responsiblePerson: input.responsiblePerson, status: 'in-use', remarks: input.remarks,
            deploymentDate: now,
            images: input.deploymentImage ? [{ id: uid('img'), kind: 'deployment', src: input.deploymentImage, hue: 210, capturedAt: now, note: 'Condition at deployment' }] : [],
            lifecycle: [{ id: uid('al'), type: 'deployed', title: 'Asset deployed', detail: emp ? `Assigned to ${emp.fullName}` : `Recorded under ${input.officeId}`, actor: actorName, timestamp: now }],
          }
          return { assets: [asset, ...s.assets] }
        })
        get().pushNotification({ kind: 'asset', tone: 'success', title: 'Asset added', body: `${input.assetId} · ${input.name} deployed.` })
        return id
      },

      // ── asset request / action workflow (Section 11.7) ──────────────────────
      raiseAssetRequest: (input) => {
        const id = uid('areq')
        const req: AssetRequest = {
          id, type: input.type,
          category: input.category, subcategory: input.subcategory, name: input.name, officeId: input.officeId,
          assetRef: input.assetRef, assetCode: input.assetCode,
          raisedBy: input.raisedBy ?? 'Office Manager', reason: input.reason, remarks: input.remarks, imageHue: input.imageHue,
          requestDate: new Date().toISOString(), stage: 'pc-review',
        }
        set((s) => ({ assetRequests: [req, ...s.assetRequests] }))
        get().pushNotification({ kind: 'asset', tone: 'info', title: 'Asset request raised', body: `${input.type === 'new' ? 'New asset' : 'Disposal'} · ${input.name ?? input.assetCode ?? ''} — awaiting PC review.` })
        return id
      },

      pcReviewAssetRequest: (id, recommendation, action, pcBy) => {
        const now = new Date().toISOString()
        set((s) => ({
          assetRequests: s.assetRequests.map((r) => (r.id === id ? { ...r, stage: 'admin-review', pcRecommendation: recommendation, pcAction: action, pcBy: pcBy ?? 'Purchase Committee', pcAt: now } : r)),
        }))
        const req = get().assetRequests.find((r) => r.id === id)
        get().pushNotification({ kind: 'asset', tone: 'info', title: 'PC recommendation submitted', body: `${req?.name ?? req?.assetCode ?? 'Request'} · PC recommends "${action}" — awaiting Admin decision.` })
      },

      adminDecideAssetRequest: async (id, decision, note, adminBy) => {
        await latency()
        const now = new Date().toISOString()
        const req = get().assetRequests.find((r) => r.id === id)
        if (!req) return
        const adminAction = decision === 'rejected' ? 'Rejected' : req.type === 'disposal' ? 'Approved for disposal' : 'Approved for purchase'
        // Apply an approved disposal to the linked asset
        if (decision === 'approved' && req.type === 'disposal' && req.assetRef) {
          set((s) => ({
            assets: s.assets.map((a) => (a.id === req.assetRef ? {
              ...a, status: 'discarded', actionTaken: 'Approved for disposal',
              lifecycle: [...a.lifecycle,
                { id: uid('al'), type: 'action', title: 'Admin action', detail: `Disposal approved (PC + Admin review)${note ? ` — ${note}` : ''}`, actor: adminBy ?? actorName, timestamp: now },
                { id: uid('al'), type: 'discarded', title: 'Discarded', detail: 'Removed from the active register', actor: adminBy ?? actorName, timestamp: now },
              ],
            } : a)),
          }))
        }
        set((s) => ({
          assetRequests: s.assetRequests.map((r) => (r.id === id ? { ...r, stage: decision, adminAction, adminReason: note, adminBy: adminBy ?? actorName, adminAt: now } : r)),
        }))
        get().pushNotification({ kind: 'asset', tone: decision === 'approved' ? 'success' : 'warning', title: `Asset request ${decision}`, body: `${req.name ?? req.assetCode ?? 'Request'} · ${adminAction}. Office Manager notified.` })
      },

      markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      pushNotification: (n) => set((s) => ({ notifications: [{ ...n, id: uid('ntf'), timestamp: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 40) })),

      resetDemo: () => {
        localStorage.removeItem('locus.db')
        const fresh = buildSeed()
        set({ ...fresh, floorPlans: buildFloorPlans(), role: 'admin', personaId: fresh.employees.find((e) => e.currentSeatId)?.id ?? fresh.employees[0].id } as Partial<DataState>)
      },
    }),
    {
      name: 'locus.db',
      version: 19,
      // v16 replaces the asset module with the Section 7 model (categories +
      // subcategories, assignment, images, remarks, lifecycle) and drops the old
      // movements / verifications / QR. Returning an empty slice rebuilds
      // everything from the fresh seed; later edits still persist.
      migrate: () => ({}) as DataState,
      partialize: (s) => ({
        offices: s.offices, floors: s.floors, departments: s.departments,
        employees: s.employees, seats: s.seats, seatEvents: s.seatEvents,
        categories: s.categories, assets: s.assets, notifications: s.notifications,
        floorPlans: s.floorPlans, meetingRooms: s.meetingRooms, meetingBookings: s.meetingBookings,
        seatRequests: s.seatRequests, assetRequests: s.assetRequests, role: s.role, personaId: s.personaId,
      }),
    },
  ),
)

// ── convenience selectors ────────────────────────────────────────────────────
export const useEmployee = (id?: string) => useData((s) => s.employees.find((e) => e.id === id))
export const useDept = (id?: string) => useData((s) => s.departments.find((d) => d.id === id))
export function deptName(id: string) {
  return useData.getState().departments.find((d) => d.id === id)?.name ?? id
}
export function officeName(id: string) {
  return useData.getState().offices.find((o) => o.id === id)?.name ?? id
}
