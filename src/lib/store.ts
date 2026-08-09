import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeed } from './seed'
import type {
  Asset,
  AssetCondition,
  Employee,
  MovementRequest,
  MovementStage,
  Notification,
  Seat,
  SeatEvent,
  VerificationTask,
} from './types'
import { latency, uid, daysAgoISO, daysFromNowISO } from './utils'

const seed = buildSeed()

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

  // seating actions
  allocateSeat: (seatId: string, employeeId: string, reason: string, effectiveDate: string, type: string) => Promise<void>
  releaseSeat: (seatId: string, reason: string, effectiveDate: string) => Promise<void>
  moveSeat: (fromSeatId: string, toSeatId: string, reason: string, effectiveDate: string) => Promise<void>
  setSeatMaintenance: (seatId: string, on: boolean, reason: string) => Promise<void>
  blockSeat: (seatId: string, on: boolean, reason: string) => Promise<void>

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
        set({ ...fresh } as Partial<DataState>)
      },
    }),
    {
      name: 'locus.db',
      version: 9,
      partialize: (s) => ({
        offices: s.offices, floors: s.floors, departments: s.departments,
        employees: s.employees, seats: s.seats, seatEvents: s.seatEvents,
        categories: s.categories, assets: s.assets, movements: s.movements,
        verifications: s.verifications, notifications: s.notifications,
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
