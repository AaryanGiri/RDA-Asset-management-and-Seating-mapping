import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeftRight, Plus, Sparkles, Check, Truck, PackageCheck, Send, Clock,
  ArrowRight, MapPin, X, ScanLine,
} from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, ConditionBadge, Modal, Field, Spinner, Progress } from '@/components/ui'
import { CategoryIcon } from '@/features/assets/assetUi'
import { useData, officeName } from '@/lib/store'
import { useUI } from '@/lib/uiStore'
import { CONDITION_META } from '@/lib/status'
import { cn, relativeTime } from '@/lib/utils'
import type { MovementRequest, MovementStage, AssetCondition } from '@/lib/types'

const STAGES: { id: MovementStage; label: string; icon: typeof Clock; tone: string }[] = [
  { id: 'requested', label: 'Requested', icon: Clock, tone: 'text-muted bg-surface-3' },
  { id: 'ai-review', label: 'AI Review', icon: Sparkles, tone: 'text-brand bg-brand-soft' },
  { id: 'approved', label: 'Approved', icon: Check, tone: 'text-vacant bg-vacant-soft' },
  { id: 'in-transit', label: 'In Transit', icon: Truck, tone: 'text-notice bg-notice-soft' },
  { id: 'received', label: 'Received', icon: PackageCheck, tone: 'text-vacant bg-vacant-soft' },
]

