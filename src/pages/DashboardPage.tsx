import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  Boxes, TrendingUp, ArrowUpRight, CalendarClock, Inbox,
  DoorOpen, AlertTriangle, Sparkles, Users2, ChevronRight, LayoutGrid,
} from 'lucide-react'
import { Page } from '@/components/Page'
import { StatCard, Avatar, AssetStatusBadge } from '@/components/ui'
import { CategoryIcon } from '@/features/assets/assetUi'
import { ChartCard, ChartTooltip } from '@/components/charts'
import { useData } from '@/lib/store'
import { useChart } from '@/lib/chart'
import { ASSET_CATEGORY_META } from '@/lib/status'
import { cn, formatDate, relativeTime } from '@/lib/utils'
import { useSeatSource, NEIGHBORHOOD } from '@/features/neighborhood/seatSource'
import type { AssetPrimaryCategory } from '@/lib/types'

export function DashboardPage() {
  const assets = useData((s) => s.assets)
  const offices = useData((s) => s.offices)
  const { desks, requests, counts, total, occupied, occRate, noticeRows } = useSeatSource()
  const c = useChart()
  const nav = useNavigate()

  const notice = counts.notice
  const vacant = counts.vacant
  const defective = assets.filter((a) => a.status === 'defective')
  const pendingReq = requests.filter((r) => r.status === 'pending').length

  const byPod = useMemo(() => {
    const map = new Map<string, { name: string; Occupied: number; Vacant: number; Other: number }>()
    for (const d of desks) {
      const e = map.get(d.pod) ?? { name: d.pod, Occupied: 0, Vacant: 0, Other: 0 }
      if (d.status === 'occupied' || d.status === 'notice') e.Occupied += 1
      else if (d.status === 'vacant') e.Vacant += 1
      else e.Other += 1
      map.set(d.pod, e)
    }
    return [...map.values()].sort((a, b) => (b.Occupied + b.Vacant + b.Other) - (a.Occupied + a.Vacant + a.Other)).slice(0, 7)
  }, [desks])

  const catOrder: AssetPrimaryCategory[] = ['tangible', 'intangible', 'land-building']
  const catColor: Record<AssetPrimaryCategory, string> = { tangible: c.notice, intangible: c.vacant, 'land-building': c.maint }
  const byCategory = catOrder.map((cd) => ({ name: ASSET_CATEGORY_META[cd].short, value: assets.filter((a) => a.category === cd).length, color: catColor[cd] })).filter((d) => d.value > 0)

  const activity = useMemo(() => {
    const seatItems = requests.slice(0, 6).map((r) => ({
      id: r.id, kind: 'seat' as const,
      title: `Seat ${r.type} · ${r.requesterName}`,
      detail: r.type === 'change' ? `${r.currentDeskLabel ?? '—'} → ${r.targetDeskLabel} · ${r.status}` : `${r.currentDeskLabel} ↔ ${r.otherDeskLabel} · ${r.status}`,
      time: r.requestDate, link: '/requests',
    }))
    const assetItems = assets.flatMap((a) => a.lifecycle.slice(-1).map((t) => ({
      id: t.id, kind: 'asset' as const, title: `${a.assetId} · ${t.title}`, detail: t.detail, time: t.timestamp, link: `/assets/${a.id}`,
    })))
    return [...seatItems, ...assetItems].sort((a, b) => +new Date(b.time) - +new Date(a.time)).slice(0, 8)
  }, [requests, assets])

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
            <p className="mt-1.5 max-w-xl text-sm text-muted">A single, live view of people, seats and physical assets across {NEIGHBORHOOD.office} — {formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/neighborhood" className="btn-secondary"><LayoutGrid className="h-4 w-4" /> Seat map</Link>
            <Link to="/requests" className="btn-secondary"><Inbox className="h-4 w-4" /> Seat requests</Link>
            <Link to="/assets" className="btn-primary"><Boxes className="h-4 w-4" /> Asset register</Link>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Seat occupancy" value={`${occRate}%`} icon={<TrendingUp className="h-5 w-5" />} accent="brand" sub={`${occupied}/${total} seats`} />
        <StatCard label="Total assets" value={assets.length} icon={<Boxes className="h-5 w-5" />} accent="notice" sub="across 3 categories" />
        <StatCard label="Defective assets" value={defective.length} icon={<AlertTriangle className="h-5 w-5" />} accent="maint" sub="awaiting Admin action" />
        <StatCard label="Pending seat requests" value={pendingReq} icon={<Inbox className="h-5 w-5" />} accent="vacant" sub="to review" />
      </div>

      {/* module split */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Workplace" subtitle={`${NEIGHBORHOOD.name} · ${NEIGHBORHOOD.office}`} className="lg:col-span-2"
          action={<Link to="/seating-analytics" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">Analytics <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        >
          <div className="mb-4 grid grid-cols-3 gap-3">
            <MiniKpi icon={Users2} label="Occupied" value={occupied} tone="occupied" />
            <MiniKpi icon={CalendarClock} label="On notice" value={notice} tone="notice" />
            <MiniKpi icon={DoorOpen} label="Vacant" value={vacant} tone="maint" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byPod} barSize={30} margin={{ left: -24, top: 6 }}>
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fill: c.axis, fontSize: 10 }} />
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
            <AttentionRow icon={AlertTriangle} tone="maint" label="Defective assets to review" value={defective.length} onClick={() => nav('/assets')} />
            <AttentionRow icon={Inbox} tone="brand" label="Pending seat requests" value={pendingReq} onClick={() => nav('/requests')} />
            <AttentionRow icon={DoorOpen} tone="notice" label="Vacant seats" value={vacant} onClick={() => nav('/seating-analytics')} />
            <AttentionRow icon={CalendarClock} tone="notice" label="Seats freeing up (notice)" value={notice} onClick={() => nav('/seating-analytics')} />
          </div>
        </ChartCard>
      </div>

      {/* second row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* assets by category */}
        <ChartCard title="Assets by category" subtitle={`${assets.length} items`} action={<Link to="/assets" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">Register <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          <div className="relative">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                  {byCategory.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold text-content">{assets.length}</span>
              <span className="text-2xs text-muted">assets</span>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-1 gap-x-3 gap-y-1">
            {byCategory.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-2xs">
                <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
                <span className="text-muted">{d.name}</span><span className="ml-auto font-semibold text-content">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* assets needing action */}
        <ChartCard title="Assets needing action" subtitle="Defective — awaiting Admin decision" action={<Link to="/assets" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">Register <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          {defective.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">No defective assets. 🎉</p>
          ) : (
            <div className="space-y-2">
              {defective.slice(0, 4).map((a) => (
                <button key={a.id} onClick={() => nav(`/assets/${a.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-surface-2">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-maint-soft text-maint"><CategoryIcon subcategory={a.subcategory} category={a.category} className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-content">{a.name}</p>
                    <p className="truncate text-2xs text-muted">{a.assetId} · {a.remarks ?? 'Defective'}</p>
                  </div>
                  <AssetStatusBadge status={a.status} />
                </button>
              ))}
            </div>
          )}
        </ChartCard>

        {/* on notice */}
        <ChartCard title="On notice" subtitle="Seats freeing up soon" action={<Link to="/seating-analytics" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">All <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
          {noticeRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">No one on notice.</p>
          ) : (
            <div className="space-y-2">
              {noticeRows.slice(0, 4).map(({ person, desk }) => (
                <button key={person.id} onClick={() => desk && nav(`/neighborhood?desk=${desk.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-surface-2">
                  <Avatar name={person.name} hue={person.hue} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-content">{person.name}</p>
                    <p className="truncate text-2xs text-muted">{desk?.label ?? '—'} · {desk?.pod}</p>
                  </div>
                  <span className="text-xs font-semibold text-notice">Notice</span>
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
                {a.kind === 'seat' ? <LayoutGrid className="h-4 w-4" /> : <Boxes className="h-4 w-4" />}
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
