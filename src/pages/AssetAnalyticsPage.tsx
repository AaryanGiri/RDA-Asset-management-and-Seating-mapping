import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList, RadialBarChart, RadialBar,
} from 'recharts'
import { BarChart3, Boxes, IndianRupee, ShieldAlert, Activity } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, StatCard } from '@/components/ui'
import { ChartCard, ChartTooltip } from '@/components/charts'
import { useData, officeName } from '@/lib/store'
import { useChart } from '@/lib/chart'
import { CONDITION_META } from '@/lib/status'
import { formatCurrency, daysBetween } from '@/lib/utils'
import type { AssetCondition } from '@/lib/types'

export function AssetAnalyticsPage() {
  const assets = useData((s) => s.assets)
  const categories = useData((s) => s.categories)
  const offices = useData((s) => s.offices)
  const c = useChart()

  const byCategory = categories.map((cat) => ({
    name: cat.name,
    count: assets.filter((a) => a.categoryId === cat.id).length,
    value: assets.filter((a) => a.categoryId === cat.id).reduce((s, a) => s + a.purchaseValue, 0),
  })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count)

  const condOrder: AssetCondition[] = ['new', 'good', 'fair', 'damaged', 'beyond-repair']
  const condColor: Record<AssetCondition, string> = { new: c.vacant, good: c.notice, fair: c.maint, damaged: c.occupied, 'beyond-repair': c.blocked }
  const byCondition = condOrder.map((cd) => ({ name: CONDITION_META[cd].label, value: assets.filter((a) => a.condition === cd).length, color: condColor[cd] })).filter((d) => d.value > 0)

  const statusData = [
    { name: 'In Use', key: 'in-use' }, { name: 'In Transit', key: 'in-transit' }, { name: 'Under Repair', key: 'under-repair' }, { name: 'In Storage', key: 'in-storage' },
  ].map((s, i) => ({ name: s.name, value: assets.filter((a) => a.status === s.key).length, color: c.series[i] })).filter((d) => d.value > 0)

  const totalValue = assets.reduce((s, a) => s + a.purchaseValue, 0)
  const avgScore = Math.round(assets.reduce((s, a) => s + CONDITION_META[a.condition].score, 0) / assets.length)
  const overdue = assets.filter((a) => daysBetween(a.nextVerificationDue) <= 0).length

  const compliance = useMemo(() => {
    const pilot = offices.filter((o) => ['hq', 'mum', 'blr'].includes(o.id))
    return pilot.map((o) => {
      const own = assets.filter((a) => a.officeId === o.id)
      const verified = own.filter((a) => daysBetween(a.nextVerificationDue) > 0).length
      const pct = own.length ? Math.round((verified / own.length) * 100) : 0
      return { name: o.code, full: o.name, value: pct, fill: pct >= 80 ? c.vacant : pct >= 55 ? c.maint : c.occupied }
    })
  }, [assets, offices, c])

  return (
    <Page wide>
      <PageHeader title="Asset Analytics" subtitle="Portfolio health across category, condition, status and verification" icon={<BarChart3 className="h-5 w-5" />} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tagged assets" value={assets.length} icon={<Boxes className="h-5 w-5" />} />
        <StatCard label="Register value" value={formatCurrency(totalValue)} icon={<IndianRupee className="h-5 w-5" />} accent="vacant" />
        <StatCard label="Avg condition" value={`${avgScore}/100`} icon={<Activity className="h-5 w-5" />} accent="notice" delta={{ value: 'healthy', up: true }} />
        <StatCard label="Overdue checks" value={overdue} icon={<ShieldAlert className="h-5 w-5" />} accent="maint" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Assets by category" subtitle="Portfolio composition" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byCategory} barSize={30} margin={{ left: -18, top: 8 }}>
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
              <Tooltip cursor={{ fill: c.grid }} content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
              <Bar dataKey="count" name="Assets" radius={[6, 6, 0, 0]} fill={c.brand}>
                <LabelList dataKey="count" position="top" fill={c.axis} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Condition mix" subtitle="Assessed health">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byCondition} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2} strokeWidth={0}>
                {byCondition.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {byCondition.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                <span className="text-muted">{d.name}</span><span className="ml-auto font-semibold text-content">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Value by category" subtitle="Capital distribution (INR)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCategory} layout="vertical" margin={{ left: 40, right: 40 }} barSize={16}>
              <CartesianGrid horizontal={false} stroke={c.grid} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 100000)}L`} />
              <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
              <Tooltip cursor={{ fill: c.grid }} content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} valueSuffix="" />} />
              <Bar dataKey="value" name="Value" radius={[0, 6, 6, 0]} fill={c.notice}>
                <LabelList dataKey="value" position="right" fill={c.axis} fontSize={10} formatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Verification compliance" subtitle="Verified vs total, by office">
          <div className="space-y-3 pt-2">
            {compliance.map((o) => (
              <div key={o.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-content">{o.full}</span>
                  <span className="font-semibold" style={{ color: o.fill }}>{o.value}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${o.value}%`, background: o.fill }} />
                </div>
              </div>
            ))}
            <div className="mt-3 rounded-xl bg-surface-2 p-3 text-2xs text-muted">
              Monthly cycle target: <span className="font-semibold text-content">≥ 90%</span> assets verified per office.
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Status distribution" subtitle="Where assets are in their lifecycle" className="mt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statusData.map((s) => (
            <div key={s.name} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-xs text-muted">{s.name}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-content">{s.value}</p>
              <p className="text-2xs text-subtle">{Math.round((s.value / assets.length) * 100)}% of portfolio</p>
            </div>
          ))}
        </div>
      </ChartCard>
    </Page>
  )
}
