import { useMemo, useState } from 'react'
import { Check, X, Clock, Inbox, ArrowLeftRight, MoveRight } from 'lucide-react'
import { useUI } from '@/lib/uiStore'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/utils'
import { SEAT_STATUS, TYPE_META, STATUS_ORDER, type ColorMode } from './meta'
import { DEPARTMENTS, type NDesk, type NPerson, type NStatus, type NType } from './data'
import type { NRequest } from './store'
import { useFloorMap } from './store'

interface LegendItem { key: string; label: string; fill: string; count: number }

export function NeighborhoodLegend({
  desks, people, colorMode, active, onToggle,
}: {
  desks: NDesk[]
  people: Map<string, NPerson>
  colorMode: ColorMode
  active: string | null
  onToggle: (key: string) => void
}) {
  const items: LegendItem[] = useMemo(() => {
    if (colorMode === 'status') {
      const c: Record<string, number> = {}
      desks.forEach((d) => (c[d.status] = (c[d.status] ?? 0) + 1))
      return STATUS_ORDER.filter((s) => c[s]).map((s) => ({ key: s, label: SEAT_STATUS[s as NStatus].label, fill: SEAT_STATUS[s as NStatus].fill, count: c[s] }))
    }
    if (colorMode === 'department') {
      const c: Record<string, number> = {}
      desks.forEach((d) => (c[d.deptId] = (c[d.deptId] ?? 0) + 1))
      return DEPARTMENTS.filter((d) => c[d.id]).map((d) => ({ key: d.id, label: d.short, fill: d.color, count: c[d.id] }))
    }
    const c: Record<string, number> = {}
    desks.forEach((d) => {
      const p = d.personId ? people.get(d.personId) : undefined
      if (p) c[p.type] = (c[p.type] ?? 0) + 1
    })
    return (Object.keys(TYPE_META) as NType[]).filter((t) => c[t]).map((t) => ({ key: t, label: TYPE_META[t].label, fill: TYPE_META[t].fill, count: c[t] }))
  }, [desks, people, colorMode])

  const title = colorMode === 'status' ? 'Seat status' : colorMode === 'department' ? 'Departments' : 'Workforce type'

  return (
    <div className="card p-3.5">
      <p className="section-title mb-2.5">{title}</p>
      <div className="space-y-1">
        {items.map((it) => {
          const on = active === it.key
          return (
            <button
              key={it.key}
              onClick={() => onToggle(it.key)}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors', on ? 'bg-surface-2' : 'hover:bg-surface-2')}
            >
              <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-inset ring-white/10" style={{ background: it.fill }} />
              <span className="flex-1 truncate text-sm text-content">{it.label}</span>
              <span className="text-xs font-semibold text-muted">{it.count}</span>
            </button>
          )
        })}
      </div>
      {active && <p className="mt-2 px-2 text-2xs text-subtle">Filtering · click again to clear</p>}
    </div>
  )
}

export function SummaryCard({ desks }: { desks: NDesk[] }) {
  const total = desks.length
  const occupied = desks.filter((d) => d.status === 'occupied').length
  const notice = desks.filter((d) => d.status === 'notice').length
  const vacant = desks.filter((d) => d.status === 'vacant').length
  const unavailable = desks.filter((d) => d.status === 'maintenance' || d.status === 'blocked').length
  const rate = total ? Math.round(((occupied + notice) / total) * 100) : 0
  return (
    <div className="card p-3.5">
      <p className="section-title mb-2">Neighbourhood summary</p>
      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-content">{rate}%</span>
        <span className="text-xs text-muted">occupied</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-brand" style={{ width: `${rate}%` }} />
      </div>
      <dl className="mt-3 space-y-1.5 text-xs">
        <Row label="Total desks" value={total} />
        <Row label="Occupied" value={occupied} tone="text-occupied" />
        <Row label="On notice" value={notice} tone="text-notice" />
        <Row label="Vacant" value={vacant} tone="text-vacant" />
        <Row label="Unavailable" value={unavailable} tone="text-muted" />
      </dl>
    </div>
  )
}

