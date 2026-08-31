import { useMemo, useState } from 'react'
import { ArrowLeftRight, MoveRight, Wrench, Ban, DoorOpen, RotateCcw, Mail, Hash, Armchair, MapPin } from 'lucide-react'
import { Sheet, Modal, Field, Avatar } from '@/components/ui'
import { useUI } from '@/lib/uiStore'
import { cn } from '@/lib/utils'
import { SEAT_STATUS, TYPE_META } from './meta'
import { useNeighborhood } from './store'
import { NEIGHBORHOOD, type NDesk, type NPerson } from './data'

interface RequestPreset {
  type: 'change' | 'swap'
  targetDeskId?: string
  otherPersonId?: string
}

export function DeskDetail({
  deskId, people, role, onClose, onFocusDesk,
}: {
  deskId?: string
  people: Map<string, NPerson>
  role: 'admin' | 'employee'
  onClose: () => void
  onFocusDesk: (id: string) => void
}) {
  const desks = useNeighborhood((s) => s.desks)
  const personaId = useNeighborhood((s) => s.personaId)
  const release = useNeighborhood((s) => s.release)
  const setStatus = useNeighborhood((s) => s.setStatus)
  const toast = useUI((s) => s.toast)
  const [preset, setPreset] = useState<RequestPreset | null>(null)

  const desk = desks.find((d) => d.id === deskId)
  const person = desk?.personId ? people.get(desk.personId) : undefined
  const isMine = !!person && person.id === personaId
  const myDesk = desks.find((d) => d.personId === personaId)

  if (!desk) return null
  const m = SEAT_STATUS[desk.status]
  const occupied = desk.status === 'occupied' || desk.status === 'notice'

  return (
    <>
      <Sheet
        open={!!deskId}
        onClose={onClose}
        width={400}
        title={
          <div className="flex items-center gap-2.5">
            <div className={cn('grid h-9 w-9 place-items-center rounded-xl', m.bg, m.text)}><Armchair className="h-4.5 w-4.5" /></div>
            <div>
              <p className="text-sm font-semibold text-content">Desk {desk.label}</p>
              <p className="text-2xs text-muted">{desk.pod} · {NEIGHBORHOOD.name}</p>
            </div>
          </div>
        }
      >
        <div className="space-y-5 p-5">
          <span className={cn('chip', m.bg, m.text)}><span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />{m.label}{isMine ? ' · You' : ''}</span>

          {occupied && person ? (
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={person.name} hue={person.hue} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-content">{person.name}</p>
                  <p className="truncate text-xs text-muted">{person.title}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2.5 text-xs">
                <InfoRow icon={Hash} label="Employee code" value={person.code} />
                <InfoRow icon={Armchair} label="Seat / desk" value={`#${desk.label} · ${desk.pod}`} />
                <InfoRow icon={MapPin} label="Location" value={`${NEIGHBORHOOD.office} · ${NEIGHBORHOOD.floor}`} />
                {person.email && <InfoRow icon={Mail} label="Email" value={person.email} />}
                <div className="flex items-center gap-2 pt-1">
                  <span className={cn('chip px-2 py-0.5 text-2xs', TYPE_META[person.type].soft, TYPE_META[person.type].text)}>{TYPE_META[person.type].label}</span>
                </div>
              </dl>
              {desk.note && <p className="mt-3 rounded-lg bg-notice-soft px-3 py-2 text-2xs text-notice">{desk.note}</p>}
            </div>
          ) : (
            <div className="card p-4">
              <p className="text-sm font-medium text-content">{m.label} desk</p>
              <p className="mt-1 text-xs text-muted">{desk.note ?? 'This desk is currently unassigned.'}</p>
            </div>
          )}

          {/* ── actions ──────────────────────────────────────────────── */}
          <div>
            <p className="section-title mb-2">Actions</p>
            <div className="space-y-2">
              {role === 'employee' && (
                <>
                  {isMine && (
                    <>
                      <ActionBtn icon={MoveRight} label="Request a seat change" onClick={() => setPreset({ type: 'change' })} primary />
                      <ActionBtn icon={ArrowLeftRight} label="Request a seat swap" onClick={() => setPreset({ type: 'swap' })} />
                    </>
                  )}
                  {!isMine && occupied && myDesk && (
                    <ActionBtn icon={ArrowLeftRight} label={`Request swap with ${person!.name.split(' ')[0]}`} onClick={() => setPreset({ type: 'swap', otherPersonId: person!.id })} primary />
                  )}
                  {!occupied && desk.status === 'vacant' && myDesk && (
                    <ActionBtn icon={MoveRight} label="Request to move to this desk" onClick={() => setPreset({ type: 'change', targetDeskId: desk.id })} primary />
                  )}
                  {!myDesk && <p className="text-xs text-muted">You don't have a desk assigned in this neighbourhood yet.</p>}
                </>
              )}

              {role === 'admin' && (
                <>
                  {occupied && <ActionBtn icon={DoorOpen} label="Release desk (mark vacant)" onClick={() => { release(desk.id); toast({ tone: 'info', title: 'Desk released', body: `Desk ${desk.label} is now vacant.` }) }} />}
                  {desk.status !== 'maintenance' && <ActionBtn icon={Wrench} label="Mark for maintenance" onClick={() => { setStatus(desk.id, 'maintenance', 'Flagged for maintenance by Admin'); toast({ tone: 'warning', title: 'Marked maintenance', body: `Desk ${desk.label} set to maintenance.` }) }} />}
                  {desk.status !== 'blocked' && <ActionBtn icon={Ban} label="Block desk" onClick={() => { setStatus(desk.id, 'blocked', 'Blocked / reserved by Admin'); toast({ tone: 'warning', title: 'Desk blocked', body: `Desk ${desk.label} is blocked.` }) }} />}
                  {(desk.status === 'maintenance' || desk.status === 'blocked') && <ActionBtn icon={RotateCcw} label="Return to available" onClick={() => { setStatus(desk.id, 'vacant', undefined); toast({ tone: 'success', title: 'Desk available', body: `Desk ${desk.label} is available again.` }) }} />}
                </>
              )}
            </div>
          </div>
        </div>
      </Sheet>

      {preset && (
        <RequestModal
          preset={preset}
          people={people}
          onClose={() => setPreset(null)}
          onDone={() => { setPreset(null); onClose() }}
          onFocusDesk={onFocusDesk}
        />
      )}
    </>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted"><Icon className="h-3.5 w-3.5" />{label}</dt>
      <dd className="text-right font-medium text-content">{value}</dd>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, onClick, primary }: { icon: typeof Mail; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors', primary ? 'border-brand bg-brand text-brand-fg hover:bg-brand-strong' : 'border-border bg-surface text-content hover:bg-surface-2')}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  )
}

// ── Seat change / swap request form ──────────────────────────────────────────
function RequestModal({
  preset, people, onClose, onDone, onFocusDesk,
}: {
  preset: RequestPreset
  people: Map<string, NPerson>
  onClose: () => void
  onDone: () => void
  onFocusDesk: (id: string) => void
}) {
  const desks = useNeighborhood((s) => s.desks)
  const personaId = useNeighborhood((s) => s.personaId)
  const requestChange = useNeighborhood((s) => s.requestChange)
  const requestSwap = useNeighborhood((s) => s.requestSwap)
  const toast = useUI((s) => s.toast)

  const me = people.get(personaId)
  const myDesk = desks.find((d) => d.personId === personaId)
  const [targetDeskId, setTargetDeskId] = useState(preset.targetDeskId ?? '')
  const [otherPersonId, setOtherPersonId] = useState(preset.otherPersonId ?? '')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [busy, setBusy] = useState(false)

  const vacantDesks = useMemo(() => desks.filter((d) => d.status === 'vacant'), [desks])
  const others = useMemo(
    () => desks.filter((d) => (d.status === 'occupied' || d.status === 'notice') && d.personId !== personaId).map((d) => ({ desk: d, person: people.get(d.personId!)! })),
    [desks, personaId, people],
  )

  const valid = reason.trim() && (preset.type === 'change' ? targetDeskId : otherPersonId)

  const submit = () => {
    if (!valid) return
    setBusy(true)
    if (preset.type === 'change') {
      const req = requestChange({ requesterId: personaId, targetDeskId, reason: reason.trim(), remarks: remarks.trim() || undefined })
      toast({ tone: 'success', title: 'Seat change request sent', body: `${req.currentDeskLabel ?? '—'} → ${req.targetDeskLabel}. Admin notified by email.` })
      if (req.targetDeskId) onFocusDesk(req.targetDeskId)
    } else {
      const req = requestSwap({ requesterId: personaId, otherPersonId, reason: reason.trim(), remarks: remarks.trim() || undefined })
      toast({ tone: 'success', title: 'Seat swap request sent', body: `${req.currentDeskLabel} ↔ ${req.otherDeskLabel} (${req.otherPersonName}). Admin notified.` })
    }
    setBusy(false)
    onDone()
  }

  return (
    <Modal open onClose={onClose} width={480}>
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-content">{preset.type === 'change' ? 'Request a seat change' : 'Request a seat swap'}</h2>
        <p className="mt-0.5 text-xs text-muted">Sent to Admin for approval — your seat won't change until it's approved.</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <ReadonlyField label="Employee" value={me?.name ?? '—'} />
          <ReadonlyField label="Employee code" value={me?.code ?? '—'} />
          <ReadonlyField label="Current seat" value={myDesk ? `#${myDesk.label} · ${myDesk.pod}` : 'Unassigned'} />
          <ReadonlyField label="Request date" value={new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
        </div>

        {preset.type === 'change' ? (
          <Field label="Requested seat">
            <select className="input" value={targetDeskId} onChange={(e) => setTargetDeskId(e.target.value)} disabled={!!preset.targetDeskId}>
              <option value="">Select a vacant desk…</option>
              {vacantDesks.map((d) => <option key={d.id} value={d.id}>Desk #{d.label} · {d.pod}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Swap with">
            <select className="input" value={otherPersonId} onChange={(e) => setOtherPersonId(e.target.value)} disabled={!!preset.otherPersonId}>
              <option value="">Select a colleague…</option>
              {others.map(({ desk, person }) => <option key={person.id} value={person.id}>{person.name} · #{desk.label}</option>)}
            </select>
          </Field>
        )}

        <Field label="Reason">
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={preset.type === 'swap' ? 'e.g. Sit with my project team' : 'e.g. Prefer a quieter zone'} />
        </Field>
        <Field label="Additional remarks" hint="Optional">
          <textarea className="input min-h-[72px] resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Anything the Admin should know…" />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={!valid || busy} className="btn-primary">Submit request</button>
      </div>
    </Modal>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-content">{value}</div>
    </div>
  )
}