export function MovementsPage() {
  const movements = useData((s) => s.movements)
  const [newOpen, setNewOpen] = useState(false)

  const byStage = useMemo(() => {
    const m: Record<string, MovementRequest[]> = {}
    STAGES.forEach((s) => (m[s.id] = []))
    movements.forEach((mv) => m[mv.stage]?.push(mv))
    return m
  }, [movements])

  const open = movements.filter((m) => m.stage !== 'received' && m.stage !== 'rejected').length

  return (
    <Page wide>
      <PageHeader
        title="Asset Movements"
        subtitle={`${open} in progress · governed request → AI review → confirm → transit → receipt`}
        icon={<ArrowLeftRight className="h-5 w-5" />}
        actions={<button className="btn-primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New movement</button>}
      />

      {/* flow stepper */}
      <div className="mb-5 hidden items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-3 md:flex">
        {STAGES.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            <div className="flex items-center gap-2 rounded-xl px-3 py-1.5">
              <span className={cn('grid h-7 w-7 place-items-center rounded-lg', s.tone)}><s.icon className="h-4 w-4" /></span>
              <span className="text-sm font-medium text-content">{s.label}</span>
              <span className="chip bg-surface-2 px-1.5 py-0.5 text-2xs text-muted">{byStage[s.id].length}</span>
            </div>
            {i < STAGES.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-subtle" />}
          </div>
        ))}
      </div>

      {/* board */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {STAGES.map((s) => (
          <div key={s.id} className="flex flex-col rounded-2xl border border-border bg-surface-2/40 p-2.5">
            <div className="mb-2 flex items-center justify-between px-1.5 py-1">
              <div className="flex items-center gap-2">
                <span className={cn('grid h-6 w-6 place-items-center rounded-md', s.tone)}><s.icon className="h-3.5 w-3.5" /></span>
                <span className="text-xs font-semibold text-content">{s.label}</span>
              </div>
              <span className="text-2xs font-semibold text-subtle">{byStage[s.id].length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {byStage[s.id].length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-6 text-center text-2xs text-subtle">Empty</div>
              ) : (
                byStage[s.id].map((m) => <MovementCard key={m.id} m={m} />)
              )}
            </div>
          </div>
        ))}
      </div>

      {newOpen && <NewMovementModal onClose={() => setNewOpen(false)} />}
    </Page>
  )
}

function MovementCard({ m }: { m: MovementRequest }) {
  const assets = useData((s) => s.assets)
  const advanceMovement = useData((s) => s.advanceMovement)
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const asset = assets.find((a) => a.id === m.assetId)

  const advance = async () => {
    setBusy(true)
    await advanceMovement(m.id, m.aiCondition)
    setBusy(false)
  }

  const cta: Record<MovementStage, { label: string; icon: typeof Send } | null> = {
    requested: { label: 'Send for AI review', icon: Sparkles },
    'ai-review': { label: 'Confirm & approve', icon: Check },
    approved: { label: 'Dispatch', icon: Truck },
    'in-transit': { label: 'Receipt scan', icon: ScanLine },
    received: null,
    rejected: null,
  }
  const action = cta[m.stage]

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-surface p-3 shadow-card">
      <button onClick={() => nav(`/assets/${m.assetId}`)} className="flex w-full items-center gap-2 text-left">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
          {asset && <CategoryIcon catId={asset.categoryId} className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-content">{m.assetName}</p>
          <p className="truncate font-mono text-2xs text-muted">{m.assetTag}</p>
        </div>
      </button>

      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5 text-2xs">
        <MapPin className="h-3 w-3 shrink-0 text-subtle" />
        <span className="truncate text-muted">{m.fromRoom}</span>
        <ArrowRight className="h-3 w-3 shrink-0 text-subtle" />
        <span className="truncate font-medium text-content">{m.toRoom}</span>
      </div>
      <p className="mt-1.5 text-2xs text-subtle">{m.reason} · {officeName(m.toOfficeId)}</p>

      {m.stage === 'ai-review' && m.aiCondition && (
        <div className="mt-2 rounded-lg border border-brand/30 bg-brand-soft p-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-2xs font-semibold text-brand"><Sparkles className="h-3 w-3" /> AI condition</span>
            <span className="text-2xs font-semibold text-content">{m.aiConfidence}%</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ConditionBadge condition={m.aiCondition} className="px-1.5 py-0.5 text-2xs" />
            <div className="flex-1"><Progress value={m.aiConfidence ?? 0} tone="brand" className="h-1.5" /></div>
          </div>
        </div>
      )}
      {(m.stage === 'approved' || m.stage === 'in-transit' || m.stage === 'received') && m.humanCondition && (
        <div className="mt-2 flex items-center gap-1.5 text-2xs text-muted">
          <Check className="h-3 w-3 text-vacant" /> Confirmed {CONDITION_META[m.humanCondition].label} by Admin
        </div>
      )}

      {action ? (
        <button onClick={advance} disabled={busy} className="btn-primary mt-2.5 h-8 w-full text-xs">
          {busy ? <Spinner className="h-3.5 w-3.5" /> : <action.icon className="h-3.5 w-3.5" />} {action.label}
        </button>
      ) : (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-vacant-soft px-2 py-1.5 text-2xs font-medium text-vacant">
          <PackageCheck className="h-3.5 w-3.5" /> Received {relativeTime(m.updatedAt)}
        </div>
      )}
    </motion.div>
  )
}

function NewMovementModal({ onClose }: { onClose: () => void }) {
  const assets = useData((s) => s.assets)
  const offices = useData((s) => s.offices)
  const createMovement = useData((s) => s.createMovement)
  const toast = useUI((s) => s.toast)
  const [assetId, setAssetId] = useState('')
  const [toOffice, setToOffice] = useState('hq')
  const [toRoom, setToRoom] = useState('North Bay')
  const [reason, setReason] = useState('Team relocation')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const asset = assets.find((a) => a.id === assetId)
  const matches = assets.filter((a) => `${a.tag} ${a.name}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8)

  const submit = async () => {
    if (!asset) return
    setBusy(true)
    await createMovement({
      assetId: asset.id, assetTag: asset.tag, assetName: asset.name, fromOfficeId: asset.officeId, fromRoom: asset.room,
      toOfficeId: toOffice, toRoom, reason, requestedBy: 'A. Menon (Admin)', approver: 'A. Menon (Admin)',
      expectedDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    })
    setBusy(false)
    toast({ tone: 'info', title: 'Movement raised', body: `${asset.tag} → ${toRoom}` })
    onClose()
  }

  return (
    <Modal open onClose={onClose} width={480}>
      <div className="flex items-center justify-between border-b border-border p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-notice-soft text-notice"><ArrowLeftRight className="h-5 w-5" /></div>
          <div><p className="text-sm font-semibold text-content">New movement request</p><p className="text-xs text-muted">Pick an asset & destination</p></div>
        </div>
        <button onClick={onClose} className="text-subtle hover:text-content"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4 p-5">
        {!asset ? (
          <Field label="Asset">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tag or name…" className="input" />
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {matches.map((a) => (
                <button key={a.id} onClick={() => setAssetId(a.id)} className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-surface-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-muted"><CategoryIcon catId={a.categoryId} className="h-4 w-4" /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-content">{a.name}</p><p className="truncate font-mono text-2xs text-muted">{a.tag} · {a.room}</p></div>
                </button>
              ))}
            </div>
          </Field>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/60 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3 text-muted"><CategoryIcon catId={asset.categoryId} className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-content">{asset.name}</p><p className="truncate font-mono text-2xs text-muted">{asset.tag} · from {asset.room}</p></div>
            <button onClick={() => setAssetId('')} className="text-xs font-medium text-brand hover:underline">Change</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Destination office"><select value={toOffice} onChange={(e) => setToOffice(e.target.value)} className="input">{offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <Field label="Destination room"><input value={toRoom} onChange={(e) => setToRoom(e.target.value)} className="input" /></Field>
        </div>
        <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className="input" /></Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-border p-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!asset || busy}>{busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Raise request</button>
      </div>
    </Modal>
  )
}
