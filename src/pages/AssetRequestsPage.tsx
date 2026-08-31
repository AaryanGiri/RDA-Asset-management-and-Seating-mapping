import { useMemo, useState } from 'react'
import { PackagePlus, Trash2, Check, X, ClipboardList, ArrowRight, UserCog, Briefcase, ShieldCheck, Image as ImageIcon, Clock } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, Segmented, Modal, Field, EmptyState } from '@/components/ui'
import { useData } from '@/lib/store'
import { useUI } from '@/lib/uiStore'
import { ASSET_CATEGORY_META } from '@/lib/status'
import { cn, relativeTime } from '@/lib/utils'
import type { AssetRequest, AssetRequestStage, AssetRequestType, PcAction, AssetPrimaryCategory } from '@/lib/types'

type Actor = 'om' | 'pc' | 'admin'
const ACTOR_META: Record<Actor, { label: string; icon: typeof UserCog; name: string }> = {
  om: { label: 'Office Manager', icon: Briefcase, name: 'R. Kapoor (Office Manager)' },
  pc: { label: 'Purchase Committee', icon: ClipboardList, name: 'A. Menon (PC)' },
  admin: { label: 'Admin', icon: ShieldCheck, name: 'A. Menon (Admin)' },
}

const STAGE_META: Record<AssetRequestStage, { label: string; cls: string }> = {
  'pc-review': { label: 'Awaiting PC review', cls: 'bg-notice-soft text-notice' },
  'admin-review': { label: 'Awaiting Admin decision', cls: 'bg-brand-soft text-brand' },
  approved: { label: 'Approved', cls: 'bg-vacant-soft text-vacant' },
  rejected: { label: 'Rejected', cls: 'bg-occupied-soft text-occupied' },
}

export function AssetRequestsPage() {
  const requests = useData((s) => s.assetRequests)
  const categories = useData((s) => s.categories)
  const assets = useData((s) => s.assets)
  const offices = useData((s) => s.offices)
  const raise = useData((s) => s.raiseAssetRequest)
  const pcReview = useData((s) => s.pcReviewAssetRequest)
  const adminDecide = useData((s) => s.adminDecideAssetRequest)
  const toast = useUI((s) => s.toast)

  const [actor, setActor] = useState<Actor>('om')
  const [raiseOpen, setRaiseOpen] = useState(false)

  const counts = useMemo(() => ({
    pc: requests.filter((r) => r.stage === 'pc-review').length,
    admin: requests.filter((r) => r.stage === 'admin-review').length,
    done: requests.filter((r) => r.stage === 'approved' || r.stage === 'rejected').length,
  }), [requests])

  return (
    <Page wide>
      <PageHeader
        icon={<ClipboardList className="h-5 w-5" />}
        title="Asset Requests & Actions"
        subtitle="Office Manager → Purchase Committee → Admin review flow (Section 11.7)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              size="sm"
              value={actor}
              onChange={(v) => setActor(v)}
              options={(['om', 'pc', 'admin'] as Actor[]).map((a) => ({ value: a, label: <span className="flex items-center gap-1.5">{(() => { const I = ACTOR_META[a].icon; return <I className="h-3.5 w-3.5" /> })()}{ACTOR_META[a].label}</span> }))}
            />
            {actor === 'om' && <button onClick={() => setRaiseOpen(true)} className="btn-primary"><PackagePlus className="h-4 w-4" /> Raise request</button>}
          </div>
        }
      />

      {/* stage summary */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StageStat icon={ClipboardList} label="Awaiting PC" value={counts.pc} tone="notice" />
        <StageStat icon={ShieldCheck} label="Awaiting Admin" value={counts.admin} tone="brand" />
        <StageStat icon={Check} label="Closed" value={counts.done} tone="vacant" />
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No asset requests" body="Office Managers can raise a new-asset or disposal request to start the review flow." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {requests.map((r) => (
            <RequestCard
              key={r.id} req={r} actor={actor}
              onPc={(rec, act) => { pcReview(r.id, rec, act, ACTOR_META.pc.name); toast({ tone: 'info', title: 'Recommendation submitted', body: 'Sent to Admin for the final decision.' }) }}
              onAdmin={(decision, note) => { adminDecide(r.id, decision, note, ACTOR_META.admin.name); toast({ tone: decision === 'approved' ? 'success' : 'warning', title: `Request ${decision}`, body: 'Office Manager notified.' }) }}
            />
          ))}
        </div>
      )}

      {raiseOpen && (
        <RaiseModal
          categories={categories}
          assets={assets.filter((a) => a.status !== 'discarded')}
          offices={offices}
          onClose={() => setRaiseOpen(false)}
          onSubmit={(input) => { raise({ ...input, raisedBy: ACTOR_META.om.name }); setRaiseOpen(false); toast({ tone: 'success', title: 'Request raised', body: 'Sent to the Purchase Committee for review.' }) }}
        />
      )}
    </Page>
  )
}