function Row({ label, value, tone = 'text-content' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('font-semibold', tone)}>{value}</dd>
    </div>
  )
}

// ── Admin requests inbox ─────────────────────────────────────────────────────
export function RequestsInbox({ people, onFocusDesk }: { people: Map<string, NPerson>; onFocusDesk: (id: string) => void }) {
  const requests = useFloorMap((s) => s.requests)
  const approve = useFloorMap((s) => s.approveRequest)
  const reject = useFloorMap((s) => s.rejectRequest)
  const toast = useUI((s) => s.toast)
  const pending = requests.filter((r) => r.status === 'pending')

  if (!requests.length) {
    return (
      <div className="card flex items-start gap-2.5 p-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Inbox className="h-4 w-4" /></div>
        <div>
          <p className="text-xs font-semibold text-content">No seat requests</p>
          <p className="mt-0.5 text-2xs text-muted">Employee change / swap requests appear here for approval.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="section-title">Seat requests</p>
        {pending.length > 0 && <span className="chip bg-notice-soft px-2 py-0.5 text-2xs text-notice">{pending.length} pending</span>}
      </div>
      <div className="space-y-2">
        {requests.slice(0, 6).map((r) => (
          <RequestRow key={r.id} req={r} people={people} onApprove={() => { approve(r.id); toast({ tone: 'success', title: 'Request approved', body: `${r.requesterName}'s ${r.type} approved — seat map updated.` }); if (r.targetDeskId) onFocusDesk(r.targetDeskId) }} onReject={() => { const reason = prompt('Reason for rejection (the employee will be notified):', 'Requested seat reserved for an incoming team.'); if (reason != null) { reject(r.id, reason); toast({ tone: 'warning', title: 'Request rejected', body: `${r.requesterName} notified.` }) } }} />
        ))}
      </div>
    </div>
  )
}

function RequestRow({ req, onApprove, onReject }: { req: NRequest; people: Map<string, NPerson>; onApprove: () => void; onReject: () => void }) {
  const statusTone = req.status === 'pending' ? 'text-notice bg-notice-soft' : req.status === 'approved' ? 'text-vacant bg-vacant-soft' : 'text-occupied bg-occupied-soft'
  return (
    <div className="rounded-xl border border-border bg-surface p-2.5">
      <div className="flex items-center gap-2">
        <span className={cn('grid h-6 w-6 place-items-center rounded-lg', req.type === 'swap' ? 'bg-brand-soft text-brand' : 'bg-notice-soft text-notice')}>
          {req.type === 'swap' ? <ArrowLeftRight className="h-3 w-3" /> : <MoveRight className="h-3 w-3" />}
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-content">{req.requesterName}</p>
        <span className={cn('chip px-1.5 py-0.5 text-2xs capitalize', statusTone)}>{req.status}</span>
      </div>
      <p className="mt-1.5 text-2xs text-muted">
        {req.type === 'change'
          ? <>#{req.currentDeskLabel ?? '—'} <span className="text-subtle">→</span> #{req.targetDeskLabel}</>
          : <>#{req.currentDeskLabel} <span className="text-subtle">↔</span> {req.otherPersonName} (#{req.otherDeskLabel})</>}
        {' · '}{req.reason}
      </p>
      <div className="mt-1 flex items-center gap-1 text-2xs text-subtle"><Clock className="h-3 w-3" />{relativeTime(req.requestDate)}</div>
      {req.status === 'pending' && (
        <div className="mt-2 flex items-center gap-2">
          <button onClick={onApprove} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-vacant px-2 py-1.5 text-2xs font-semibold text-white transition-opacity hover:opacity-90"><Check className="h-3 w-3" /> Approve</button>
          <button onClick={onReject} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-2xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-content"><X className="h-3 w-3" /> Reject</button>
        </div>
      )}
      {req.status === 'rejected' && req.decisionReason && <p className="mt-1.5 text-2xs text-occupied">Rejected · {req.decisionReason}</p>}
    </div>
  )
}
