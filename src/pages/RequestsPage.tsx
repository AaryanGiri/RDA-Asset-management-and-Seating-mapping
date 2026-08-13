import { useMemo, useState } from 'react'
import { Inbox, Check, X, ArrowRight, ArrowLeftRight, Clock, Mail } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, Segmented, Avatar, EmptyState, Modal, Field } from '@/components/ui'
import { useData } from '@/lib/store'
import { REQUEST_STATUS_META } from '@/lib/status'
import { cn, formatDate, relativeTime } from '@/lib/utils'
import type { RequestStatus, SeatRequest } from '@/lib/types'

export function RequestsPage() {
  const requests = useData((s) => s.seatRequests)
  const employees = useData((s) => s.employees)
  const approve = useData((s) => s.approveSeatRequest)
  const reject = useData((s) => s.rejectSeatRequest)
  const [tab, setTab] = useState<RequestStatus>('pending')
  const [rejecting, setRejecting] = useState<SeatRequest | null>(null)

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests])
  const list = requests.filter((r) => r.status === tab)

  return (
    <Page>
      <PageHeader
        icon={<Inbox className="h-5 w-5" />}
        title="Seat Requests"
        subtitle="Review and act on employee seat-change and seat-swap requests."
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'pending', label: <>Pending <Count n={counts.pending} /></> },
              { value: 'approved', label: <>Approved <Count n={counts.approved} /></> },
              { value: 'rejected', label: <>Rejected <Count n={counts.rejected} /></> },
            ]}
          />
        }
      />

      {list.length === 0 ? (
        <EmptyState icon={<Inbox className="h-5 w-5" />} title={`No ${tab} requests`} body={tab === 'pending' ? 'All caught up — no requests awaiting your review.' : `No ${tab} requests yet.`} />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {list.map((r) => {
            const emp = employees.find((e) => e.id === r.requesterId)
            const m = REQUEST_STATUS_META[r.status]
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={r.requesterName} hue={emp?.avatarHue ?? 210} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-content">{r.requesterName}</p>
                      <span className="chip bg-surface-2 text-2xs text-muted">{r.requesterCode}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      {r.type === 'change' ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
                      {r.type === 'change'
                        ? <>Seat change · <span className="text-content">{r.currentSeatNumber ?? '—'}</span> → <span className="font-semibold text-content">{r.requestedSeatNumber}</span></>
                        : <>Swap · <span className="text-content">{r.currentSeatNumber}</span> ↔ <span className="text-content">{r.otherSeatNumber}</span> <span className="text-subtle">({r.otherEmployeeName})</span></>}
                    </div>
                  </div>
                  <span className={cn('chip shrink-0', m.bg, m.text)}><span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />{m.label}</span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-surface-2/40 p-3 text-xs">
                  <Row label="Request type" value={r.type === 'change' ? 'Seat Change' : 'Seat Swap'} />
                  <Row label="Request date" value={formatDate(r.requestDate, { day: 'numeric', month: 'short', year: 'numeric' })} />
                  <Row label="Reason" value={r.reason} span />
                  {r.remarks && <Row label="Remarks" value={r.remarks} span />}
                  {r.status === 'rejected' && r.decisionReason && <Row label="Rejection reason" value={r.decisionReason} span tone="text-occupied" />}
                  {r.status !== 'pending' && r.decidedAt && <Row label="Decided" value={relativeTime(r.decidedAt)} />}
                </dl>

                {r.status === 'pending' ? (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-2xs text-subtle"><Clock className="h-3.5 w-3.5" /> {relativeTime(r.requestDate)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setRejecting(r)} className="btn-ghost text-occupied hover:bg-occupied-soft"><X className="h-4 w-4" /> Reject</button>
                      <button onClick={() => approve(r.id)} className="btn-primary"><Check className="h-4 w-4" /> Approve</button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-2xs text-subtle"><Mail className="h-3.5 w-3.5" /> Employee notified of the {r.status === 'approved' ? 'approval' : 'rejection'}.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <RejectModal req={rejecting} onClose={() => setRejecting(null)} onConfirm={async (reason) => { if (rejecting) await reject(rejecting.id, reason); setRejecting(null) }} />
    </Page>
  )
}

function Count({ n }: { n: number }) {
  if (!n) return null
  return <span className="ml-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{n}</span>
}

function Row({ label, value, span, tone }: { label: string; value: string; span?: boolean; tone?: string }) {
  return (
    <div className={cn(span && 'col-span-2')}>
      <dt className="text-2xs uppercase tracking-wide text-subtle">{label}</dt>
      <dd className={cn('mt-0.5 font-medium', tone ?? 'text-content')}>{value}</dd>
    </div>
  )
}

function RejectModal({ req, onClose, onConfirm }: { req: SeatRequest | null; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal open={!!req} onClose={onClose}>
      <div className="border-b border-border px-5 py-4"><h3 className="text-base font-semibold text-content">Reject request</h3><p className="text-xs text-muted">{req?.requesterName}'s {req?.type} request. The employee will be notified.</p></div>
      <div className="p-5">
        <Field label="Rejection reason"><textarea className="input min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Requested seat is reserved for an incoming team." /></Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button onClick={() => { setReason(''); onClose() }} className="btn-ghost">Cancel</button>
        <button onClick={() => { onConfirm(reason.trim() || 'Not approved at this time.'); setReason('') }} className="btn-primary bg-occupied hover:bg-occupied"><X className="h-4 w-4" /> Confirm reject</button>
      </div>
    </Modal>
  )
}