function StageStat({ icon: Icon, label, value, tone }: { icon: typeof Check; label: string; value: number; tone: string }) {
  const map: Record<string, string> = { notice: 'text-notice bg-notice-soft', brand: 'text-brand bg-brand-soft', vacant: 'text-vacant bg-vacant-soft' }
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <div className={cn('grid h-9 w-9 place-items-center rounded-xl', map[tone])}><Icon className="h-4 w-4" /></div>
      <div><p className="text-xl font-semibold text-content">{value}</p><p className="text-2xs text-muted">{label}</p></div>
    </div>
  )
}

function RequestCard({ req, actor, onPc, onAdmin }: { req: AssetRequest; actor: Actor; onPc: (rec: string, act: PcAction) => void; onAdmin: (decision: 'approved' | 'rejected', note?: string) => void }) {
  const st = STAGE_META[req.stage]
  const [rec, setRec] = useState('')
  const [pcAct, setPcAct] = useState<PcAction>('approve')
  const [adminNote, setAdminNote] = useState('')
  const isNew = req.type === 'new'

  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn('grid h-9 w-9 place-items-center rounded-xl', isNew ? 'bg-brand-soft text-brand' : 'bg-occupied-soft text-occupied')}>
            {isNew ? <PackagePlus className="h-4.5 w-4.5" /> : <Trash2 className="h-4.5 w-4.5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-content">{isNew ? req.name : `Dispose ${req.assetCode}`}</p>
            <p className="text-2xs text-muted">{isNew ? `New asset · ${ASSET_CATEGORY_META[req.category!]?.short ?? req.category} · ${req.subcategory}` : 'Disposal request'}</p>
          </div>
        </div>
        <span className={cn('chip px-2 py-0.5 text-2xs', st.cls)}>{st.label}</span>
      </div>

      <p className="mt-3 text-xs text-muted"><span className="font-medium text-content">Reason:</span> {req.reason}</p>
      {req.remarks && <p className="mt-1 text-2xs text-subtle">{req.remarks}</p>}

      {req.imageHue !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-2xs text-subtle">
          <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `hsl(${req.imageHue} 60% 45% / 0.25)` }}><ImageIcon className="h-3.5 w-3.5" /></span>
          {req.type === 'disposal' ? 'Condition image attached' : 'Reference image attached'}
        </div>
      )}

      {/* trail */}
      <div className="mt-3 space-y-1.5 rounded-xl bg-surface-2/60 p-2.5 text-2xs">
        <TrailRow icon={Briefcase} who={req.raisedBy} what={`Raised ${isNew ? 'new-asset' : 'disposal'} request`} when={req.requestDate} />
        {req.pcRecommendation && <TrailRow icon={ClipboardList} who={req.pcBy ?? 'PC'} what={`Recommends "${req.pcAction}" — ${req.pcRecommendation}`} when={req.pcAt} />}
        {req.adminAction && <TrailRow icon={ShieldCheck} who={req.adminBy ?? 'Admin'} what={`${req.adminAction}${req.adminReason ? ` — ${req.adminReason}` : ''}`} when={req.adminAt} />}
      </div>

      {/* stage action, gated by acting-as */}
      {actor === 'pc' && req.stage === 'pc-review' && (
        <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
          <p className="section-title">Purchase Committee review</p>
          <textarea className="input min-h-[56px] resize-none" placeholder="Cost / procurement recommendation…" value={rec} onChange={(e) => setRec(e.target.value)} />
          <div className="flex items-center gap-2">
            <select className="input h-9 flex-1" value={pcAct} onChange={(e) => setPcAct(e.target.value as PcAction)}>
              <option value="approve">Recommend approve</option>
              <option value="replace">Recommend replace</option>
              <option value="discard">Recommend discard</option>
              <option value="reject">Recommend reject</option>
            </select>
            <button disabled={!rec.trim()} onClick={() => onPc(rec.trim(), pcAct)} className="btn-primary shrink-0"><ArrowRight className="h-4 w-4" /> Send to Admin</button>
          </div>
        </div>
      )}
      {actor === 'admin' && req.stage === 'admin-review' && (
        <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
          <p className="section-title">Admin decision</p>
          <input className="input" placeholder="Decision note (optional)…" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
          <div className="flex items-center gap-2">
            <button onClick={() => onAdmin('approved', adminNote.trim() || undefined)} className="btn-primary flex-1"><Check className="h-4 w-4" /> Approve{req.type === 'disposal' ? ' disposal' : ''}</button>
            <button onClick={() => onAdmin('rejected', adminNote.trim() || undefined)} className="btn-secondary flex-1"><X className="h-4 w-4" /> Reject</button>
          </div>
        </div>
      )}
    </div>
  )
}

