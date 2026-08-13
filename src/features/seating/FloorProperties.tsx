import { useState, useEffect } from 'react'
import { Building2, Save, IndianRupee, Ruler } from 'lucide-react'
import { Sheet, Field } from '@/components/ui'
import { useData } from '@/lib/store'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import type { Floor, FloorProperties as FP } from '@/lib/types'

const NUM_FIELDS: { key: keyof FP; label: string; kind: 'area' | 'money' }[] = [
  { key: 'carpetArea', label: 'Carpet Area (sq ft)', kind: 'area' },
  { key: 'superBuiltUpArea', label: 'Super Built-up Area (sq ft)', kind: 'area' },
  { key: 'rentalCost', label: 'Rental Cost (₹ / month)', kind: 'money' },
  { key: 'maintenanceCharge', label: 'Maintenance Charge (₹ / month)', kind: 'money' },
  { key: 'overheadExpenses', label: 'Overhead Expenses (₹ / month)', kind: 'money' },
  { key: 'miscExpense', label: 'Miscellaneous Expense (₹ / month)', kind: 'money' },
]

export function FloorProperties({ open, onClose, floor, seatCount }: { open: boolean; onClose: () => void; floor: Floor; seatCount: number }) {
  const update = useData((s) => s.updateFloorProperties)
  const [draft, setDraft] = useState<FP>(floor.properties ?? {})
  useEffect(() => { setDraft(floor.properties ?? {}) }, [floor.id, floor.properties])

  const p = draft
  const total = (p.carpetArea ?? 0) + (p.superBuiltUpArea ?? 0)
  const monthlyCost = (p.rentalCost ?? 0) + (p.maintenanceCharge ?? 0) + (p.overheadExpenses ?? 0) + (p.miscExpense ?? 0)
  const costPerSeat = seatCount ? Math.round(monthlyCost / seatCount) : 0

  const save = () => { update(floor.id, draft); onClose() }

  return (
    <Sheet open={open} onClose={onClose} width={460} title={
      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-brand" /><span className="text-sm font-semibold text-content">Floor Properties</span></div>
    }>
      <div className="space-y-5 p-5">
        <div>
          <p className="text-sm font-semibold text-content">{floor.name}</p>
          <p className="text-2xs text-muted">Area & cost details linked to this floor.</p>
        </div>

        {/* consolidated view */}
        <div className="grid grid-cols-2 gap-2.5">
          <Stat icon={<Ruler className="h-3.5 w-3.5" />} label="Total / Applicable Area" value={`${formatNumber(total)} sq ft`} accent />
          <Stat icon={<IndianRupee className="h-3.5 w-3.5" />} label="Monthly cost" value={formatCurrency(monthlyCost)} accent />
          <Stat label="Carpet area" value={`${formatNumber(p.carpetArea ?? 0)} sq ft`} />
          <Stat label="Super built-up" value={`${formatNumber(p.superBuiltUpArea ?? 0)} sq ft`} />
          <Stat label="Cost / seat" value={formatCurrency(costPerSeat)} />
          <Stat label="Seats on floor" value={String(seatCount)} />
        </div>

        {/* editable fields */}
        <div className="space-y-3">
          <p className="section-title">Edit properties</p>
          {NUM_FIELDS.map((f) => (
            <Field key={String(f.key)} label={f.label}>
              <input
                type="number" min={0} className="input"
                value={draft[f.key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
              />
            </Field>
          ))}
          <p className="text-2xs text-subtle">Total / Applicable Area = Carpet + Super Built-up (auto-calculated). Values are linked to this floor plan.</p>
        </div>
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface px-5 py-4">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={save} className="btn-primary"><Save className="h-4 w-4" /> Save properties</button>
      </div>
    </Sheet>
  )
}

function Stat({ icon, label, value, accent }: { icon?: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-3', accent ? 'border-brand/30 bg-brand-soft/40' : 'border-border bg-surface-2/40')}>
      <p className="flex items-center gap-1 text-2xs uppercase tracking-wide text-subtle">{icon}{label}</p>
      <p className={cn('mt-1 truncate font-semibold', accent ? 'text-base text-content' : 'text-sm text-content')}>{value}</p>
    </div>
  )
}
