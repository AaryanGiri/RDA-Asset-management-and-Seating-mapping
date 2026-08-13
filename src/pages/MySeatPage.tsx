import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Armchair, ArrowLeftRight, MapPin, Send, Building2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, Modal, Field, Avatar, EmptyState } from '@/components/ui'
import { useData, deptName } from '@/lib/store'
import { REQUEST_STATUS_META } from '@/lib/status'
import { cn, formatDate, relativeTime } from '@/lib/utils'
import type { SeatRequest } from '@/lib/types'

export function MySeatPage() {
  const nav = useNavigate()
  const persona = useData((s) => s.employees.find((e) => e.id === s.personaId))
  const seats = useData((s) => s.seats)
  const employees = useData((s) => s.employees)
  const floors = useData((s) => s.floors)
  const requests = useData((s) => s.seatRequests)
  const createChange = useData((s) => s.createSeatChangeRequest)
  const createSwap = useData((s) => s.createSeatSwapRequest)

  const [changeOpen, setChangeOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)

  const mySeat = seats.find((s) => s.id === persona?.currentSeatId)
  const myFloor = floors.find((f) => f.id === mySeat?.floorId)
  const myRequests = requests.filter((r) => r.requesterId === persona?.id)

  if (!persona) return <Page><EmptyState title="No employee selected" body="Switch to an employee persona from the top bar." /></Page>

  return (
    <Page>
      <PageHeader
        icon={<Armchair className="h-5 w-5" />}
        title="My Seat"
        subtitle="View your allocated seat and request a change or swap — Admin approval required."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* seat card */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-start gap-4">
            <Avatar name={persona.fullName} hue={persona.avatarHue} size={52} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-content">{persona.fullName}</h2>
              <p className="text-sm text-muted">{persona.designation} · {deptName(persona.departmentId)}</p>
              <p className="mt-0.5 text-2xs text-subtle">{persona.code} · {persona.email}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Info label="Current seat" value={mySeat?.seatNumber ?? '—'} strong />
            <Info label="Floor" value={myFloor?.name.split('·')[0].trim() ?? '—'} />
            <Info label="Zone" value={mySeat?.zone ?? '—'} />
            <Info label="Allocated" value={mySeat?.allocationDate ? formatDate(mySeat.allocationDate, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => mySeat && nav(`/seating?seat=${mySeat.id}`)} className="btn-secondary" disabled={!mySeat}>
              <MapPin className="h-4 w-4" /> Locate on floor map
            </button>
            <button onClick={() => setChangeOpen(true)} className="btn-primary"><Send className="h-4 w-4" /> Request seat change</button>
            <button onClick={() => setSwapOpen(true)} className="btn-secondary"><ArrowLeftRight className="h-4 w-4" /> Request seat swap</button>
          </div>
        </div>

        {/* office card */}
        <div className="card flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-content"><Building2 className="h-4 w-4 text-brand" /> Workplace</div>
          <p className="text-sm text-muted">You're seated at <span className="font-medium text-content">{myFloor?.name}</span>.</p>
          <p className="text-xs text-subtle">Seat changes and swaps are reviewed by Admin. You'll be notified once a decision is made.</p>
          <div className="mt-auto rounded-xl bg-surface-2/60 p-3 text-xs text-muted">
            <p className="font-medium text-content">How it works</p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
              <li>Submit a change or swap request.</li>
              <li>Admin is notified by email.</li>
              <li>On approval, your seat updates automatically.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* my requests */}
      <div className="mt-6">
        <h3 className="section-title mb-2">My requests</h3>
        {myRequests.length === 0 ? (
          <EmptyState icon={<Send className="h-5 w-5" />} title="No requests yet" body="Use the buttons above to request a seat change or swap." />
        ) : (
          <div className="space-y-2">
            {myRequests.map((r) => <RequestRow key={r.id} req={r} />)}
          </div>
        )}
      </div>

      <SeatChangeModal open={changeOpen} onClose={() => setChangeOpen(false)} personaId={persona.id} onSubmit={createChange} seats={seats} currentSeatId={mySeat?.id} />
      <SeatSwapModal open={swapOpen} onClose={() => setSwapOpen(false)} personaId={persona.id} onSubmit={createSwap} employees={employees} seats={seats} />
    </Page>
  )
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <p className="text-2xs uppercase tracking-wide text-subtle">{label}</p>
      <p className={cn('mt-1 truncate', strong ? 'text-lg font-semibold text-content' : 'text-sm font-medium text-content')}>{value}</p>
    </div>
  )
}

