import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  Map, Boxes, TrendingUp, ShieldCheck, ArrowLeftRight, ArrowUpRight, CalendarClock,
  UserX, AlertTriangle, Sparkles, QrCode, Users2, Activity, ChevronRight, Package, Clock, Check,
} from 'lucide-react'
import { Page } from '@/components/Page'
import { StatCard, Avatar, ConditionBadge } from '@/components/ui'
import { ChartCard, ChartTooltip } from '@/components/charts'
import { useData, deptName, officeName } from '@/lib/store'
import { useChart } from '@/lib/chart'
import { CONDITION_META } from '@/lib/status'
import { useSimulatedLoad } from '@/hooks'
import { cn, formatCurrency, relativeTime, daysBetween, formatDate } from '@/lib/utils'
import type { AssetCondition } from '@/lib/types'

export function DashboardPage() {
  const { seats, employees, assets, movements, verifications, seatEvents, floors } = useData()
  const c = useChart()
  const nav = useNavigate()
  const loading = useSimulatedLoad(420)

  const totalSeats = seats.length
  const occupied = seats.filter((s) => s.status === 'occupied' || s.status === 'notice').length
  const occRate = Math.round((occupied / totalSeats) * 100)
  const notice = seats.filter((s) => s.status === 'notice').length
  const unseated = employees.filter((e) => !e.currentSeatId).length
  const registerValue = assets.reduce((s, a) => s + a.purchaseValue, 0)
  const overdueVerif = verifications.filter((v) => v.status === 'overdue').length
  const openMoves = movements.filter((m) => m.stage !== 'received' && m.stage !== 'rejected').length
  const flagged = assets.filter((a) => a.flagged).length
  const compliance = Math.round((verifications.filter((v) => v.status === 'completed').length / verifications.length) * 100)

  const byFloor = floors.map((f) => {
    const fs = seats.filter((s) => s.floorId === f.id)
    return {
      name: f.name.split('·')[0].trim(),
      Occupied: fs.filter((s) => s.status === 'occupied' || s.status === 'notice').length,
      Vacant: fs.filter((s) => s.status === 'vacant').length,
      Other: fs.filter((s) => s.status === 'maintenance' || s.status === 'blocked').length,
    }
  })

  const condOrder: AssetCondition[] = ['new', 'good', 'fair', 'damaged', 'beyond-repair']
  const condColor: Record<AssetCondition, string> = { new: c.vacant, good: c.notice, fair: c.maint, damaged: c.occupied, 'beyond-repair': c.blocked }
  const byCondition = condOrder.map((cd) => ({ name: CONDITION_META[cd].label, value: assets.filter((a) => a.condition === cd).length, color: condColor[cd] })).filter((d) => d.value > 0)

  const upcoming = employees
    .filter((e) => e.employmentStatus === 'notice' && e.lastWorkingDay)
    .map((e) => ({ e, seat: seats.find((s) => s.id === e.currentSeatId), days: daysBetween(e.lastWorkingDay!) }))
    .sort((a, b) => a.days - b.days).slice(0, 4)

  const activity = useMemo(() => {
    const seatItems = seatEvents.slice(0, 6).map((e) => ({
      id: e.id, kind: 'seat' as const, title: `Seat ${e.seatNumber} ${e.type.replace('-', ' ')}`,
      detail: e.employeeName ? `${e.employeeName} · ${e.reason}` : e.reason, time: e.timestamp, link: `/seating?seat=${e.seatId}`,
    }))
    const assetItems = assets.flatMap((a) => a.timeline.slice(-1).map((t) => ({
      id: t.id, kind: 'asset' as const, title: `${a.tag} · ${t.title}`, detail: t.detail, time: t.timestamp, link: `/assets/${a.id}`,
    })))
    return [...seatItems, ...assetItems].sort((a, b) => +new Date(b.time) - +new Date(a.time)).slice(0, 8)
  }, [seatEvents, assets])

  const activeMoves = movements.filter((m) => m.stage !== 'received' && m.stage !== 'rejected').slice(0, 4)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <Page wide>
      {/* hero */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-notice/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-brand"><Sparkles className="h-4 w-4" /> Executive overview</p>
            <h1 className="text-2xl font-semibold tracking-tight text-content sm:text-3xl">{greeting}, Admin</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted">A single, live view of people, seats and physical assets across Aster HQ and regional offices — {formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/seating" className="btn-secondary"><Map className="h-4 w-4" /> Floor map</Link>
            <Link to="/scan" className="btn-secondary"><QrCode className="h-4 w-4" /> Scan asset</Link>
            <Link to="/assets" className="btn-primary"><Boxes className="h-4 w-4" /> Asset register</Link>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Seat occupancy" value={`${occRate}%`} icon={<TrendingUp className="h-5 w-5" />} accent="brand" sub={`${occupied}/${totalSeats} seats`} delta={{ value: '3.2%', up: true }} />
        <StatCard label="Tagged assets" value={assets.length} icon={<Boxes className="h-5 w-5" />} accent="notice" sub={formatCurrency(registerValue)} />
        <StatCard label="Verification" value={`${compliance}%`} icon={<ShieldCheck className="h-5 w-5" />} accent="vacant" sub={`${overdueVerif} overdue`} />
        <StatCard label="Open movements" value={openMoves} icon={<ArrowLeftRight className="h-5 w-5" />} accent="maint" sub={`${flagged} flagged assets`} />
      </div>

      {/* module split */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Workplace overview */}
        <ChartCard
          title="Workplace" subtitle="Occupancy by floor" className="lg:col-span-2"
          action={<Link to="/seating-analytics" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">Analytics <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        >
          <div className="mb-4 grid grid-cols-3 gap-3">
            <MiniKpi icon={Users2} label="Occupied" value={occupied} tone="occupied" />
            <MiniKpi icon={CalendarClock} label="On notice" value={notice} tone="notice" />
            <MiniKpi icon={UserX} label="Awaiting seat" value={unseated} tone="maint" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byFloor} barSize={44} margin={{ left: -24, top: 6 }}>
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
              <Tooltip cursor={{ fill: c.grid }} content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
              <Bar dataKey="Occupied" stackId="a" fill={c.occupied} />
              <Bar dataKey="Vacant" stackId="a" fill={c.vacant} />
              <Bar dataKey="Other" stackId="a" fill={c.blocked} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Attention needed */}
        <ChartCard title="Attention needed" subtitle="Exceptions across both modules">
          <div className="space-y-2">
            <AttentionRow icon={AlertTriangle} tone="occupied" label="Overdue verifications" value={overdueVerif} onClick={() => nav('/verification')} />
            <AttentionRow icon={ShieldCheck} tone="maint" label="Flagged assets" value={flagged} onClick={() => nav('/assets')} />
            <AttentionRow icon={UserX} tone="notice" label="Employees without a seat" value={unseated} onClick={() => nav('/directory')} />
            <AttentionRow icon={CalendarClock} tone="notice" label="Seats freeing in 30 days" value={notice} onClick={() => nav('/seating-analytics')} />
            <AttentionRow icon={ArrowLeftRight} tone="brand" label="Movements in progress" value={openMoves} onClick={() => nav('/movements')} />
          </div>
        </ChartCard>
      </div>

      {/* second row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* asset condition */}
        <ChartCard title="Asset condition" subtitle={`${assets.length} tagged items`} action={<Link to="/asset-analytics" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">Analytics <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          <div className="relative">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={byCondition} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                  {byCondition.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold text-content">{assets.length}</span>
              <span className="text-2xs text-muted">assets</span>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
            {byCondition.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-2xs">
                <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
                <span className="text-muted">{d.name}</span><span className="ml-auto font-semibold text-content">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* movements in progress */}
        <ChartCard title="Movements in progress" subtitle="Governed asset transfers" action={<Link to="/movements" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">Board <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          {activeMoves.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">No active movements.</p>
          ) : (
            <div className="space-y-2">
              {activeMoves.map((m) => (
                <button key={m.id} onClick={() => nav(`/assets/${m.assetId}`)} className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-surface-2">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted"><Package className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-content">{m.assetName}</p>
                    <p className="truncate text-2xs text-muted">{m.fromRoom} → {m.toRoom}</p>
                  </div>
                  <span className="chip bg-brand-soft px-2 py-0.5 text-2xs capitalize text-brand">{m.stage.replace('-', ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </ChartCard>

        {/* upcoming vacancies */}
        <ChartCard title="Upcoming vacancies" subtitle="Seats freeing up · notice period" action={<Link to="/seating-analytics" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">All <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">No employees on notice.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(({ e, seat, days }) => (
                <button key={e.id} onClick={() => seat && nav(`/seating?seat=${seat.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-surface-2">
                  <Avatar name={e.fullName} hue={e.avatarHue} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-content">{e.fullName}</p>
                    <p className="truncate text-2xs text-muted">{seat?.seatNumber ?? '—'} · {deptName(e.departmentId)}</p>
                  </div>
                  <span className={cn('text-xs font-semibold', days <= 14 ? 'text-occupied' : 'text-notice')}>{days}d</span>
                </button>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* activity feed */}
      <ChartCard title="Recent activity" subtitle="Live audit trail across seating and assets" className="mt-4">
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
          {activity.map((a) => (
            <button key={a.id} onClick={() => nav(a.link)} className="flex items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2">
              <div className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', a.kind === 'seat' ? 'bg-brand-soft text-brand' : 'bg-notice-soft text-notice')}>
                {a.kind === 'seat' ? <Map className="h-4 w-4" /> : <Boxes className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-content">{a.title}</p>
                <p className="truncate text-xs text-muted">{a.detail}</p>
              </div>
              <span className="shrink-0 text-2xs text-subtle">{relativeTime(a.time)}</span>
            </button>
          ))}
        </div>
      </ChartCard>
    </Page>
  )
}

function MiniKpi({ icon: Icon, label, value, tone }: { icon: typeof Users2; label: string; value: number; tone: string }) {
  const toneMap: Record<string, string> = { occupied: 'text-occupied bg-occupied-soft', notice: 'text-notice bg-notice-soft', maint: 'text-maint bg-maint-soft' }
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <div className={cn('mb-2 grid h-7 w-7 place-items-center rounded-lg', toneMap[tone])}><Icon className="h-4 w-4" /></div>
      <p className="text-lg font-semibold text-content">{value}</p>
      <p className="text-2xs text-muted">{label}</p>
    </div>
  )
}

function AttentionRow({ icon: Icon, tone, label, value, onClick }: { icon: typeof AlertTriangle; tone: string; label: string; value: number; onClick: () => void }) {
  const toneMap: Record<string, string> = { occupied: 'text-occupied bg-occupied-soft', maint: 'text-maint bg-maint-soft', notice: 'text-notice bg-notice-soft', brand: 'text-brand bg-brand-soft' }
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-surface-2">
      <div className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', toneMap[tone])}><Icon className="h-4 w-4" /></div>
      <span className="flex-1 text-sm text-content">{label}</span>
      <span className="text-sm font-semibold text-content">{value}</span>
      <ChevronRight className="h-4 w-4 text-subtle" />
    </button>
  )
}
