import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, User, Building2, Boxes, Tag, Clock, Check, X, AlertTriangle,
  Trash2, Archive, RotateCcw, Camera, Upload, MessageSquare, Layers, UserCog, ClipboardCheck, ImagePlus,
} from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, AssetStatusBadge, Avatar, Modal, Field, Spinner, EmptyState } from '@/components/ui'
import { CategoryIcon, AssetImageTile, ImageUpload } from '@/features/assets/assetUi'
import { useData, officeName } from '@/lib/store'
import { ASSET_CATEGORY_META } from '@/lib/status'
import { cn, formatDate, relativeTime } from '@/lib/utils'
import type { Asset, AssetEventType } from '@/lib/types'

export function AssetPassport() {
  const { id } = useParams()
  const nav = useNavigate()
  const asset = useData((s) => s.assets.find((a) => a.id === id))
  const employees = useData((s) => s.employees)
  const addAssetImage = useData((s) => s.addAssetImage)
  const takeAssetAction = useData((s) => s.takeAssetAction)
  const [flow, setFlow] = useState<null | 'assign' | 'defect' | 'remark'>(null)

  if (!asset) {
    return <Page><EmptyState icon={<Boxes className="h-5 w-5" />} title="Asset not found" body="This asset may have been removed." action={<Link to="/assets" className="btn-primary">Back to register</Link>} /></Page>
  }
  const assignee = employees.find((e) => e.id === asset.assignedEmployeeId)
  const catMeta = ASSET_CATEGORY_META[asset.category]
  const isDefective = asset.status === 'defective'
  const isDiscarded = asset.status === 'discarded'
  const deploymentImg = asset.images.find((i) => i.kind === 'deployment')
  const currentImg = [...asset.images].reverse().find((i) => i.kind === 'current')
  const defectImg = [...asset.images].reverse().find((i) => i.kind === 'defect')

  return (
    <Page wide>
      <button onClick={() => nav('/assets')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-content">
        <ArrowLeft className="h-4 w-4" /> Asset Register
      </button>

      <PageHeader
        title={asset.name}
        subtitle={`${asset.subcategory} · ${catMeta.label}`}
        icon={<CategoryIcon subcategory={asset.subcategory} category={asset.category} className="h-5 w-5" />}
        actions={
          <>
            {!isDiscarded && <button className="btn-secondary" onClick={() => setFlow('assign')}><UserCog className="h-4 w-4" /> Reassign</button>}
            {!isDefective && !isDiscarded && <button className="btn-secondary text-maint" onClick={() => setFlow('defect')}><AlertTriangle className="h-4 w-4" /> Flag defective</button>}
          </>
        }
      />

      {/* identity strip */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="chip bg-surface-2 font-mono text-content"><Tag className="h-3.5 w-3.5" />{asset.assetId}</span>
        <span className="chip bg-brand-soft text-brand">{catMeta.short}</span>
        <AssetStatusBadge status={asset.status} />
        {isDefective && <span className="chip bg-maint-soft text-maint"><AlertTriangle className="h-3.5 w-3.5" /> Awaiting Admin action</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* main */}
        <div className="space-y-4 lg:col-span-2">
          {/* images */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-content">Asset images</h3>
                <p className="mt-0.5 text-xs text-muted">Deployment reference · current condition · defect (if any)</p>
              </div>
              <span className="chip bg-surface-2 text-muted">{asset.images.length} image{asset.images.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {/* deployment */}
              {deploymentImg ? <AssetImageTile image={deploymentImg} /> : <ImageUpload label="Add deployment image" onFile={(src) => addAssetImage(asset.id, 'deployment', src, 'Condition at deployment')} />}
              {/* current */}
              {currentImg ? <AssetImageTile image={currentImg} /> : !isDiscarded && <ImageUpload label="Add current image" onFile={(src) => addAssetImage(asset.id, 'current', src, 'Latest condition')} />}
              {/* defect */}
              {defectImg && <AssetImageTile image={defectImg} />}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-2xs text-subtle"><Camera className="h-3.5 w-3.5" /> A deployment image is captured at assignment; a defect image is required before an asset is discarded.</p>
          </div>

          {/* remarks & action */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-subtle" /><h3 className="text-sm font-semibold text-content">Remarks &amp; action</h3></div>
              {!isDiscarded && <button onClick={() => setFlow('remark')} className="text-xs font-medium text-brand hover:underline">Edit remark</button>}
            </div>
            <p className={cn('rounded-xl border border-border bg-surface-2/50 p-3 text-sm', asset.remarks ? 'text-content' : 'text-subtle')}>{asset.remarks || 'No remarks recorded.'}</p>

            {isDefective && (
              <div className="mt-4 rounded-xl border border-maint/40 bg-maint-soft/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-content"><ClipboardCheck className="h-4 w-4 text-maint" /> Admin decision required</p>
                <p className="mt-1 text-xs text-muted">Review the defect image and remarks, then decide the action for this asset.</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button onClick={() => takeAssetAction(asset.id, 'discard')} className="btn-primary bg-occupied hover:bg-occupied"><Trash2 className="h-4 w-4" /> Discard</button>
                  <button onClick={() => takeAssetAction(asset.id, 'store')} className="btn-secondary"><Archive className="h-4 w-4" /> To storage</button>
                  <button onClick={() => takeAssetAction(asset.id, 'use')} className="btn-secondary"><RotateCcw className="h-4 w-4" /> Return to use</button>
                </div>
              </div>
            )}
            {asset.actionTaken && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><ClipboardCheck className="h-3.5 w-3.5 text-vacant" /> Action taken: <span className="font-medium text-content">{asset.actionTaken}</span></p>
            )}
          </div>

          {/* lifecycle */}
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-content">Lifecycle timeline</h3>
            <ol className="relative space-y-0 border-l border-border pl-5">
              {[...asset.lifecycle].reverse().map((ev) => (
                <li key={ev.id} className="relative pb-5 last:pb-0">
                  <span className={cn('absolute -left-[26px] grid h-6 w-6 place-items-center rounded-full border-2 border-surface', eventTone(ev.type))}>{eventIcon(ev.type)}</span>
                  <p className="text-sm font-semibold text-content">{ev.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{ev.detail}</p>
                  <p className="mt-1 text-2xs text-subtle">{formatDate(ev.timestamp)} · {ev.actor}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-4">
          <InfoCard title="Classification" icon={Layers}>
            <InfoRow label="Asset ID" value={asset.assetId} mono />
            <InfoRow label="Category" value={catMeta.label} />
            <InfoRow label="Subcategory" value={asset.subcategory} />
            <InfoRow label="Name" value={asset.name} />
          </InfoCard>

          <InfoCard title="Assignment" icon={User}>
            <div className="flex items-center gap-2.5 pb-1">
              {assignee ? <Avatar name={assignee.fullName} hue={assignee.avatarHue} size={34} /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-subtle"><User className="h-4 w-4" /></span>}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-content">{assignee?.fullName ?? 'Unassigned'}</p>
                <p className="truncate text-2xs text-muted">{assignee?.designation ?? (asset.category === 'land-building' ? 'Facility asset' : '—')}</p>
              </div>
            </div>
            <InfoRow label="Responsible person" value={asset.responsiblePerson} />
            <InfoRow label="Status" value={asset.status} tone={isDefective ? 'text-maint' : undefined} />
          </InfoCard>

          <InfoCard title="Location" icon={MapPin}>
            <InfoRow label="Office" value={officeName(asset.officeId)} />
            <InfoRow label="Room / area" value={asset.location ?? '—'} />
            <InfoRow label="Deployed" value={formatDate(asset.deploymentDate)} />
          </InfoCard>
        </div>
      </div>

      {flow === 'assign' && <AssignModal asset={asset} onClose={() => setFlow(null)} />}
      {flow === 'defect' && <DefectModal asset={asset} onClose={() => setFlow(null)} />}
      {flow === 'remark' && <RemarkModal asset={asset} onClose={() => setFlow(null)} />}
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
      <span className={cn('truncate text-right font-medium capitalize text-content', mono && 'font-mono normal-case', tone)}>{value}</span>
    </div>
  )
}

function eventTone(type: AssetEventType) {
  const m: Record<AssetEventType, string> = {
    deployed: 'bg-brand-soft text-brand', reassigned: 'bg-notice-soft text-notice', relocated: 'bg-notice-soft text-notice',
    image: 'bg-surface-3 text-muted', remark: 'bg-surface-3 text-muted', defective: 'bg-maint-soft text-maint',
    action: 'bg-vacant-soft text-vacant', discarded: 'bg-occupied-soft text-occupied',
  }
  return m[type] ?? 'bg-surface-3 text-muted'
}
function eventIcon(type: AssetEventType) {
  const c = 'h-3 w-3'
  if (type === 'deployed') return <Boxes className={c} />
  if (type === 'reassigned') return <UserCog className={c} />
  if (type === 'relocated') return <MapPin className={c} />
  if (type === 'image') return <ImagePlus className={c} />
  if (type === 'defective') return <AlertTriangle className={c} />
  if (type === 'action') return <ClipboardCheck className={c} />
  if (type === 'discarded') return <Trash2 className={c} />
  return <Clock className={c} />
}

// ── Reassign ─────────────────────────────────────────────────────────────────
function AssignModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const employees = useData((s) => s.employees)
  const assignAsset = useData((s) => s.assignAsset)
  const [employeeId, setEmp] = useState(asset.assignedEmployeeId ?? '')
  const [location, setLocation] = useState(asset.location ?? '')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!employeeId) return
    setBusy(true); await assignAsset(asset.id, employeeId, location.trim() || undefined); setBusy(false); onClose()
  }
  return (
    <Modal open onClose={onClose} width={440}>
      <div className="border-b border-border px-5 py-4"><h3 className="text-base font-semibold text-content">Reassign asset</h3><p className="text-xs text-muted">{asset.assetId} · {asset.name}</p></div>
      <div className="space-y-4 p-5">
        <Field label="Assign to"><select className="input" value={employeeId} onChange={(e) => setEmp(e.target.value)}><option value="">Select employee…</option>{employees.slice(0, 220).map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}</select></Field>
        <Field label="Room / area"><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Tech Innovation" /></Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!employeeId || busy}>{busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Assign</button>
      </div>
    </Modal>
  )
}

// ── Flag defective ───────────────────────────────────────────────────────────
function DefectModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const flagDefective = useData((s) => s.flagDefective)
  const [remarks, setRemarks] = useState('')
  const [img, setImg] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!remarks.trim()) return
    setBusy(true); await flagDefective(asset.id, remarks.trim(), img); setBusy(false); onClose()
  }
  return (
    <Modal open onClose={onClose} width={480}>
      <div className="flex items-center gap-3 border-b border-border p-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-maint-soft text-maint"><AlertTriangle className="h-5 w-5" /></div>
        <div><p className="text-sm font-semibold text-content">Flag defective / damaged</p><p className="text-xs text-muted">{asset.assetId} · sent to Admin for review</p></div>
      </div>
      <div className="space-y-4 p-5">
        <Field label="What's wrong? (remarks)"><textarea className="input min-h-[80px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Screen flickering — proposed for disposal" /></Field>
        <div>
          <label className="label">Current condition image</label>
          {img
            ? <div className="relative w-40 overflow-hidden rounded-xl border border-border"><img src={img} alt="defect" className="aspect-[4/3] w-full object-cover" /><button onClick={() => setImg(undefined)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X className="h-3.5 w-3.5" /></button></div>
            : <ImageUpload className="w-40" label="Upload defect image" onFile={setImg} />}
          <p className="mt-1.5 text-2xs text-subtle">Recommended — an image of the current condition is required before disposal.</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary bg-maint hover:bg-maint" onClick={submit} disabled={!remarks.trim() || busy}>{busy ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Submit for review</button>
      </div>
    </Modal>
  )
}

// ── Edit remark ──────────────────────────────────────────────────────────────
function RemarkModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const addAssetRemark = useData((s) => s.addAssetRemark)
  const [remarks, setRemarks] = useState(asset.remarks ?? '')
  return (
    <Modal open onClose={onClose} width={440}>
      <div className="border-b border-border px-5 py-4"><h3 className="text-base font-semibold text-content">Edit remark</h3><p className="text-xs text-muted">{asset.assetId}</p></div>
      <div className="p-5"><Field label="Remarks"><textarea className="input min-h-[90px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field></div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => { addAssetRemark(asset.id, remarks.trim()); onClose() }}><Check className="h-4 w-4" /> Save</button>
      </div>
    </Modal>
  )
}
