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

export const useFloorMap = create<NeighborhoodState>()(
  persist(
    (set, get) => ({
      desks: clone(BASE_DESKS),
      requests: [],
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

      reset: () => set({ desks: clone(BASE_DESKS), requests: [], personaId: DEFAULT_PERSONA }),
    }),
    {
      name: 'aiwc.floormap',
      version: 2,
      partialize: (s) => ({ desks: s.desks, requests: s.requests, personaId: s.personaId }),
      migrate: () => ({ desks: clone(BASE_DESKS), requests: [], personaId: DEFAULT_PERSONA }) as Partial<NeighborhoodState>,
    },
  ),
)
