import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BASE_DESKS, DEFAULT_PERSONA, PEOPLE, type NDesk, type NStatus } from './data'
import { uid } from '@/lib/utils'

const personName = (personId: string) => PEOPLE.find((p) => p.id === personId)?.name ?? ''

export interface NRequest {
  id: string
  type: 'change' | 'swap'
  requesterId: string
  requesterName: string
  currentDeskId?: string
  currentDeskLabel?: string
  targetDeskId?: string // seat change target
  targetDeskLabel?: string
  otherPersonId?: string // swap counterpart
  otherPersonName?: string
  otherDeskId?: string
  otherDeskLabel?: string
  reason: string
  remarks?: string
  requestDate: string
  status: 'pending' | 'approved' | 'rejected'
  decisionReason?: string
  decidedAt?: string
}

interface NeighborhoodState {
  desks: NDesk[]
  requests: NRequest[]
  personaId: string

  setPersona: (id: string) => void

  assign: (deskId: string, personId: string) => void
  release: (deskId: string) => void
  setStatus: (deskId: string, status: NStatus, note?: string) => void

  requestChange: (input: { requesterId: string; targetDeskId: string; reason: string; remarks?: string }) => NRequest
  requestSwap: (input: { requesterId: string; otherPersonId: string; reason: string; remarks?: string }) => NRequest
  approveRequest: (id: string) => void
  rejectRequest: (id: string, reason: string) => void

  reset: () => void
}

const clone = (d: NDesk[]) => d.map((x) => ({ ...x }))
const findByPerson = (desks: NDesk[], personId: string) => desks.find((d) => d.personId === personId)

// ── demo seat requests ───────────────────────────────────────────────────────
function makeSeedRequests(): NRequest[] {
  const byLabel = (l: string) => BASE_DESKS.find((d) => d.label === l)
  const pName = (id?: string) => PEOPLE.find((p) => p.id === id)?.name ?? ''
  const ago = (days: number, hours = 0) => new Date(Date.now() - (days * 86400000 + hours * 3600000)).toISOString()
  const out: NRequest[] = []
  const change = (fromL: string, toL: string, reason: string, remarks: string | undefined, when: string, status: NRequest['status'], decisionReason?: string, decidedAt?: string) => {
    const from = byLabel(fromL), to = byLabel(toL)
    if (!from?.personId || !to) return
    out.push({ id: uid('nreq'), type: 'change', requesterId: from.personId, requesterName: pName(from.personId), currentDeskId: from.id, currentDeskLabel: from.label, targetDeskId: to.id, targetDeskLabel: to.label, reason, remarks, requestDate: when, status, decisionReason, decidedAt })
  }
  const swap = (aL: string, bL: string, reason: string, when: string, status: NRequest['status'], decisionReason?: string, decidedAt?: string) => {
    const a = byLabel(aL), b = byLabel(bL)
    if (!a?.personId || !b?.personId) return
    out.push({ id: uid('nreq'), type: 'swap', requesterId: a.personId, requesterName: pName(a.personId), currentDeskId: a.id, currentDeskLabel: a.label, otherPersonId: b.personId, otherPersonName: pName(b.personId), otherDeskId: b.id, otherDeskLabel: b.label, reason, requestDate: when, status, decisionReason, decidedAt })
  }
  change('W80', 'S-1', 'Prefer a quieter desk away from the walkway', 'Any window-side seat works', ago(0, 5), 'pending')
  swap('W100', 'W104', 'Want to sit next to my project pod', ago(1, 2), 'pending')
  change('W88', 'S-2', 'Closer to my reporting manager', undefined, ago(1, 6), 'pending')
  change('W95', 'S-3', 'Ergonomic seat near the window', undefined, ago(3), 'approved', undefined, ago(2))
  swap('W82', 'W106', 'Mutually agreed swap', ago(4), 'rejected', 'W106 is reserved for the COO cell — please choose another seat.', ago(2))
  return out
}

// apply already-approved requests so the seat map is consistent with the log
function seededDesks(reqs: NRequest[]): NDesk[] {
  const desks = clone(BASE_DESKS)
  for (const r of reqs) {
    if (r.status !== 'approved') continue
    if (r.type === 'change' && r.currentDeskId && r.targetDeskId) {
      const from = desks.find((d) => d.id === r.currentDeskId)
      const to = desks.find((d) => d.id === r.targetDeskId)
      if (from && to && from.personId === r.requesterId) {
        to.personId = from.personId; to.status = 'occupied'; to.note = undefined
        from.personId = undefined; from.status = 'vacant'; from.note = undefined
      }
    }
  }
  return desks
}

