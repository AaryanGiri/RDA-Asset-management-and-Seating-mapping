import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft, Printer, ArrowLeftRight, ShieldCheck, MapPin, User, Building2, Calendar,
  IndianRupee, ShieldAlert, Wrench, Sparkles, Check, Camera, Clock, X, ChevronRight, Cpu, Boxes,
} from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, ConditionBadge, AssetStatusBadge, Avatar, Modal, Field, Spinner, Progress, EmptyState } from '@/components/ui'
import { CategoryIcon, PhotoTile, QrLabel } from '@/features/assets/assetUi'
import { useData, officeName } from '@/lib/store'
import { CONDITION_META } from '@/lib/status'
import { cn, formatCurrency, formatDate, relativeTime, daysBetween, uid } from '@/lib/utils'
import type { Asset, AssetCondition } from '@/lib/types'

const CONDITIONS: AssetCondition[] = ['new', 'good', 'fair', 'damaged', 'beyond-repair']

export function AssetPassport() {
  const { id } = useParams()
  const nav = useNavigate()
  const asset = useData((s) => s.assets.find((a) => a.id === id))
  const categories = useData((s) => s.categories)
  const employees = useData((s) => s.employees)
  const updateAsset = useData((s) => s.updateAsset)
  const [flow, setFlow] = useState<null | 'print' | 'move' | 'verify'>(null)

  const cat = categories.find((c) => c.id === asset?.categoryId)
  const custodian = employees.find((e) => e.id === asset?.custodianId)

  if (!asset || !cat) {
    return <Page><EmptyState icon={<Boxes className="h-5 w-5" />} title="Asset not found" body="This asset may have been removed." action={<Link to="/assets" className="btn-primary">Back to register</Link>} /></Page>
  }

  const due = daysBetween(asset.nextVerificationDue)
  const condMeta = CONDITION_META[asset.condition]

  const capture = (view: string) => {
    updateAsset(asset.id, {
      photos: [...asset.photos, { id: uid('ph'), view, hue: Math.floor(Math.random() * 360), capturedAt: new Date().toISOString() }],
    })
  }
  const capturedViews = new Set(asset.photos.map((p) => p.view))
  const missingViews = cat.photoViews.filter((v) => !capturedViews.has(v))

  return (
    <Page wide>
      <button onClick={() => nav('/assets')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-content">
        <ArrowLeft className="h-4 w-4" /> Asset Register
      </button>

      <PageHeader
        title={asset.name}
        subtitle={`${cat.name} · ${asset.brand} ${asset.model}`}
        icon={<CategoryIcon catId={asset.categoryId} className="h-5 w-5" />}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setFlow('print')}><Printer className="h-4 w-4" /> Print label</button>
            <button className="btn-secondary" onClick={() => setFlow('move')}><ArrowLeftRight className="h-4 w-4" /> Move</button>
            <button className="btn-primary" onClick={() => setFlow('verify')}><ShieldCheck className="h-4 w-4" /> Verify condition</button>
          </>
        }
      />

      {/* identity strip */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="chip bg-surface-2 font-mono text-content">{asset.tag}</span>
        <ConditionBadge condition={asset.condition} />
        <AssetStatusBadge status={asset.status} />
        {asset.flagged && (
          <span className="chip bg-maint-soft text-maint"><ShieldAlert className="h-3.5 w-3.5" /> {asset.flagged}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* main */}
        <div className="space-y-4 lg:col-span-2">
          {/* photo history */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-content">Photo history</h3>
                <p className="mt-0.5 text-xs text-muted">Guided capture · {cat.photoViews.length} views per {cat.name.toLowerCase()}</p>
              </div>
              <span className="chip bg-surface-2 text-muted">{asset.photos.length} captured</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {asset.photos.map((p) => (
                <PhotoTile key={p.id} hue={p.hue} view={p.view} catId={asset.categoryId} />
              ))}
              {missingViews.map((v) => (
                <PhotoTile key={v} view={v} empty onCapture={() => capture(v)} />
              ))}
            </div>
            {missingViews.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-2xs text-subtle"><Camera className="h-3.5 w-3.5" /> {missingViews.length} guided view{missingViews.length > 1 ? 's' : ''} pending — tap a slot to capture.</p>
            )}
          </div>

          {/* timeline */}
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-content">Lifecycle timeline</h3>
            <ol className="relative space-y-0 border-l border-border pl-5">
              {[...asset.timeline].reverse().map((ev) => (
                <li key={ev.id} className="relative pb-5 last:pb-0">
                  <span className={cn('absolute -left-[26px] grid h-6 w-6 place-items-center rounded-full border-2 border-surface', timelineTone(ev.type))}>
                    {timelineIcon(ev.type)}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-content">{ev.title}</p>
                    {ev.ai && <span className="chip bg-brand-soft px-1.5 py-0.5 text-2xs text-brand"><Sparkles className="h-2.5 w-2.5" /> AI assist</span>}
                    {ev.condition && <ConditionBadge condition={ev.condition} className="px-1.5 py-0.5 text-2xs" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{ev.detail}</p>
                  <p className="mt-1 text-2xs text-subtle">{formatDate(ev.timestamp)} · {ev.actor}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-4">
          <div className="card flex flex-col items-center p-5">
            <div className="rounded-xl border border-border bg-white p-3">
              <QRCodeSVG value={asset.tag} size={132} bgColor="#ffffff" fgColor="#0b1020" level="M" />
            </div>
            <p className="mt-3 font-mono text-sm font-semibold text-content">{asset.tag}</p>
            <p className="text-2xs text-muted">Scan to open this passport</p>
            <button className="btn-secondary mt-3 w-full" onClick={() => setFlow('print')}><Printer className="h-4 w-4" /> Print label</button>
          </div>

          <InfoCard title="Identity" icon={Cpu}>
            <InfoRow label="Brand · Model" value={`${asset.brand} ${asset.model}`} />
            <InfoRow label="Serial number" value={asset.serialNumber} mono />
            <InfoRow label="Category" value={cat.name} />
            <InfoRow label="Supplier" value={asset.supplier} />
          </InfoCard>

          <InfoCard title="Procurement" icon={IndianRupee}>
            <InfoRow label="Purchase date" value={formatDate(asset.purchaseDate)} />
            <InfoRow label="Purchase value" value={formatCurrency(asset.purchaseValue)} />
            <InfoRow label="Warranty" value={daysBetween(asset.warrantyUntil) > 0 ? `Until ${formatDate(asset.warrantyUntil)}` : 'Expired'} tone={daysBetween(asset.warrantyUntil) > 0 ? undefined : 'text-occupied'} />
          </InfoCard>

          <InfoCard title="Location & custodian" icon={MapPin}>
            <InfoRow label="Office" value={officeName(asset.officeId)} />
            <InfoRow label="Room / zone" value={asset.room} />
            <div className="flex items-center gap-2.5 pt-1">
              {custodian && <Avatar name={custodian.fullName} hue={custodian.avatarHue} size={34} />}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-content">{custodian?.fullName ?? 'Unassigned'}</p>
                <p className="truncate text-2xs text-muted">{custodian?.designation} · {asset.department}</p>
              </div>
            </div>
          </InfoCard>

          {/* condition & verification */}
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-subtle" /><h3 className="text-sm font-semibold text-content">Condition & verification</h3></div>
            <div className="mb-1 flex items-center justify-between">
              <ConditionBadge condition={asset.condition} />
              <span className="text-sm font-semibold text-content">{condMeta.score}<span className="text-xs text-subtle">/100</span></span>
            </div>
            <Progress value={condMeta.score} tone={asset.condition === 'damaged' || asset.condition === 'beyond-repair' ? 'occupied' : asset.condition === 'fair' ? 'maint' : 'vacant'} className="mb-3" />
            <div className="space-y-1.5 text-xs">
              <InfoRow label="Last verified" value={asset.lastVerifiedAt ? relativeTime(asset.lastVerifiedAt) : 'Never'} />
              <InfoRow label="Next due" value={due <= 0 ? `Overdue by ${Math.abs(due)}d` : `in ${due}d`} tone={due <= 0 ? 'text-occupied' : due <= 7 ? 'text-maint' : undefined} />
            </div>
            <button className="btn-primary mt-3 w-full" onClick={() => setFlow('verify')}><Sparkles className="h-4 w-4" /> Run AI verification</button>
          </div>
        </div>
      </div>

      {flow === 'print' && <PrintModal asset={asset} category={cat} onClose={() => setFlow(null)} />}
      {flow === 'move' && <MoveModal asset={asset} onClose={() => setFlow(null)} onDone={() => { setFlow(null); nav('/movements') }} />}
      {flow === 'verify' && <VerifyModal asset={asset} onClose={() => setFlow(null)} />}
    </Page>
  )
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-subtle" /><h3 className="text-sm font-semibold text-content">{title}</h3></div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function InfoRow({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted">{label}</span>
      <span className={cn('truncate text-right font-medium text-content', mono && 'font-mono', tone)}>{value}</span>
    </div>
  )
}

function timelineTone(type: string) {
  const m: Record<string, string> = {
    onboarded: 'bg-brand-soft text-brand', moved: 'bg-notice-soft text-notice', verified: 'bg-vacant-soft text-vacant',
    'condition-change': 'bg-maint-soft text-maint', flagged: 'bg-occupied-soft text-occupied', 'custodian-change': 'bg-surface-3 text-muted',
    repair: 'bg-maint-soft text-maint', disposed: 'bg-occupied-soft text-occupied',
  }
  return m[type] ?? 'bg-surface-3 text-muted'
}
function timelineIcon(type: string) {
  const c = 'h-3 w-3'
  if (type === 'onboarded') return <Boxes className={c} />
  if (type === 'moved') return <ArrowLeftRight className={c} />
  if (type === 'verified') return <ShieldCheck className={c} />
  if (type === 'flagged') return <ShieldAlert className={c} />
  if (type === 'repair') return <Wrench className={c} />
  if (type === 'custodian-change') return <User className={c} />
  return <Clock className={c} />
}

// ── Print label ──────────────────────────────────────────────────────────────
function PrintModal({ asset, category, onClose }: { asset: Asset; category: any; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} width={380}>
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-sm font-semibold text-content">Printable QR label</p>
        <button onClick={onClose} className="text-subtle hover:text-content"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex flex-col items-center gap-4 p-5">
        <div className="print-area">
          <QrLabel tag={asset.tag} name={asset.name} category={category} serial={asset.serialNumber} />
        </div>
        <button className="btn-primary w-full" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print label</button>
        <p className="text-center text-2xs text-subtle">Durable, tamper-evident tag · attach to the physical asset.</p>
      </div>
    </Modal>
  )
}

// ── Move ─────────────────────────────────────────────────────────────────────
function MoveModal({ asset, onClose, onDone }: { asset: Asset; onClose: () => void; onDone: () => void }) {
  const offices = useData((s) => s.offices)
  const createMovement = useData((s) => s.createMovement)
  const [toOffice, setToOffice] = useState(offices.find((o) => o.id !== asset.officeId)?.id ?? asset.officeId)
  const [toRoom, setToRoom] = useState('North Bay')
  const [reason, setReason] = useState('Team relocation')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    await createMovement({
      assetId: asset.id, assetTag: asset.tag, assetName: asset.name,
      fromOfficeId: asset.officeId, fromRoom: asset.room, toOfficeId: toOffice, toRoom,
      reason, requestedBy: 'A. Menon (Admin)', approver: 'A. Menon (Admin)', expectedDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    })
    setBusy(false)
    onDone()
  }
  return (
    <Modal open onClose={onClose} width={460}>
      <div className="flex items-center gap-3 border-b border-border p-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-notice-soft text-notice"><ArrowLeftRight className="h-5 w-5" /></div>
        <div><p className="text-sm font-semibold text-content">Raise movement request</p><p className="text-xs text-muted">{asset.tag} · from {asset.room}</p></div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Destination office">
            <select value={toOffice} onChange={(e) => setToOffice(e.target.value)} className="input">
              {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Destination room"><input value={toRoom} onChange={(e) => setToRoom(e.target.value)} className="input" /></Field>
        </div>
        <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className="input" /></Field>
        <div className="rounded-xl bg-surface-2 p-3 text-2xs text-muted">
          The request enters a governed workflow: <span className="font-medium text-content">AI condition review → human confirm → in-transit → receipt scan</span>.
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-border p-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Raise request</button>
      </div>
    </Modal>
  )
}

// ── Verify (inline AI) ─────────────────────────────────────────────────────────
function VerifyModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const updateAsset = useData((s) => s.updateAsset)
  const pushNotification = useData((s) => s.pushNotification)
  const [stage, setStage] = useState<'capture' | 'analyzing' | 'review'>('capture')
  const [ai, setAi] = useState<{ condition: AssetCondition; confidence: number; area: { x: number; y: number; r: number } | null } | null>(null)
  const [choice, setChoice] = useState<AssetCondition | null>(null)
  const prior = asset.condition === 'new' ? 'good' : asset.condition

  const runAI = () => {
    setStage('analyzing')
    setTimeout(() => {
      const ladder = CONDITIONS
      const pi = Math.max(0, ladder.indexOf(prior))
      const drift = Math.random() < 0.55 ? 0 : 1
      const condition = ladder[Math.min(ladder.length - 1, pi + drift)]
      const confidence = Math.round(76 + Math.random() * 20)
      const area = drift > 0 ? { x: 0.34 + Math.random() * 0.3, y: 0.3 + Math.random() * 0.35, r: 0.14 + Math.random() * 0.06 } : null
      setAi({ condition, confidence, area })
      setChoice(condition)
      setStage('review')
    }, 1500)
  }

  const commit = (decision: string) => {
    if (!choice) return
    updateAsset(asset.id, {
      condition: choice,
      lastVerifiedAt: new Date().toISOString(),
      nextVerificationDue: new Date(Date.now() + 30 * 86400000).toISOString(),
      flagged: decision === 'flag-repair' ? 'Flagged for repair at verification' : asset.flagged,
      timeline: [...asset.timeline, { id: uid('tl'), type: 'verified', title: 'Monthly verification', detail: `AI suggested ${CONDITION_META[choice].label} (${ai?.confidence}%); Admin ${decision.replace('-', ' ')}.`, actor: 'System · AI assist', timestamp: new Date().toISOString(), condition: choice, ai: true }],
    })
    pushNotification({ kind: 'verification', tone: decision === 'flag-repair' ? 'warning' : 'success', title: 'Verification recorded', body: `${asset.tag} · ${CONDITION_META[choice].label}.` })
    onClose()
  }

  return (
    <Modal open onClose={onClose} width={520}>
      <div className="flex items-center gap-3 border-b border-border p-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><ShieldCheck className="h-5 w-5" /></div>
        <div><p className="text-sm font-semibold text-content">Condition verification</p><p className="text-xs text-muted">{asset.tag} · AI-assisted · human decides</p></div>
      </div>
      <div className="p-5">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-2xs font-medium text-subtle">Previous photo</p>
            <PhotoTile hue={asset.photos[0]?.hue ?? 200} view="Last verified" catId={asset.categoryId} />
          </div>
          <div>
            <p className="mb-1.5 text-2xs font-medium text-subtle">New capture {stage === 'review' && ai?.area && '· change detected'}</p>
            <PhotoTile hue={(asset.photos[0]?.hue ?? 200) + 12} view="Now" catId={asset.categoryId} highlight={stage === 'review' ? ai?.area : null} />
          </div>
        </div>

        {stage === 'capture' && (
          <button className="btn-primary w-full" onClick={runAI}><Sparkles className="h-4 w-4" /> Run AI condition check</button>
        )}
        {stage === 'analyzing' && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-surface-2 py-4">
            <Spinner className="h-5 w-5 text-brand" />
            <span className="text-sm font-medium text-content">Analyzing image & comparing to last capture…</span>
          </div>
        )}
        {stage === 'review' && ai && (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand/30 bg-brand-soft p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand" />
                  <span className="text-sm font-semibold text-content">AI suggestion</span>
                </div>
                <span className="chip bg-surface px-2 py-0.5 text-xs font-semibold text-content">{ai.confidence}% confidence</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ConditionBadge condition={ai.condition} />
                <span className="text-xs text-muted">{ai.condition === prior ? 'No change from last verification' : `Changed from ${CONDITION_META[prior].label}`}</span>
              </div>
              <div className="mt-2"><Progress value={ai.confidence} tone="brand" /></div>
              <p className="mt-2 text-2xs text-subtle">Assistive only — Admin confirms or overrides. Suggestion, image & confidence are logged.</p>
            </div>

            <Field label="Confirm condition">
              <div className="flex flex-wrap gap-1.5">
                {CONDITIONS.map((cd) => (
                  <button key={cd} onClick={() => setChoice(cd)} className={cn('chip border', choice === cd ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-surface-2 text-muted hover:text-content')}>
                    {CONDITION_META[cd].label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-3 gap-2">
              <button className="btn-primary" onClick={() => commit('accepted')}><Check className="h-4 w-4" /> Accept</button>
              <button className="btn-secondary" onClick={() => commit('accepted-remark')}>With remark</button>
              <button className="btn-secondary text-maint" onClick={() => commit('flag-repair')}><Wrench className="h-4 w-4" /> Flag repair</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