const STATUS_ICON = { pending: Clock, approved: CheckCircle2, rejected: XCircle }
export function RequestRow({ req, showRequester }: { req: SeatRequest; showRequester?: boolean }) {
  const m = REQUEST_STATUS_META[req.status]
  const Icon = STATUS_ICON[req.status]
  return (
    <div className="card flex items-center gap-3 p-3">
      <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', m.bg, m.text)}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-content">
          {req.type === 'change'
            ? <>Seat change · {req.currentSeatNumber ?? '—'} → <span className="font-semibold">{req.requestedSeatNumber}</span></>
            : <>Seat swap · {req.currentSeatNumber} ↔ {req.otherSeatNumber} <span className="text-muted">({req.otherEmployeeName})</span></>}
        </p>
        <p className="truncate text-2xs text-muted">
          {showRequester && <span className="font-medium text-content">{req.requesterName} · </span>}
          {req.reason} · {relativeTime(req.requestDate)}
          {req.status === 'rejected' && req.decisionReason && <span className="text-occupied"> · {req.decisionReason}</span>}
        </p>
      </div>
      <span className={cn('chip shrink-0', m.bg, m.text)}><span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />{m.label}</span>
    </div>
  )
}

function SeatChangeModal({ open, onClose, personaId, onSubmit, seats, currentSeatId }: {
  open: boolean; onClose: () => void; personaId: string
  onSubmit: (i: { requesterId: string; requestedSeatId: string; reason: string; remarks?: string }) => Promise<void>
  seats: ReturnType<typeof useData.getState>['seats']; currentSeatId?: string
}) {
  const [requestedSeatId, setSeat] = useState('')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [busy, setBusy] = useState(false)
  const vacant = useMemo(() => seats.filter((s) => s.status === 'vacant' && s.id !== currentSeatId).slice(0, 120), [seats, currentSeatId])

  const submit = async () => {
    if (!requestedSeatId || !reason.trim()) return
    setBusy(true)
    await onSubmit({ requesterId: personaId, requestedSeatId, reason: reason.trim(), remarks: remarks.trim() || undefined })
    setBusy(false); setSeat(''); setReason(''); setRemarks(''); onClose()
  }
  return (
    <Modal open={open} onClose={onClose}>
      <div className="border-b border-border px-5 py-4"><h3 className="text-base font-semibold text-content">Request seat change</h3><p className="text-xs text-muted">Pick a vacant seat and tell Admin why.</p></div>
      <div className="space-y-4 p-5">
        <Field label="Requested seat">
          <select className="input" value={requestedSeatId} onChange={(e) => setSeat(e.target.value)}>
            <option value="">Select a vacant seat…</option>
            {vacant.map((s) => <option key={s.id} value={s.id}>{s.seatNumber} · {s.zone}</option>)}
          </select>
        </Field>
        <Field label="Reason"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Closer to my team" /></Field>
        <Field label="Additional remarks (optional)"><textarea className="input min-h-[72px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={!requestedSeatId || !reason.trim() || busy} className="btn-primary"><Send className="h-4 w-4" /> {busy ? 'Submitting…' : 'Submit request'}</button>
      </div>
    </Modal>
  )
}

function SeatSwapModal({ open, onClose, personaId, onSubmit, employees, seats }: {
  open: boolean; onClose: () => void; personaId: string
  onSubmit: (i: { requesterId: string; otherEmployeeId: string; reason: string; remarks?: string }) => Promise<void>
  employees: ReturnType<typeof useData.getState>['employees']; seats: ReturnType<typeof useData.getState>['seats']
}) {
  const [otherId, setOther] = useState('')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [busy, setBusy] = useState(false)
  const seatByEmp = useMemo(() => new Map(seats.filter((s) => s.employeeId).map((s) => [s.employeeId!, s.seatNumber])), [seats])
  const others = useMemo(() => employees.filter((e) => e.id !== personaId && e.currentSeatId).slice(0, 200), [employees, personaId])

  const submit = async () => {
    if (!otherId || !reason.trim()) return
    setBusy(true)
    await onSubmit({ requesterId: personaId, otherEmployeeId: otherId, reason: reason.trim(), remarks: remarks.trim() || undefined })
    setBusy(false); setOther(''); setReason(''); setRemarks(''); onClose()
  }
  return (
    <Modal open={open} onClose={onClose}>
      <div className="border-b border-border px-5 py-4"><h3 className="text-base font-semibold text-content">Request seat swap</h3><p className="text-xs text-muted">Swap seats with another employee (both allocations exchange on approval).</p></div>
      <div className="space-y-4 p-5">
        <Field label="Swap with">
          <select className="input" value={otherId} onChange={(e) => setOther(e.target.value)}>
            <option value="">Select an employee…</option>
            {others.map((e) => <option key={e.id} value={e.id}>{e.fullName} · {seatByEmp.get(e.id) ?? '—'}</option>)}
          </select>
        </Field>
        <Field label="Reason"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Sit with my project team" /></Field>
        <Field label="Additional remarks (optional)"><textarea className="input min-h-[72px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={!otherId || !reason.trim() || busy} className="btn-primary"><ArrowLeftRight className="h-4 w-4" /> {busy ? 'Submitting…' : 'Submit request'}</button>
      </div>
    </Modal>
  )
}