const SEED_REQUESTS = makeSeedRequests()
const SEED_DESKS = seededDesks(SEED_REQUESTS)

export const useNeighborhood = create<NeighborhoodState>()(
  persist(
    (set, get) => ({
      desks: clone(SEED_DESKS),
      requests: [...SEED_REQUESTS],
      personaId: DEFAULT_PERSONA,

      setPersona: (id) => set({ personaId: id }),

      assign: (deskId, personId) =>
        set((s) => ({
          desks: s.desks.map((d) => {
            if (d.personId === personId && d.id !== deskId) return { ...d, personId: undefined, status: 'vacant', note: undefined }
            if (d.id === deskId) return { ...d, personId, status: 'occupied', note: undefined }
            return d
          }),
        })),

      release: (deskId) =>
        set((s) => ({ desks: s.desks.map((d) => (d.id === deskId ? { ...d, personId: undefined, status: 'vacant', note: undefined } : d)) })),

      setStatus: (deskId, status, note) =>
        set((s) => ({
          desks: s.desks.map((d) => {
            if (d.id !== deskId) return d
            const clearPerson = status === 'vacant' || status === 'maintenance' || status === 'blocked'
            return { ...d, status, note, personId: clearPerson ? undefined : d.personId }
          }),
        })),

      requestChange: ({ requesterId, targetDeskId, reason, remarks }) => {
        const desks = get().desks
        const cur = findByPerson(desks, requesterId)
        const target = desks.find((d) => d.id === targetDeskId)
        const req: NRequest = {
          id: uid('nreq'),
          type: 'change',
          requesterId,
          requesterName: personName(requesterId),
          currentDeskId: cur?.id,
          currentDeskLabel: cur?.label,
          targetDeskId,
          targetDeskLabel: target?.label,
          reason,
          remarks,
          requestDate: new Date().toISOString(),
          status: 'pending',
        }
        set((s) => ({ requests: [req, ...s.requests] }))
        return req
      },

      requestSwap: ({ requesterId, otherPersonId, reason, remarks }) => {
        const desks = get().desks
        const cur = findByPerson(desks, requesterId)
        const other = findByPerson(desks, otherPersonId)
        const req: NRequest = {
          id: uid('nreq'),
          type: 'swap',
          requesterId,
          requesterName: personName(requesterId),
          currentDeskId: cur?.id,
          currentDeskLabel: cur?.label,
          otherPersonId,
          otherPersonName: personName(otherPersonId),
          otherDeskId: other?.id,
          otherDeskLabel: other?.label,
          reason,
          remarks,
          requestDate: new Date().toISOString(),
          status: 'pending',
        }
        set((s) => ({ requests: [req, ...s.requests] }))
        return req
      },

      approveRequest: (id) => {
        const req = get().requests.find((r) => r.id === id)
        if (!req) return
        const now = new Date().toISOString()
        if (req.type === 'change' && req.targetDeskId) {
          set((s) => ({
            desks: s.desks.map((d) => {
              if (d.id === req.currentDeskId) return { ...d, personId: undefined, status: 'vacant', note: undefined }
              if (d.id === req.targetDeskId) return { ...d, personId: req.requesterId, status: 'occupied', note: undefined }
              return d
            }),
          }))
        } else if (req.type === 'swap' && req.currentDeskId && req.otherDeskId && req.otherPersonId) {
          set((s) => ({
            desks: s.desks.map((d) => {
              if (d.id === req.currentDeskId) return { ...d, personId: req.otherPersonId, status: 'occupied' }
              if (d.id === req.otherDeskId) return { ...d, personId: req.requesterId, status: 'occupied' }
              return d
            }),
          }))
        }
        set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, status: 'approved', decidedAt: now } : r)) }))
      },

      rejectRequest: (id, reason) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, status: 'rejected', decisionReason: reason, decidedAt: new Date().toISOString() } : r)),
        })),

      reset: () => set({ desks: clone(SEED_DESKS), requests: [...SEED_REQUESTS], personaId: DEFAULT_PERSONA }),
    }),
    {
      name: 'aiwc.neighborhood',
      version: 7, // renamed Tech Innovation → RDA
      partialize: (s) => ({ desks: s.desks, requests: s.requests, personaId: s.personaId }),
      migrate: () => ({ desks: clone(SEED_DESKS), requests: [...SEED_REQUESTS], personaId: DEFAULT_PERSONA }) as Partial<NeighborhoodState>,
    },
  ),
)
