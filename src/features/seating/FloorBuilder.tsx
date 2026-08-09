import { useState } from 'react'
import { X, Building2, LayoutGrid, Sparkles } from 'lucide-react'
import { useData } from '@/lib/store'
import { cn } from '@/lib/utils'

export function FloorBuilder({ onClose, onCreated }: { onClose: () => void; onCreated: (floorId: string) => void }) {
  const offices = useData((s) => s.offices)
  const createOffice = useData((s) => s.createOffice)
  const createFloor = useData((s) => s.createFloor)

  const [officeMode, setOfficeMode] = useState<'existing' | 'new'>('existing')
  const [officeId, setOfficeId] = useState(offices[0]?.id ?? '')
  const [offName, setOffName] = useState('')
  const [offCity, setOffCity] = useState('')
  const [offCode, setOffCode] = useState('')

  const [name, setName] = useState('New Floor')
  const [width, setWidth] = useState(120)
  const [height, setHeight] = useState(80)
  const [ppf, setPpf] = useState(8)
  const [level, setLevel] = useState(1)

  const canCreate = name.trim() && width > 0 && height > 0 && (officeMode === 'existing' ? !!officeId : offName.trim() && offCode.trim())

  const submit = () => {
    if (!canCreate) return
    let oid = officeId
    if (officeMode === 'new') {
      oid = createOffice({ name: offName.trim(), code: offCode.trim().toUpperCase(), city: offCity.trim() || '—', state: '—', country: '—', timezone: 'IST' })
    }
    const fid = createFloor(oid, { name: name.trim(), widthFt: width, heightFt: height, pxPerFoot: ppf, level })
    onCreated(fid)
  }

  const lbl = 'text-2xs font-medium text-muted'
  const field = 'flex flex-col gap-1'

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand"><Sparkles className="h-4 w-4" /></div>
            <div>
              <h2 className="text-sm font-semibold text-content">Build a new floor from scratch</h2>
              <p className="text-2xs text-muted">Blank plan at real scale — then draw rooms, walls, doors & seats.</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-content"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-4">
          {/* office */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-subtle"><Building2 className="h-3.5 w-3.5" /> Office</p>
            <div className="mb-2 flex gap-1 rounded-lg border border-border bg-surface p-0.5">
              <Tab active={officeMode === 'existing'} onClick={() => setOfficeMode('existing')}>Existing</Tab>
              <Tab active={officeMode === 'new'} onClick={() => setOfficeMode('new')}>New office</Tab>
            </div>
            {officeMode === 'existing' ? (
              <select className="input h-9 text-sm" value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
                {offices.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.code}</option>)}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <label className={cn(field, 'col-span-2')}><span className={lbl}>Office name</span><input className="input h-9 text-sm" value={offName} onChange={(e) => setOffName(e.target.value)} placeholder="North Campus" /></label>
                <label className={field}><span className={lbl}>City</span><input className="input h-9 text-sm" value={offCity} onChange={(e) => setOffCity(e.target.value)} placeholder="Pune" /></label>
                <label className={field}><span className={lbl}>Code</span><input className="input h-9 text-sm uppercase" value={offCode} onChange={(e) => setOffCode(e.target.value)} placeholder="NCP" /></label>
              </div>
            )}
          </div>

          {/* floor */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-subtle"><LayoutGrid className="h-3.5 w-3.5" /> Floor</p>
            <div className="grid grid-cols-2 gap-2">
              <label className={cn(field, 'col-span-2')}><span className={lbl}>Floor name</span><input className="input h-9 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Level 2 · Operations" /></label>
              <label className={field}><span className={lbl}>Width (ft)</span><input type="number" min={10} className="input h-9 text-sm" value={width} onChange={(e) => setWidth(+e.target.value)} /></label>
              <label className={field}><span className={lbl}>Depth (ft)</span><input type="number" min={10} className="input h-9 text-sm" value={height} onChange={(e) => setHeight(+e.target.value)} /></label>
              <label className={field}><span className={lbl}>Scale (px/ft)</span><input type="number" min={2} max={40} step={0.5} className="input h-9 text-sm" value={ppf} onChange={(e) => setPpf(+e.target.value)} /></label>
              <label className={field}><span className={lbl}>Level</span><input type="number" className="input h-9 text-sm" value={level} onChange={(e) => setLevel(+e.target.value)} /></label>
            </div>
            <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-2xs text-muted">
              Canvas: <span className="font-semibold text-content">{width}′ × {height}′</span> ≈ {Math.round(width * ppf)} × {Math.round(height * ppf)} px · {(width * height).toLocaleString()} sq ft
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button onClick={onClose} className="btn-ghost h-9 px-3 text-sm">Cancel</button>
          <button onClick={submit} disabled={!canCreate} className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors', canCreate ? 'bg-brand text-white hover:bg-brand-strong' : 'cursor-not-allowed bg-surface-3 text-subtle')}>
            <Sparkles className="h-4 w-4" /> Create floor
          </button>
        </div>
      </div>
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors', active ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-surface-2 hover:text-content')}>
      {children}
    </button>
  )
}
