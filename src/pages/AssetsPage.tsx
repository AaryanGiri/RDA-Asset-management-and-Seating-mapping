import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Boxes, IndianRupee, ArrowLeftRight, ShieldAlert, ChevronRight, AlertTriangle } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, StatCard, Avatar, ConditionBadge, AssetStatusBadge } from '@/components/ui'
import { CategoryIcon, QrThumb } from '@/features/assets/assetUi'
import { useData, officeName } from '@/lib/store'
import { useSimulatedLoad } from '@/hooks'
import { cn, downloadCSV, formatCurrency, formatDate, daysBetween } from '@/lib/utils'
import type { AssetCondition, AssetStatus } from '@/lib/types'

export function AssetsPage() {
  const assets = useData((s) => s.assets)
  const categories = useData((s) => s.categories)
  const employees = useData((s) => s.employees)
  const nav = useNavigate()
  const loading = useSimulatedLoad(460)

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [cond, setCond] = useState<'all' | AssetCondition>('all')
  const [status, setStatus] = useState<'all' | AssetStatus>('all')

  const rows = useMemo(() => {
    return assets.filter((a) => {
      if (cat !== 'all' && a.categoryId !== cat) return false
      if (cond !== 'all' && a.condition !== cond) return false
      if (status !== 'all' && a.status !== status) return false
      const hay = `${a.tag} ${a.name} ${a.serialNumber} ${a.room} ${a.brand}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
  }, [assets, q, cat, cond, status])

  const totalValue = assets.reduce((s, a) => s + a.purchaseValue, 0)
  const inTransit = assets.filter((a) => a.status === 'in-transit').length
  const needsVerif = assets.filter((a) => daysBetween(a.nextVerificationDue) <= 0).length
  const flagged = assets.filter((a) => a.flagged).length

  const custodian = (id: string) => employees.find((e) => e.id === id)

  const exportCSV = () => downloadCSV('locus-asset-register.csv', rows.map((a) => ({
    Tag: a.tag, Name: a.name, Category: categories.find((c) => c.id === a.categoryId)?.name, Serial: a.serialNumber,
    Condition: a.condition, Status: a.status, Office: officeName(a.officeId), Room: a.room,
    Custodian: custodian(a.custodianId)?.fullName ?? '—', Value: a.purchaseValue, NextVerification: formatDate(a.nextVerificationDue),
  })))

  return (
    <Page wide>
      <PageHeader
        title="Asset Register"
        subtitle={`${assets.length} tagged assets · unique QR identity per item`}
        icon={<Boxes className="h-5 w-5" />}
        actions={<button className="btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tagged assets" value={assets.length} icon={<Boxes className="h-5 w-5" />} sub="across 3 offices" />
        <StatCard label="Register value" value={formatCurrency(totalValue)} icon={<IndianRupee className="h-5 w-5" />} accent="vacant" />
        <StatCard label="In transit" value={inTransit} icon={<ArrowLeftRight className="h-5 w-5" />} accent="notice" sub="movements underway" />
        <StatCard label="Needs verification" value={needsVerif} icon={<ShieldAlert className="h-5 w-5" />} accent="maint" sub={`${flagged} flagged exceptions`} />
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill active={cat === 'all'} onClick={() => setCat('all')}>All</FilterPill>
          {categories.map((c) => (
            <FilterPill key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              <CategoryIcon catId={c.id} className="h-3.5 w-3.5" /> {c.name}
            </FilterPill>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={cond} onChange={(e) => setCond(e.target.value as any)} className="input h-9 w-auto py-1.5">
            <option value="all">Any condition</option>
            <option value="new">New</option><option value="good">Good</option><option value="fair">Fair</option>
            <option value="damaged">Damaged</option><option value="beyond-repair">Beyond Repair</option>
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tag, serial, name…" className="input pl-9" />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[64px_2fr_1.1fr_1fr_1.3fr_1fr] gap-4 border-b border-border bg-surface-2/50 px-5 py-3 text-2xs font-semibold uppercase tracking-wide text-subtle lg:grid">
          <span>QR</span><span>Asset</span><span>Condition</span><span>Status</span><span>Location · Custodian</span><span className="text-right">Next check</span>
        </div>
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="skeleton h-11 w-11 rounded-lg" />
                <div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-48" /><div className="skeleton h-2.5 w-28" /></div>
                <div className="skeleton h-6 w-16 rounded-full" /><div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((a) => {
              const cust = custodian(a.custodianId)
              const due = daysBetween(a.nextVerificationDue)
              return (
                <button
                  key={a.id}
                  data-asset-row
                  onClick={() => nav(`/assets/${a.id}`)}
                  className="grid w-full grid-cols-1 items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2 lg:grid-cols-[64px_2fr_1.1fr_1fr_1.3fr_1fr] lg:gap-4"
                >
                  <QrThumb value={a.tag} size={40} />
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted"><CategoryIcon catId={a.categoryId} className="h-4.5 w-4.5" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{a.name}</p>
                      <p className="truncate font-mono text-2xs text-muted">{a.tag} · {a.serialNumber}</p>
                    </div>
                    {a.flagged && <AlertTriangle className="h-4 w-4 shrink-0 text-maint" />}
                  </div>
                  <div><ConditionBadge condition={a.condition} /></div>
                  <div><AssetStatusBadge status={a.status} /></div>
                  <div className="flex items-center gap-2">
                    {cust && <Avatar name={cust.fullName} hue={cust.avatarHue} size={26} />}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-content">{a.room}</p>
                      <p className="truncate text-2xs text-muted">{cust?.fullName ?? 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className={cn('text-xs font-medium', due <= 0 ? 'text-occupied' : due <= 7 ? 'text-maint' : 'text-muted')}>
                      {due <= 0 ? 'Overdue' : `${due}d`}
                    </span>
                    <ChevronRight className="h-4 w-4 text-subtle" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {!loading && <p className="mt-3 text-xs text-subtle">Showing {rows.length} of {assets.length} assets.</p>}
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
