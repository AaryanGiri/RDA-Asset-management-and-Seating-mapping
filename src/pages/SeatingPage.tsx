import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, Layers, Users2, DoorOpen, CalendarClock } from 'lucide-react'
import { FloorCanvas } from '@/features/seating/FloorCanvas'
import { Legend } from '@/features/seating/Legend'
import { SeatDetail } from '@/features/seating/SeatDetail'
import { Segmented, Avatar } from '@/components/ui'
import { useData, deptName } from '@/lib/store'
import { SEAT_STATUS } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { SeatStatus } from '@/lib/types'

const ALL: SeatStatus[] = ['vacant', 'occupied', 'notice', 'maintenance', 'blocked']

export function SeatingPage() {
  const seats = useData((s) => s.seats)
  const employees = useData((s) => s.employees)
  const floors = useData((s) => s.floors)
  const [params, setParams] = useSearchParams()

  const [floorId, setFloorId] = useState(floors[0].id)
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [focusId, setFocusId] = useState<string | undefined>()
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [active, setActive] = useState<Set<SeatStatus>>(new Set(ALL))
  const searchWrap = useRef<HTMLDivElement>(null)

  // handle ?seat= deep link (from command palette / directory)
  useEffect(() => {
    const sid = params.get('seat')
    if (sid) {
      const seat = seats.find((s) => s.id === sid)
      if (seat) {
        setFloorId(seat.floorId)
        setSelectedId(sid)
        setTimeout(() => setFocusId(sid), 60)
      }
      params.delete('seat')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchWrap.current && !searchWrap.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const floorSeats = seats.filter((s) => s.floorId === floorId)
  const counts = useMemo(() => {
    const c = { vacant: 0, occupied: 0, notice: 0, maintenance: 0, blocked: 0 } as Record<SeatStatus, number>
    floorSeats.forEach((s) => (c[s.status] += 1))
    return c
  }, [floorSeats])

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: { seat: (typeof seats)[number]; emp?: (typeof employees)[number] }[] = []
    for (const s of seats) {
      const emp = employees.find((e) => e.id === s.employeeId)
      const hay = `${s.seatNumber} ${s.zone} ${emp?.fullName ?? ''} ${emp?.code ?? ''} ${emp ? deptName(emp.departmentId) : ''} ${emp?.project ?? ''}`.toLowerCase()
      if (hay.includes(q)) out.push({ seat: s, emp })
      if (out.length >= 8) break
    }
    return out
  }, [query, seats, employees])

  const highlightSet = useMemo(() => {
    if (query.trim()) return new Set(searchResults.map((r) => r.seat.id))
    if (active.size < ALL.length) return new Set(floorSeats.filter((s) => active.has(s.status)).map((s) => s.id))
    return null
  }, [query, searchResults, active, floorSeats])

  const focusSeat = (seatId: string) => {
    const seat = seats.find((s) => s.id === seatId)
    if (!seat) return
    if (seat.floorId !== floorId) setFloorId(seat.floorId)
    setSelectedId(seatId)
    setShowResults(false)
    setQuery('')
    setTimeout(() => setFocusId(seatId), 80)
  }

  const toggle = (s: SeatStatus) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      if (next.size === 0) return new Set(ALL)
      return next
    })
  }

  const occupancy = counts.occupied + counts.notice
  const occRate = floorSeats.length ? Math.round((occupancy / floorSeats.length) * 100) : 0

  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="flex flex-col gap-3 border-b border-border bg-surface/60 px-4 py-3 backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand"><Layers className="h-4.5 w-4.5" /></div>
            <div>
              <h1 className="text-sm font-semibold text-content">Floor Map</h1>
              <p className="text-2xs text-muted">Aster HQ · interactive seating</p>
            </div>
          </div>
          <Segmented
            value={floorId}
            onChange={(v) => { setFloorId(v); setSelectedId(undefined) }}
            options={floors.map((f) => ({ value: f.id, label: <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{f.name.split('·')[0].trim()}</span> }))}
          />
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <div className="hidden items-center gap-3 md:flex">
            <MiniStat icon={Users2} label="Occupied" value={occupancy} tone="occupied" />
            <MiniStat icon={DoorOpen} label="Vacant" value={counts.vacant} tone="vacant" />
            <MiniStat icon={CalendarClock} label="On notice" value={counts.notice} tone="notice" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold leading-none text-content">{occRate}%</span>
              <span className="text-2xs text-subtle">occupancy</span>
            </div>
          </div>
          <div ref={searchWrap} className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowResults(true) }}
              onFocus={() => setShowResults(true)}
              placeholder="Find a person or seat…"
              className="input pl-9 pr-8"
            />
            {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle hover:text-content"><X className="h-4 w-4" /></button>}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-pop">
                {searchResults.map(({ seat, emp }) => (
                  <button key={seat.id} onClick={() => focusSeat(seat.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2">
                    {emp ? <Avatar name={emp.fullName} hue={emp.avatarHue} size={30} /> : <span className={cn('grid h-7 w-7 place-items-center rounded-lg text-2xs font-bold', SEAT_STATUS[seat.status].bg, SEAT_STATUS[seat.status].text)}>{seat.seatNumber}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-content">{emp ? emp.fullName : `Seat ${seat.seatNumber}`}</p>
                      <p className="truncate text-2xs text-muted">{emp ? `${emp.designation} · ${seat.seatNumber}` : `${SEAT_STATUS[seat.status].label} · ${seat.zone}`}</p>
                    </div>
                    <span className="text-2xs text-subtle">{floors.find((f) => f.id === seat.floorId)?.name.split('·')[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* map + left rail */}
      <div className="flex min-h-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
        <aside className="hidden w-56 shrink-0 flex-col gap-3 lg:flex">
          <Legend counts={counts} active={active} onToggle={toggle} />
          <div className="card p-3.5">
            <p className="section-title mb-2">Floor summary</p>
            <div className="mb-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-content">{occRate}%</span>
              <span className="text-xs text-muted">occupied</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-brand" style={{ width: `${occRate}%` }} />
            </div>
            <dl className="mt-3 space-y-1.5 text-xs">
              <Row label="Total seats" value={floorSeats.length} />
              <Row label="Occupied" value={counts.occupied} tone="text-occupied" />
              <Row label="On notice" value={counts.notice} tone="text-notice" />
              <Row label="Vacant" value={counts.vacant} tone="text-vacant" />
              <Row label="Unavailable" value={counts.maintenance + counts.blocked} tone="text-muted" />
            </dl>
          </div>
          <div className="card flex items-start gap-2.5 p-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-notice-soft text-notice"><CalendarClock className="h-4 w-4" /></div>
            <div>
              <p className="text-xs font-semibold text-content">{counts.notice} freeing up soon</p>
              <p className="mt-0.5 text-2xs text-muted">Seats on notice period this floor.</p>
            </div>
          </div>
        </aside>
        <div className="relative min-h-0 flex-1">
          <FloorCanvas
            floorId={floorId}
            seats={floorSeats}
            employees={employees}
            selectedId={selectedId}
            focusId={focusId}
            dimUnmatched={highlightSet}
            onSelect={(s) => setSelectedId(s.id)}
          />
        </div>
      </div>

      <SeatDetail seatId={selectedId} onClose={() => setSelectedId(undefined)} onNavigateSeat={focusSeat} />
    </div>
  )
}

function Row({ label, value, tone = 'text-content' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('font-semibold', tone)}>{value}</dd>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: typeof Users2; label: string; value: number; tone: string }) {
  const toneMap: Record<string, string> = { occupied: 'text-occupied bg-occupied-soft', vacant: 'text-vacant bg-vacant-soft', notice: 'text-notice bg-notice-soft' }
  return (
    <div className="flex items-center gap-2">
      <div className={cn('grid h-8 w-8 place-items-center rounded-lg', toneMap[tone])}><Icon className="h-4 w-4" /></div>
      <div className="leading-none">
        <div className="text-sm font-semibold text-content">{value}</div>
        <div className="mt-0.5 text-2xs text-subtle">{label}</div>
      </div>
    </div>
  )
}
