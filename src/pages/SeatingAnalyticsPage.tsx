import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import { Armchair, TrendingUp, CalendarClock, DoorOpen, Download, ArrowLeftRight, ArrowRight } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, StatCard, Avatar } from '@/components/ui'
import { ChartCard, ChartTooltip } from '@/components/charts'
import { useChart } from '@/lib/chart'
import { useCountUp } from '@/hooks'
import { cn, downloadCSV, relativeTime } from '@/lib/utils'
import { useSeatSource, NEIGHBORHOOD } from '@/features/neighborhood/seatSource'

const TYPE_COLOR_KEY: Record<string, 'occupied' | 'notice' | 'maint'> = { employee: 'occupied', intern: 'notice', partner: 'maint' }

export function SeatingAnalyticsPage() {
  const { desks, requests, counts, total, occupied, occRate, byType, noticeRows } = useSeatSource()
  const c = useChart()
  const nav = useNavigate()

  const statusData = [
    { name: 'Occupied', value: counts.occupied, color: c.occupied },
    { name: 'On Notice', value: counts.notice, color: c.notice },
    { name: 'Vacant', value: counts.vacant, color: c.vacant },
    { name: 'Maintenance', value: counts.maintenance, color: c.maint },
    { name: 'Blocked', value: counts.blocked, color: c.blocked },
  ].filter((d) => d.value > 0)

  const byPod = useMemo(() => {
    const map = new Map<string, { name: string; Occupied: number; Vacant: number; Other: number }>()
    for (const d of desks) {
      const e = map.get(d.pod) ?? { name: d.pod, Occupied: 0, Vacant: 0, Other: 0 }
      if (d.status === 'occupied' || d.status === 'notice') e.Occupied += 1
      else if (d.status === 'vacant') e.Vacant += 1
      else e.Other += 1
      map.set(d.pod, e)
    }
    return [...map.values()].sort((a, b) => (b.Occupied + b.Vacant + b.Other) - (a.Occupied + a.Vacant + a.Other))
  }, [desks])

  const typeData = byType.map((t) => ({ name: t.name, value: t.value, color: c[TYPE_COLOR_KEY[t.key]] }))
  const animatedRate = useCountUp(occRate)
  const recent = requests.slice(0, 8)

  const exportOcc = () => downloadCSV('rodic-assetspace-occupancy-by-area.csv', byPod.map((p) => ({ Area: p.name, ...p })))

  return (
    <Page>
      <PageHeader
        title="Seating Analytics"
        subtitle={`Occupancy, vacancy and workforce mix · ${NEIGHBORHOOD.name}`}
        icon={<TrendingUp className="h-5 w-5" />}
        actions={<button className="btn-secondary" onClick={exportOcc}><Download className="h-4 w-4" /> Export</button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total seats" value={total} icon={<Armchair className="h-5 w-5" />} sub={NEIGHBORHOOD.name} />
        <StatCard label="Occupancy" value={`${animatedRate}%`} icon={<TrendingUp className="h-5 w-5" />} accent="occupied" />
        <StatCard label="On notice" value={counts.notice} icon={<CalendarClock className="h-5 w-5" />} accent="notice" sub="freeing up soon" />
        <StatCard label="Vacant seats" value={counts.vacant} icon={<DoorOpen className="h-5 w-5" />} accent="vacant" sub="available now" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* status donut */}
        <ChartCard title="Seat status mix" subtitle={`${occupied} of ${total} seats in use`}>
          <div className="relative">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2} strokeWidth={0}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-content">{occRate}%</span>
              <span className="text-xs text-muted">occupied</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                <span className="text-muted">{d.name}</span>
                <span className="ml-auto font-semibold text-content">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* occupancy by area/bench */}
        <ChartCard title="Occupancy by area" subtitle="Seats in use vs available per bench / cell" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={286}>
            <BarChart data={byPod} barSize={26} margin={{ left: -18, top: 10 }}>
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fill: c.axis, fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} allowDecimals={false} />
              <Tooltip cursor={{ fill: c.grid }} content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
              <Bar dataKey="Occupied" stackId="a" fill={c.occupied} />
              <Bar dataKey="Vacant" stackId="a" fill={c.vacant} />
              <Bar dataKey="Other" stackId="a" fill={c.blocked} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* seats by workforce type */}
        <ChartCard title="Seats by workforce type" subtitle="Employee / Intern / Partner" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={typeData} layout="vertical" margin={{ left: 60, right: 24 }} barSize={20}>
              <CartesianGrid horizontal={false} stroke={c.grid} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} tick={{ fill: c.axis, fontSize: 12 }} />
              <Tooltip cursor={{ fill: c.grid }} content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Seats">
                {typeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                <LabelList dataKey="value" position="right" fill={c.axis} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* on notice */}
        <ChartCard title="On notice" subtitle="Seats freeing up soon">
          {noticeRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">No one on notice.</p>
          ) : (
            <div className="space-y-2">
              {noticeRows.map(({ person, desk }) => (
                <button key={person.id} onClick={() => desk && nav(`/neighborhood?desk=${desk.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-surface-2">
                  <Avatar name={person.name} hue={person.hue} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-content">{person.name}</p>
                    <p className="truncate text-2xs text-muted">Seat {desk?.label ?? '—'} · {desk?.pod}</p>
                  </div>
                  <span className="text-xs font-semibold text-notice">Notice</span>
                </button>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* recent requests */}
      <ChartCard title="Recent seat requests" subtitle="Change / swap audit trail" className="mt-4">
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-subtle">No seat requests yet. Employees raise these from the Seat Map.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-2xs uppercase tracking-wide text-subtle">
                  <th className="pb-2 font-semibold">Type</th><th className="pb-2 font-semibold">Employee</th>
                  <th className="pb-2 font-semibold">Move</th><th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 text-right font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5"><span className="chip bg-surface-2 capitalize text-muted">{r.type === 'swap' ? <ArrowLeftRight className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />} {r.type}</span></td>
                    <td className="py-2.5 font-medium text-content">{r.requesterName}</td>
                    <td className="py-2.5 text-muted">{r.type === 'change' ? `${r.currentDeskLabel ?? '—'} → ${r.targetDeskLabel}` : `${r.currentDeskLabel} ↔ ${r.otherDeskLabel}`}</td>
                    <td className="py-2.5 capitalize text-muted">{r.status}</td>
                    <td className="py-2.5 text-right text-2xs text-subtle">{relativeTime(r.requestDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </Page>
  )
}
