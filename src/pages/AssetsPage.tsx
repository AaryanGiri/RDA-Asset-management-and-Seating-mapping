import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Boxes, ChevronRight, AlertTriangle, Plus, Layers, Tags, X, Check } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, StatCard, Avatar, AssetStatusBadge, Modal, Field, EmptyState } from '@/components/ui'
import { CategoryIcon, ImageUpload } from '@/features/assets/assetUi'
import { useData, officeName } from '@/lib/store'
import { useSimulatedLoad } from '@/hooks'
import { cn, downloadCSV } from '@/lib/utils'
import { ASSET_CATEGORY_META, ASSET_STATUS_META } from '@/lib/status'
import type { AssetPrimaryCategory, AssetStatus } from '@/lib/types'

export function AssetsPage() {
  const assets = useData((s) => s.assets)
  const categories = useData((s) => s.categories)
  const employees = useData((s) => s.employees)
  const nav = useNavigate()
  const loading = useSimulatedLoad(420)

  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'all' | AssetPrimaryCategory>('all')
  const [status, setStatus] = useState<'all' | AssetStatus>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)

  const rows = useMemo(() => assets.filter((a) => {
    if (cat !== 'all' && a.category !== cat) return false
    if (status !== 'all' && a.status !== status) return false
    const emp = employees.find((e) => e.id === a.assignedEmployeeId)
    return `${a.assetId} ${a.name} ${a.subcategory} ${a.location ?? ''} ${emp?.fullName ?? ''}`.toLowerCase().includes(q.toLowerCase())
  }), [assets, q, cat, status, employees])

  const byCat = (c: AssetPrimaryCategory) => assets.filter((a) => a.category === c).length
  const defective = assets.filter((a) => a.status === 'defective').length
  const emp = (id?: string) => employees.find((e) => e.id === id)

  const exportCSV = () => downloadCSV('rodic-assetspace-asset-register.csv', rows.map((a) => ({
    'Asset ID': a.assetId, Category: ASSET_CATEGORY_META[a.category].label, Subcategory: a.subcategory, Name: a.name,
    'Assigned To': emp(a.assignedEmployeeId)?.fullName ?? '—', Office: officeName(a.officeId), Location: a.location ?? '—',
    'Responsible Person': a.responsiblePerson, Status: ASSET_STATUS_META[a.status].label, Remarks: a.remarks ?? '',
  })))

  return (
    <Page wide>
      <PageHeader
        title="Asset Register"
        subtitle={`${assets.length} assets · classification, assignment, images & lifecycle`}
        icon={<Boxes className="h-5 w-5" />}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setCatOpen(true)}><Tags className="h-4 w-4" /> Categories</button>
            <button className="btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Export</button>
            <button className="btn-primary" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add asset</button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total assets" value={assets.length} icon={<Boxes className="h-5 w-5" />} sub="across categories" />
        <StatCard label="Tangible" value={byCat('tangible')} icon={<Layers className="h-5 w-5" />} accent="brand" sub="laptops, furniture…" />
        <StatCard label="Intangible" value={byCat('intangible')} icon={<Layers className="h-5 w-5" />} accent="notice" sub="software, licenses…" />
        <StatCard label="Defective" value={defective} icon={<AlertTriangle className="h-5 w-5" />} accent="maint" sub="awaiting Admin action" />
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill active={cat === 'all'} onClick={() => setCat('all')}>All categories</FilterPill>
          {categories.map((c) => (
            <FilterPill key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              <CategoryIcon category={c.id} className="h-3.5 w-3.5" /> {ASSET_CATEGORY_META[c.id].short}
            </FilterPill>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="input h-9 w-auto py-1.5">
            <option value="all">Any status</option>
            <option value="in-use">In Use</option><option value="in-storage">In Storage</option>
            <option value="defective">Defective</option><option value="discarded">Discarded</option>
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, name, person…" className="input pl-9" />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[2fr_1.2fr_1.3fr_1.3fr_0.9fr] gap-4 border-b border-border bg-surface-2/50 px-5 py-3 text-2xs font-semibold uppercase tracking-wide text-subtle lg:grid">
          <span>Asset</span><span>Classification</span><span>Assigned to</span><span>Office · Location</span><span>Status</span>
        </div>
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="skeleton h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-48" /><div className="skeleton h-2.5 w-28" /></div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Boxes className="h-5 w-5" />} title="No matching assets" body="Adjust the filters or add a new asset." />
        ) : (
          <div className="divide-y divide-border">
            {rows.map((a) => {
              const assignee = emp(a.assignedEmployeeId)
              return (
                <button
                  key={a.id} data-asset-row onClick={() => nav(`/assets/${a.id}`)}
                  className="grid w-full grid-cols-1 items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2 lg:grid-cols-[2fr_1.2fr_1.3fr_1.3fr_0.9fr] lg:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted"><CategoryIcon subcategory={a.subcategory} category={a.category} className="h-4.5 w-4.5" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{a.name}</p>
                      <p className="truncate font-mono text-2xs text-muted">{a.assetId}</p>
                    </div>
                    {a.status === 'defective' && <AlertTriangle className="h-4 w-4 shrink-0 text-maint" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-content">{a.subcategory}</p>
                    <p className="truncate text-2xs text-muted">{ASSET_CATEGORY_META[a.category].short}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignee ? <Avatar name={assignee.fullName} hue={assignee.avatarHue} size={26} /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-2xs text-subtle">—</span>}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-content">{assignee?.fullName ?? 'Unassigned'}</p>
                      <p className="truncate text-2xs text-muted">Resp: {a.responsiblePerson.split(' (')[0]}</p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-content">{officeName(a.officeId)}</p>
                    <p className="truncate text-2xs text-muted">{a.location ?? '—'}</p>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <AssetStatusBadge status={a.status} />
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-subtle lg:block" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {!loading && <p className="mt-3 text-xs text-subtle">Showing {rows.length} of {assets.length} assets.</p>}

      {addOpen && <AddAssetModal onClose={() => setAddOpen(false)} />}
      {catOpen && <CategoriesModal onClose={() => setCatOpen(false)} />}
    </Page>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors', active ? 'bg-brand text-white' : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-content')}>
      {children}
    </button>
  )
}

function AddAssetModal({ onClose }: { onClose: () => void }) {
  const categories = useData((s) => s.categories)
  const employees = useData((s) => s.employees)
  const offices = useData((s) => s.offices)
  const addAsset = useData((s) => s.addAsset)
  const [category, setCategory] = useState<AssetPrimaryCategory>('tangible')
  const subs = categories.find((c) => c.id === category)?.subcategories ?? []
  const [subcategory, setSub] = useState(subs[0] ?? '')
  const [name, setName] = useState('')
  const [assignedEmployeeId, setAssignee] = useState('')
  const [officeId, setOffice] = useState(offices[0]?.id ?? 'hq')
  const [location, setLocation] = useState('')
  const [responsiblePerson, setResp] = useState('A. Menon (Admin)')
  const [remarks, setRemarks] = useState('')
  const [deploymentImage, setImg] = useState<string | undefined>()
  const code = (subcategory.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'AST').toUpperCase()
  const assetId = `RDA-${code}-${String(1000 + Math.floor(Math.random() * 8999)).slice(0, 4)}`

  const submit = () => {
    if (!name.trim() || !subcategory) return
    addAsset({ assetId, category, subcategory, name: name.trim(), assignedEmployeeId: assignedEmployeeId || undefined, officeId, location: location.trim() || undefined, responsiblePerson, remarks: remarks.trim() || undefined, deploymentImage })
    onClose()
  }
  return (
    <Modal open onClose={onClose} width={560}>
      <div className="border-b border-border px-5 py-4"><h3 className="text-base font-semibold text-content">Add asset</h3><p className="text-xs text-muted">Classify, assign and capture the deployment image.</p></div>
      <div className="grid max-h-[70vh] grid-cols-2 gap-4 overflow-y-auto p-5">
        <Field label="Category"><select className="input" value={category} onChange={(e) => { const c = e.target.value as AssetPrimaryCategory; setCategory(c); setSub(categories.find((x) => x.id === c)?.subcategories[0] ?? '') }}>{categories.map((c) => <option key={c.id} value={c.id}>{ASSET_CATEGORY_META[c.id].label}</option>)}</select></Field>
        <Field label="Subcategory"><select className="input" value={subcategory} onChange={(e) => setSub(e.target.value)}>{subs.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <div className="col-span-2"><Field label="Asset name / description"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dell Latitude 7440" /></Field></div>
        <Field label="Assigned to"><select className="input" value={assignedEmployeeId} onChange={(e) => setAssignee(e.target.value)}><option value="">Unassigned</option>{employees.slice(0, 220).map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}</select></Field>
        <Field label="Office / Location"><select className="input" value={officeId} onChange={(e) => setOffice(e.target.value)}>{offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <Field label="Room / area"><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Tech Innovation" /></Field>
        <Field label="Responsible person"><input className="input" value={responsiblePerson} onChange={(e) => setResp(e.target.value)} /></Field>
        <div className="col-span-2"><Field label="Remarks (optional)"><input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field></div>
        <div className="col-span-2">
          <label className="label">Deployment image (optional)</label>
          {deploymentImage
            ? <div className="relative w-40 overflow-hidden rounded-xl border border-border"><img src={deploymentImage} alt="deployment" className="aspect-[4/3] w-full object-cover" /><button onClick={() => setImg(undefined)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X className="h-3.5 w-3.5" /></button></div>
            : <ImageUpload className="w-40" label="Upload deployment image" onFile={setImg} />}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
        <span className="font-mono text-2xs text-subtle">ID: {assetId}</span>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={!name.trim() || !subcategory} className="btn-primary"><Check className="h-4 w-4" /> Add asset</button>
        </div>
      </div>
    </Modal>
  )
}

function CategoriesModal({ onClose }: { onClose: () => void }) {
  const categories = useData((s) => s.categories)
  const addSub = useData((s) => s.addSubcategory)
  const removeSub = useData((s) => s.removeSubcategory)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  return (
    <Modal open onClose={onClose} width={520}>
      <div className="border-b border-border px-5 py-4"><h3 className="text-base font-semibold text-content">Manage categories</h3><p className="text-xs text-muted">Maintain the subcategories under each asset category.</p></div>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
        {categories.map((c) => (
          <div key={c.id} className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center gap-2"><CategoryIcon category={c.id} className="h-4 w-4 text-brand" /><p className="text-sm font-semibold text-content">{ASSET_CATEGORY_META[c.id].label}</p></div>
            <div className="flex flex-wrap gap-1.5">
              {c.subcategories.map((s) => (
                <span key={s} className="chip bg-surface-2 text-muted">{s}<button onClick={() => removeSub(c.id, s)} className="ml-1 text-subtle hover:text-occupied"><X className="h-3 w-3" /></button></span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input className="input h-8 flex-1 py-1 text-xs" placeholder="Add subcategory…" value={drafts[c.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { addSub(c.id, drafts[c.id] ?? ''); setDrafts((d) => ({ ...d, [c.id]: '' })) } }} />
              <button onClick={() => { addSub(c.id, drafts[c.id] ?? ''); setDrafts((d) => ({ ...d, [c.id]: '' })) }} className="btn-secondary h-8 px-2.5 py-1 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end border-t border-border px-5 py-4"><button onClick={onClose} className="btn-primary">Done</button></div>
    </Modal>
  )
}
