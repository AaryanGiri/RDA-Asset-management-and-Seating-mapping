import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import { Armchair, TrendingUp, CalendarClock, UserX, Download, ArrowUpRight } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, StatCard, Avatar } from '@/components/ui'
import { ChartCard, ChartTooltip } from '@/components/charts'
import { useData, deptName } from '@/lib/store'
import { useChart } from '@/lib/chart'
import { SEAT_STATUS } from '@/lib/status'
import { useSimulatedLoad } from '@/hooks'
import { useCountUp } from '@/hooks'
import { cn, daysBetween, downloadCSV, formatDate, relativeTime } from '@/lib/utils'
import type { SeatStatus } from '@/lib/types'

export function SeatingAnalyticsPage() {
  const seats = useData((s) => s.seats)
  const employees = useData((s) => s.employees)
  const floors = useData((s) => s.floors)
  const departments = useData((s) => s.departments)
  const seatEvents = useData((s) => s.seatEvents)
  const c = useChart()
  const loading = useSimulatedLoad(500)

  const counts = useMemo(() => {
    const o = { vacant: 0, occupied: 0, notice: 0, maintenance: 0, blocked: 0 } as Record<SeatStatus, number>
    seats.forEach((s) => (o[s.status] += 1))
    return o
  }, [seats])

  const total = seats.length
  const occupied = counts.occupied + counts.notice
  const occRate = Math.round((occupied / total) * 100)
  const unseated = employees.filter((e) => !e.currentSeatId).length

  const statusData = [
    { name: 'Occupied', value: counts.occupied, color: c.occupied },
    { name: 'On Notice', value: counts.notice, color: c.notice },
    { name: 'Vacant', value: counts.vacant, color: c.vacant },
    { name: 'Maintenance', value: counts.maintenance, color: c.maint },
    { name: 'Blocked', value: counts.blocked, color: c.blocked },
  ].filter((d) => d.value > 0)

  const byFloor = floors.map((f) => {
    const fs = seats.filter((s) => s.floorId === f.id)
    return {
      name: f.name.split('·')[0].trim(),
      Occupied: fs.filter((s) => s.status === 'occupied' || s.status === 'notice').length,
      Vacant: fs.filter((s) => s.status === 'vacant').length,
      Other: fs.filter((s) => s.status === 'maintenance' || s.status === 'blocked').length,
    }
  })

  const byDept = departments.map((d) => ({
    name: d.name,
    value: employees.filter((e) => e.departmentId === d.id && e.currentSeatId).length,
    color: d.color,
  })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value)

  const upcoming = employees
    .filter((e) => e.employmentStatus === 'notice' && e.lastWorkingDay)
    .map((e) => ({ e, seat: seats.find((s) => s.id === e.currentSeatId), days: daysBetween(e.lastWorkingDay!) }))
    .sort((a, b) => a.days - b.days)

  const recent = seatEvents.slice(0, 8)

  const animatedRate = useCountUp(occRate)

  const exportOcc = () => downloadCSV('rodic-assetspace-occupancy-by-floor.csv', byFloor.map((f) => ({ Floor: f.name, ...f })))

  return (
    <Page>
      <PageHeader
        title="Seating Analytics"
        subtitle="Occupancy, vacancy and upcoming-vacancy insight across Aster HQ"
        icon={<TrendingUp className="h-5 w-5" />}
        actions={<button className="btn-secondary" onClick={exportOcc}><Download className="h-4 w-4" /> Export</button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total seats" value={total} icon={<Armchair className="h-5 w-5" />} sub={`across ${floors.length} floors`} />
        <StatCard label="Occupancy" value={`${animatedRate}%`} icon={<TrendingUp className="h-5 w-5" />} accent="occupied" delta={{ value: '3.2% MoM', up: true }} />
        <StatCard label="Freeing in 30d" value={upcoming.filter((u) => u.days <= 30).length} icon={<CalendarClock className="h-5 w-5" />} accent="notice" sub="on notice period" />
        <StatCard label="Awaiting seat" value={unseated} icon={<UserX className="h-5 w-5" />} accent="maint" sub="new joiners / transfers" />
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

        {/* occupancy by floor */}
        <ChartCard title="Occupancy by floor" subtitle="Seats in use vs available" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={286}>
            <BarChart data={byFloor} barSize={38} margin={{ left: -18, top: 10 }}>
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
              <Tooltip cursor={{ fill: c.grid }} content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
              <Bar dataKey="Occupied" stackId="a" fill={c.occupied} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Vacant" stackId="a" fill={c.vacant} />
              <Bar dataKey="Other" stackId="a" fill={c.blocked} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* seats by department */}
        <ChartCard title="Seats by department" subtitle="Allocated headcount" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byDept} layout="vertical" margin={{ left: 46, right: 24 }} barSize={16}>
              <CartesianGrid horizontal={false} stroke={c.grid} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} tick={{ fill: c.axis, fontSize: 12 }} />
              <Tooltip cursor={{ fill: c.grid }} content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Seats">
                {byDept.map((d, i) => <Cell key={i} fill={d.color} />)}
                <LabelList dataKey="value" position="right" fill={c.axis} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* upcoming vacancies */}
        <ChartCard title="Upcoming vacancies" subtitle="Seats freeing up · notice period">
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">No employees on notice.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.slice(0, 6).map(({ e, seat, days }) => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                  <Avatar name={e.fullName} hue={e.avatarHue} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-content">{e.fullName}</p>
                    <p className="truncate text-2xs text-muted">Seat {seat?.seatNumber ?? '—'} · {deptName(e.departmentId)}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-semibold', days <= 14 ? 'text-occupied' : 'text-notice')}>{days}d</p>
                    <p className="text-2xs text-subtle">{formatDate(e.lastWorkingDay!, { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* recent changes */}
      <ChartCard title="Recent seat changes" subtitle="Audit trail" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-2xs uppercase tracking-wide text-subtle">
                <th className="pb-2 font-semibold">Action</th><th className="pb-2 font-semibold">Seat</th>
                <th className="pb-2 font-semibold">Employee</th><th className="pb-2 font-semibold">Reason</th>
                <th className="pb-2 text-right font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((e) => (
                <tr key={e.id}>
                  <td className="py-2.5"><span className="chip bg-surface-2 capitalize text-muted">{e.type.replace('-', ' ')}</span></td>
                  <td className="py-2.5 font-medium text-content">{e.seatNumber}</td>
                  <td className="py-2.5 text-muted">{e.employeeName ?? '—'}</td>
                  <td className="py-2.5 text-muted">{e.reason}</td>
                  <td className="py-2.5 text-right text-2xs text-subtle">{relativeTime(e.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </Page>
  )
}