function TrailRow({ icon: Icon, who, what, when }: { icon: typeof Check; who: string; what: string; when?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
      <p className="flex-1 text-muted"><span className="font-medium text-content">{who}</span> · {what}</p>
      {when && <span className="flex shrink-0 items-center gap-1 text-subtle"><Clock className="h-3 w-3" />{relativeTime(when)}</span>}
    </div>
  )
}

function RaiseModal({
  categories, assets, offices, onClose, onSubmit,
}: {
  categories: { id: AssetPrimaryCategory; name: string; subcategories: string[] }[]
  assets: { id: string; assetId: string; name: string }[]
  offices: { id: string; name: string }[]
  onClose: () => void
  onSubmit: (input: { type: AssetRequestType; category?: AssetPrimaryCategory; subcategory?: string; name?: string; officeId?: string; assetRef?: string; assetCode?: string; reason: string; remarks?: string; imageHue?: number }) => void
}) {
  const [type, setType] = useState<AssetRequestType>('new')
  const [category, setCategory] = useState<AssetPrimaryCategory>(categories[0]?.id ?? 'tangible')
  const cat = categories.find((c) => c.id === category)
  const [subcategory, setSubcategory] = useState(cat?.subcategories[0] ?? '')
  const [name, setName] = useState('')
  const [officeId, setOfficeId] = useState(offices[0]?.id ?? 'hq')
  const [assetRef, setAssetRef] = useState(assets[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')

  const valid = reason.trim() && (type === 'new' ? name.trim() : assetRef)

  const submit = () => {
    if (!valid) return
    if (type === 'new') onSubmit({ type, category, subcategory, name: name.trim(), officeId, reason: reason.trim(), remarks: remarks.trim() || undefined, imageHue: 210 })
    else { const a = assets.find((x) => x.id === assetRef); onSubmit({ type, assetRef, assetCode: a?.assetId, reason: reason.trim(), remarks: remarks.trim() || undefined, imageHue: 12 }) }
  }

  return (
    <Modal open onClose={onClose} width={500}>
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-content">Raise asset request</h2>
        <p className="mt-0.5 text-xs text-muted">As Office Manager — routed to the Purchase Committee, then Admin.</p>
      </div>
      <div className="space-y-4 p-5">
        <Segmented
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: 'new', label: <span className="flex items-center gap-1.5"><PackagePlus className="h-3.5 w-3.5" />New asset</span> },
            { value: 'disposal', label: <span className="flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" />Disposal</span> },
          ]}
        />

        {type === 'new' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select className="input" value={category} onChange={(e) => { const c = e.target.value as AssetPrimaryCategory; setCategory(c); setSubcategory(categories.find((x) => x.id === c)?.subcategories[0] ?? '') }}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Subcategory">
                <select className="input" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                  {cat?.subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Asset name / description"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dell Latitude 7440" /></Field>
            <Field label="Office / location">
              <select className="input" value={officeId} onChange={(e) => setOfficeId(e.target.value)}>{offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            </Field>
          </>
        ) : (
          <Field label="Asset to dispose">
            <select className="input" value={assetRef} onChange={(e) => setAssetRef(e.target.value)}>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.assetId} · {a.name}</option>)}
            </select>
          </Field>
        )}

        <Field label="Reason"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === 'new' ? 'e.g. New joiner needs a laptop' : 'e.g. Beyond economic repair'} /></Field>
        <Field label="Remarks" hint={type === 'disposal' ? 'Attach a condition image in the real system' : 'Optional'}>
          <textarea className="input min-h-[64px] resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Anything the reviewers should know…" />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={!valid} className="btn-primary">Submit to PC</button>
      </div>
    </Modal>
  )
}
