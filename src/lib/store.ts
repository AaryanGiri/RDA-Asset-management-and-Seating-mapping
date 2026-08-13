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
import type { Floor, Office } from './types'
import type {
  Asset,
  AssetCondition,
  Employee,
  MovementRequest,
  MovementStage,
  Notification,
  Seat,
  SeatEvent,
  SeatType,
  VerificationTask,
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
  movements: MovementRequest[]
  verifications: VerificationTask[]
  notifications: Notification[]
  floorPlans: Record<string, FloorPlan>

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

  // asset actions
  advanceMovement: (id: string, humanCondition?: AssetCondition) => Promise<void>
  createMovement: (m: Omit<MovementRequest, 'id' | 'createdAt' | 'updatedAt' | 'stage'>) => Promise<void>
  decideVerification: (id: string, decision: VerificationTask['humanDecision'], newCondition: AssetCondition) => Promise<void>
  runAIVerification: (id: string) => Promise<{ condition: AssetCondition; confidence: number }>
  updateAsset: (id: string, patch: Partial<Asset>) => void

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

      runAIVerification: async (id) => {
        await latency(900, 1700)
        const task = get().verifications.find((v) => v.id === id)
        const prior = task?.priorCondition ?? 'good'
        // simulate a plausible AI suggestion near the prior condition
        const ladder: AssetCondition[] = ['new', 'good', 'fair', 'damaged', 'beyond-repair']
        const pi = Math.max(0, ladder.indexOf(prior))
        const drift = Math.random() < 0.5 ? 0 : 1
        const condition = ladder[Math.min(ladder.length - 1, pi + drift)]
        const confidence = Math.round(74 + Math.random() * 22)
        const changeArea = drift > 0 ? { x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4, r: 0.12 + Math.random() * 0.06 } : undefined
        set((s) => ({
          verifications: s.verifications.map((v) => (v.id === id ? { ...v, aiCondition: condition, aiConfidence: confidence, aiChangeArea: changeArea } : v)),
        }))
        return { condition, confidence }
      },

      decideVerification: async (id, decision, newCondition) => {
        await latency()
        const task = get().verifications.find((v) => v.id === id)
        set((s) => ({
          verifications: s.verifications.map((v) => (v.id === id ? { ...v, status: 'completed', humanDecision: decision, completedAt: new Date().toISOString() } : v)),
          assets: s.assets.map((a) =>
            a.id === task?.assetId
              ? {
                  ...a,
                  condition: newCondition,
                  lastVerifiedAt: new Date().toISOString(),
                  nextVerificationDue: daysFromNowISO(30),
                  flagged: decision === 'flag-repair' ? 'Flagged for repair at verification' : a.flagged,
                  timeline: [
                    ...a.timeline,
                    { id: uid('tl'), type: 'verified', title: 'Monthly verification', detail: `AI suggested ${newCondition}; Admin ${decision?.replace('-', ' ')}.`, actor: 'System · AI assist', timestamp: new Date().toISOString(), condition: newCondition, ai: true },
                  ],
                }
              : a,
          ),
        }))
        get().pushNotification({ kind: 'verification', tone: decision === 'flag-repair' ? 'warning' : 'success', title: 'Verification recorded', body: `${task?.assetTag} · condition ${newCondition}.` })
      },

      createMovement: async (m) => {
        await latency()
        const rec: MovementRequest = { ...m, id: uid('mov'), stage: 'requested', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        set((s) => ({ movements: [rec, ...s.movements] }))
        get().pushNotification({ kind: 'movement', tone: 'info', title: 'Movement requested', body: `${m.assetTag} · ${m.reason}.` })
      },

      advanceMovement: async (id, humanCondition) => {
        await latency(500, 1100)
        const order: MovementStage[] = ['requested', 'ai-review', 'approved', 'in-transit', 'received']
        set((s) => ({
          movements: s.movements.map((m) => {
            if (m.id !== id) return m
            const idx = order.indexOf(m.stage)
            const next = order[Math.min(order.length - 1, idx + 1)]
            let patch: Partial<MovementRequest> = { stage: next, updatedAt: new Date().toISOString() }
            if (next === 'ai-review') {
              const conds: AssetCondition[] = ['good', 'good', 'fair', 'damaged']
              patch.aiCondition = conds[Math.floor(Math.random() * conds.length)]
              patch.aiConfidence = Math.round(74 + Math.random() * 22)
            }
            if (next === 'approved' && humanCondition) patch.humanCondition = humanCondition
            return { ...m, ...patch }
          }),
        }))
        const m = get().movements.find((x) => x.id === id)
        if (m) {
          const label: Record<MovementStage, string> = { requested: 'requested', 'ai-review': 'under AI review', approved: 'approved', 'in-transit': 'in transit', received: 'received', rejected: 'rejected' }
          get().pushNotification({ kind: 'movement', tone: m.stage === 'received' ? 'success' : 'info', title: `Movement ${label[m.stage]}`, body: `${m.assetTag} → ${m.toRoom}.` })
          if (m.stage === 'received') {
            set((s) => ({ assets: s.assets.map((a) => (a.id === m.assetId ? { ...a, room: m.toRoom, officeId: m.toOfficeId, status: 'in-use', timeline: [...a.timeline, { id: uid('tl'), type: 'moved', title: 'Relocated', detail: `Received at ${m.toRoom} — receipt scan confirmed`, actor: actorName, timestamp: new Date().toISOString() }] } : a)) }))
          }
        }
      },

      updateAsset: (id, patch) => set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      pushNotification: (n) => set((s) => ({ notifications: [{ ...n, id: uid('ntf'), timestamp: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 40) })),

      resetDemo: () => {
        localStorage.removeItem('locus.db')
        const fresh = buildSeed()
        set({ ...fresh, floorPlans: buildFloorPlans() } as Partial<DataState>)
      },
    }),
    {
      name: 'locus.db',
      version: 14,
      // v14 makes both floors fully-editable vector plans (no background image) —
      // rooms + seats are real, movable, saveable objects. The persisted seats /
      // floors / floorPlans no longer match, so returning an empty slice lets the
      // shallow merge rebuild from the fresh seed; the user's later edits persist.
      migrate: () => ({}) as DataState,
      partialize: (s) => ({
        offices: s.offices, floors: s.floors, departments: s.departments,
        employees: s.employees, seats: s.seats, seatEvents: s.seatEvents,
        categories: s.categories, assets: s.assets, movements: s.movements,
        verifications: s.verifications, notifications: s.notifications,
        floorPlans: s.floorPlans,
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
