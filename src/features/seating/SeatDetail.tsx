import { useMemo, useState } from 'react'
import {
  ArrowLeftRight, LogOut, Ban, Wrench, UserPlus, Mail, Phone, Building2,
  CalendarClock, History, Search, Check, AlertTriangle, MapPin, Briefcase, RotateCcw,
} from 'lucide-react'
import { Sheet, Modal, Avatar, SeatBadge, Field, Spinner } from '@/components/ui'
import { useData, deptName } from '@/lib/store'
import { useUI } from '@/lib/uiStore'
import { SEAT_STATUS } from '@/lib/status'
import { cn, formatDate, relativeTime, daysBetween } from '@/lib/utils'
import type { Seat, Employee } from '@/lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function SeatDetail({ seatId, onClose, onNavigateSeat }: { seatId?: string; onClose: () => void; onNavigateSeat?: (id: string) => void }) {
  const seat = useData((s) => s.seats.find((x) => x.id === seatId))
  const employees = useData((s) => s.employees)
  const seatEvents = useData((s) => s.seatEvents)
  const floors = useData((s) => s.floors)
  const emp = employees.find((e) => e.id === seat?.employeeId)
  const [flow, setFlow] = useState<null | 'allocate' | 'move' | 'release' | 'block' | 'maint'>(null)

  const history = useMemo(
    () => seatEvents.filter((e) => e.seatId === seatId).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)),
    [seatEvents, seatId],
  )
  const floorName = floors.find((f) => f.id === seat?.floorId)?.name ?? ''

  return (
    <>
      <Sheet
        open={!!seatId && !!seat}
        onClose={onClose}
        width={460}
        title={
          seat && (
            <div className="flex items-center gap-3">
              <div className={cn('grid h-9 w-9 place-items-center rounded-xl font-bold', SEAT_STATUS[seat.status].bg, SEAT_STATUS[seat.status].text)}>
                {seat.seatNumber.replace(/[^0-9]/g, '').slice(0, 3) || seat.seatNumber}
              </div>
              <div>
                <p className="text-sm font-semibold text-content">Seat {seat.seatNumber}</p>
                <p className="text-xs text-muted">{seat.zone} · {floorName}</p>
              </div>
            </div>
          )
        }
      >
        {seat && (
          <div className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <SeatBadge status={seat.status} />
              <span className="chip bg-surface-2 text-muted capitalize">{seat.seatType}</span>
            </div>

            {/* occupant */}
            {emp ? (
              <OccupantCard emp={emp} seat={seat} />
            ) : seat.status === 'vacant' ? (
              <div className="rounded-2xl border border-dashed border-border-strong bg-surface-2/50 p-5 text-center">
                <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-vacant-soft text-vacant"><UserPlus className="h-5 w-5" /></div>
                <p className="text-sm font-semibold text-content">Seat available</p>
                <p className="mt-0.5 text-xs text-muted">Allocate an employee or hold this seat.</p>
              </div>
            ) : (
              <div className={cn('rounded-2xl border border-border p-4', SEAT_STATUS[seat.status].bg)}>
                <div className="flex items-center gap-2">
                  {seat.status === 'blocked' ? <Ban className="h-4 w-4 text-blocked" /> : <Wrench className="h-4 w-4 text-maint" />}
                  <p className="text-sm font-semibold text-content">{SEAT_STATUS[seat.status].label}</p>
                </div>
                <p className="mt-1 text-xs text-muted">{seat.remarks ?? 'No remark on file.'}</p>
              </div>
            )}

            {/* actions */}
            <div className="grid grid-cols-2 gap-2">
              {emp ? (
                <>
                  <button className="btn-primary" onClick={() => setFlow('move')}><ArrowLeftRight className="h-4 w-4" /> Change seat</button>
                  <button className="btn-secondary" onClick={() => setFlow('release')}><LogOut className="h-4 w-4" /> Release</button>
                </>
              ) : seat.status === 'vacant' ? (
                <>
                  <button className="btn-primary" onClick={() => setFlow('allocate')}><UserPlus className="h-4 w-4" /> Allocate</button>
                  <button className="btn-secondary" onClick={() => setFlow('block')}><Ban className="h-4 w-4" /> Block</button>
                  <button className="btn-secondary col-span-2" onClick={() => setFlow('maint')}><Wrench className="h-4 w-4" /> Mark under maintenance</button>
                </>
              ) : (
                <ReturnToVacant seatId={seat.id} onDone={onClose} />
              )}
            </div>

            {/* history */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-subtle" />
                <p className="section-title">Allocation history</p>
              </div>
              {history.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-3 text-xs text-subtle">No history recorded yet.</p>
              ) : (
                <ol className="relative space-y-0 border-l border-border pl-4">
                  {history.map((e) => (
                    <li key={e.id} className="relative pb-4 last:pb-0">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-brand" />
                      <p className="text-xs font-semibold capitalize text-content">{e.type.replace('-', ' ')} {e.employeeName ? `· ${e.employeeName}` : ''}</p>
                      <p className="text-2xs text-muted">{e.reason}</p>
                      <p className="mt-0.5 text-2xs text-subtle">{formatDate(e.timestamp)} · {e.actor}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {seat && flow === 'allocate' && <AllocateModal seat={seat} onClose={() => setFlow(null)} />}
      {seat && emp && flow === 'move' && <MoveModal seat={seat} emp={emp} onClose={() => setFlow(null)} onNavigateSeat={onNavigateSeat} />}
      {seat && emp && flow === 'release' && <ReleaseModal seat={seat} emp={emp} onClose={() => setFlow(null)} />}
      {seat && flow === 'block' && <ReasonModal title="Block seat" tone="blocked" seat={seat} kind="block" onClose={() => setFlow(null)} />}
      {seat && flow === 'maint' && <ReasonModal title="Mark under maintenance" tone="maint" seat={seat} kind="maint" onClose={() => setFlow(null)} />}
    </>
  )
}

function OccupantCard({ emp, seat }: { emp: Employee; seat: Seat }) {
  const dept = deptName(emp.departmentId)
  const notice = emp.employmentStatus === 'notice'
  return (
    <div className="space-y-3">
      {notice && emp.lastWorkingDay && (
        <div className="flex items-start gap-2.5 rounded-xl border border-notice/30 bg-notice-soft p-3">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-notice" />
          <div>
            <p className="text-xs font-semibold text-notice">On notice — vacating {relativeTime(emp.lastWorkingDay)}</p>
            <p className="text-2xs text-muted">Last working day {formatDate(emp.lastWorkingDay)}. Plan reallocation.</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Avatar name={emp.fullName} hue={emp.avatarHue} size={52} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-content">{emp.fullName}</p>
          <p className="truncate text-xs text-muted">{emp.designation} · {emp.code}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Info icon={Building2} label="Department" value={dept} />
        <Info icon={Briefcase} label="Project" value={emp.project} />
        <Info icon={MapPin} label="Reporting to" value={emp.reportingManager} />
        <Info icon={CalendarClock} label="Allocated" value={seat.allocationDate ? formatDate(seat.allocationDate) : '—'} />
        <Info icon={Mail} label="Email" value={emp.email} span />
        <Info icon={Phone} label="Phone" value={emp.phone} span />
      </div>
    </div>
  )
}

function Info({ icon: Icon, label, value, span }: { icon: typeof Mail; label: string; value: string; span?: boolean }) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface-2/50 p-2.5', span && 'col-span-2')}>
      <div className="flex items-center gap-1.5 text-2xs font-medium text-subtle"><Icon className="h-3 w-3" /> {label}</div>
      <p className="mt-0.5 truncate text-xs font-medium text-content">{value}</p>
    </div>
  )
}

function ReturnToVacant({ seatId, onDone }: { seatId: string; onDone: () => void }) {
  const setSeatMaintenance = useData((s) => s.setSeatMaintenance)
  const blockSeat = useData((s) => s.blockSeat)
  const seat = useData((s) => s.seats.find((x) => x.id === seatId))
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    if (seat?.status === 'maintenance') await setSeatMaintenance(seatId, false, '')
    else await blockSeat(seatId, false, '')
    setBusy(false)
    onDone()
  }
  return (
    <button className="btn-secondary col-span-2" onClick={run} disabled={busy}>
      {busy ? <Spinner className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />} Return seat to vacant
    </button>
  )
}

// ── Modals ───────────────────────────────────────────────────────────────────
function ModalHeader({ icon: Icon, title, sub, tone = 'brand' }: { icon: typeof UserPlus; title: string; sub: string; tone?: string }) {
  const toneMap: Record<string, string> = { brand: 'bg-brand-soft text-brand', occupied: 'bg-occupied-soft text-occupied', blocked: 'bg-blocked-soft text-blocked', maint: 'bg-maint-soft text-maint' }
  return (
    <div className="flex items-center gap-3 border-b border-border p-5">
      <div className={cn('grid h-10 w-10 place-items-center rounded-xl', toneMap[tone])}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-sm font-semibold text-content">{title}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </div>
  )
}

function AllocateModal({ seat, onClose }: { seat: Seat; onClose: () => void }) {
  const employees = useData((s) => s.employees)
  const allocateSeat = useData((s) => s.allocateSeat)
  const toast = useUI((s) => s.toast)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Employee | null>(null)
  const [date, setDate] = useState(today())
  const [type, setType] = useState('Permanent')
  const [reason, setReason] = useState('New joiner allocation')
  const [busy, setBusy] = useState(false)

  const unseated = useMemo(
    () => employees.filter((e) => !e.currentSeatId).filter((e) => `${e.fullName} ${e.code} ${e.project}`.toLowerCase().includes(q.toLowerCase())),
    [employees, q],
  )

  const submit = async () => {
    if (!selected) return
    setBusy(true)
    await allocateSeat(seat.id, selected.id, reason, new Date(date).toISOString(), type)
    setBusy(false)
    toast({ tone: 'success', title: 'Seat allocated', body: `${selected.fullName} → ${seat.seatNumber}` })
    onClose()
  }

  return (
    <Modal open onClose={onClose} width={480}>
      <ModalHeader icon={UserPlus} title={`Allocate seat ${seat.seatNumber}`} sub={`${seat.zone} · confirm before commit`} />
      <div className="space-y-4 p-5">
        {!selected ? (
          <Field label="Find employee (unseated)">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, project…" className="input pl-9" />
            </div>
            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
              {unseated.length === 0 && <p className="p-3 text-center text-xs text-subtle">No unseated employees match.</p>}
              {unseated.slice(0, 20).map((e) => (
                <button key={e.id} onClick={() => setSelected(e)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-2">
                  <Avatar name={e.fullName} hue={e.avatarHue} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-content">{e.fullName}</p>
                    <p className="truncate text-2xs text-muted">{e.designation} · {deptName(e.departmentId)}</p>
                  </div>
                  {e.employmentStatus === 'notice' && <span className="chip bg-notice-soft px-1.5 py-0.5 text-2xs text-notice">Notice</span>}
                </button>
              ))}
            </div>
          </Field>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3">
            <Avatar name={selected.fullName} hue={selected.avatarHue} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-content">{selected.fullName}</p>
              <p className="truncate text-2xs text-muted">{selected.designation} · {deptName(selected.departmentId)}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs font-medium text-brand hover:underline">Change</button>
          </div>
        )}

        {selected && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Effective date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></Field>
              <Field label="Allocation type">
                <select value={type} onChange={(e) => setType(e.target.value)} className="input">
                  <option>Permanent</option><option>Temporary</option>
                </select>
              </Field>
            </div>
            <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className="input" /></Field>
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border p-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!selected || busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Confirm allocation
        </button>
      </div>
    </Modal>
  )
}

function MoveModal({ seat, emp, onClose, onNavigateSeat }: { seat: Seat; emp: Employee; onClose: () => void; onNavigateSeat?: (id: string) => void }) {
  const seats = useData((s) => s.seats)
  const floors = useData((s) => s.floors)
  const moveSeat = useData((s) => s.moveSeat)
  const [q, setQ] = useState('')
  const [target, setTarget] = useState<Seat | null>(null)
  const [date, setDate] = useState(today())
  const [reason, setReason] = useState('Team relocation')
  const [busy, setBusy] = useState(false)

  const vacant = useMemo(
    () => seats.filter((s) => s.status === 'vacant' && s.id !== seat.id).filter((s) => s.seatNumber.toLowerCase().includes(q.toLowerCase()) || s.zone.toLowerCase().includes(q.toLowerCase())),
    [seats, q, seat.id],
  )

  const submit = async () => {
    if (!target) return
    setBusy(true)
    await moveSeat(seat.id, target.id, reason, new Date(date).toISOString())
    setBusy(false)
    onClose()
    onNavigateSeat?.(target.id)
  }

  return (
    <Modal open onClose={onClose} width={480}>
      <ModalHeader icon={ArrowLeftRight} title={`Move ${emp.fullName}`} sub={`From ${seat.seatNumber} → select a vacant seat`} />
      <div className="space-y-4 p-5">
        {!target ? (
          <Field label="Choose destination seat (vacant)">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search seat number or zone…" className="input pl-9" />
            </div>
            <div className="mt-2 grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto">
              {vacant.length === 0 && <p className="col-span-2 p-3 text-center text-xs text-subtle">No vacant seats match.</p>}
              {vacant.slice(0, 24).map((s) => (
                <button key={s.id} onClick={() => setTarget(s)} className="flex items-center gap-2 rounded-xl border border-border p-2 text-left transition-colors hover:border-brand hover:bg-brand-soft">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-vacant-soft text-2xs font-bold text-vacant">{s.seatNumber}</span>
                  <span className="truncate text-2xs text-muted">{s.zone} · {floors.find((f) => f.id === s.floorId)?.name.split('·')[0]}</span>
                </button>
              ))}
            </div>
          </Field>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-vacant-soft text-xs font-bold text-vacant">{target.seatNumber}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-content">Seat {target.seatNumber}</p><p className="text-2xs text-muted">{target.zone}</p></div>
            <button onClick={() => setTarget(null)} className="text-xs font-medium text-brand hover:underline">Change</button>
          </div>
        )}
        {target && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Effective date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></Field>
            <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className="input" /></Field>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-xl bg-surface-2 p-2.5 text-2xs text-muted">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-maint" /> {seat.seatNumber} will be released and marked vacant. Prior allocation is preserved in history.
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border p-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!target || busy}>{busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Confirm move</button>
      </div>
    </Modal>
  )
}

function ReleaseModal({ seat, emp, onClose }: { seat: Seat; emp: Employee; onClose: () => void }) {
  const releaseSeat = useData((s) => s.releaseSeat)
  const [date, setDate] = useState(today())
  const [reason, setReason] = useState(emp.employmentStatus === 'notice' ? 'Employee exit — last working day' : 'Seat released')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    await releaseSeat(seat.id, reason, new Date(date).toISOString())
    setBusy(false)
    onClose()
  }
  return (
    <Modal open onClose={onClose} width={440}>
      <ModalHeader icon={LogOut} title={`Release seat ${seat.seatNumber}`} sub={`${emp.fullName} will be unassigned`} tone="occupied" />
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Effective date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></Field>
        </div>
        <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className="input" /></Field>
        <div className="flex items-center gap-2 rounded-xl bg-occupied-soft p-2.5 text-2xs text-occupied">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Seat becomes Vacant. This action is logged to history.
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border p-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-danger" onClick={submit} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Release seat</button>
      </div>
    </Modal>
  )
}

function ReasonModal({ seat, title, tone, kind, onClose }: { seat: Seat; title: string; tone: string; kind: 'block' | 'maint'; onClose: () => void }) {
  const blockSeat = useData((s) => s.blockSeat)
  const setSeatMaintenance = useData((s) => s.setSeatMaintenance)
  const presets = kind === 'block' ? ['Held for restructuring', 'Reserved — incoming team', 'Awaiting furniture'] : ['Desk power fault', 'Chair replacement', 'Monitor arm repair']
  const [reason, setReason] = useState(presets[0])
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    if (kind === 'block') await blockSeat(seat.id, true, reason)
    else await setSeatMaintenance(seat.id, true, reason)
    setBusy(false)
    onClose()
  }
  return (
    <Modal open onClose={onClose} width={420}>
      <ModalHeader icon={kind === 'block' ? Ban : Wrench} title={title} sub={`Seat ${seat.seatNumber}`} tone={tone} />
      <div className="space-y-3 p-5">
        <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className="input" /></Field>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => <button key={p} onClick={() => setReason(p)} className="chip bg-surface-2 text-muted hover:bg-surface-3">{p}</button>)}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border p-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Confirm</button>
      </div>
    </Modal>
  )
}
