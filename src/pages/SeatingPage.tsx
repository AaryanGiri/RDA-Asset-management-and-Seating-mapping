import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, Layers, Users2, DoorOpen, CalendarClock, Pencil, Check, RotateCcw, Ruler, Building2, Plus } from 'lucide-react'
import { FloorCanvas } from '@/features/seating/FloorCanvas'
import { Legend } from '@/features/seating/Legend'
import { SeatDetail } from '@/features/seating/SeatDetail'
import { ToolPalette, PropertiesPanel, AreaSchedule, PlanLegend } from '@/features/seating/LayoutEditor'
import { FloorBuilder } from '@/features/seating/FloorBuilder'
import { geometryToPlan, type EditorTool, type Selection, type WallType, type DoorType, type FurnitureKind } from '@/features/seating/layout'
import { FLOOR_GEOMETRY, type RoomKind } from '@/features/seating/floorplans'
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
  const floorPlans = useData((s) => s.floorPlans)
  const resetFloorPlan = useData((s) => s.resetFloorPlan)
  const setFloorScale = useData((s) => s.setFloorScale)
  const removeFloor = useData((s) => s.removeFloor)
  const [params, setParams] = useSearchParams()

  const [floorId, setFloorId] = useState(floors[0].id)
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [focusId, setFocusId] = useState<string | undefined>()
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [active, setActive] = useState<Set<SeatStatus>>(new Set(ALL))
  const [editing, setEditing] = useState(false)
  const [tool, setTool] = useState<EditorTool>('select')
  const [gridSnap, setGridSnap] = useState(true)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [roomKind, setRoomKind] = useState<RoomKind>('office')
  const [wallType, setWallType] = useState<WallType>('gypsum')
  const [doorType, setDoorType] = useState<DoorType>('glass')
  const [furnitureKind, setFurnitureKind] = useState<FurnitureKind>('desk')
  const [builderOpen, setBuilderOpen] = useState(false)
  const searchWrap = useRef<HTMLDivElement>(null)

  const plan = floorPlans[floorId] ?? geometryToPlan(FLOOR_GEOMETRY[floorId])
  const exitEditing = () => { setEditing(false); setTool('select'); setSelection(null) }

  // if the current floor is removed, fall back to the first available
  useEffect(() => {
    if (!floors.find((f) => f.id === floorId) && floors[0]) setFloorId(floors[0].id)
  }, [floors, floorId])

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
            onChange={(v) => { setFloorId(v); setSelectedId(undefined); setSelection(null) }}
            options={floors.map((f) => ({ value: f.id, label: <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{f.name.split('·')[0].trim()}</span> }))}
          />
          <button
            onClick={() => (editing ? exitEditing() : setEditing(true))}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
              editing ? 'border-brand bg-brand text-white shadow-sm' : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-content',
            )}
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editing ? 'Done editing' : 'Edit layout'}
          </button>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          {!editing && (
            <div className="hidden items-center gap-3 md:flex">
              <MiniStat icon={Users2} label="Occupied" value={occupancy} tone="occupied" />
              <MiniStat icon={DoorOpen} label="Vacant" value={counts.vacant} tone="vacant" />
              <MiniStat icon={CalendarClock} label="On notice" value={counts.notice} tone="notice" />
              <div className="flex flex-col">
                <span className="text-lg font-semibold leading-none text-content">{occRate}%</span>
                <span className="text-2xs text-subtle">occupancy</span>
              </div>
            </div>
          )}
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

      {/* editor sub-bar */}
      {editing && (
        <div className="flex flex-wrap items-center gap-3 border-b border-brand/30 bg-brand-soft/40 px-4 py-2 sm:px-6">
          <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-brand">
            <Ruler className="h-3.5 w-3.5" /> Layout editor
          </span>
          <label className="flex items-center gap-1.5 text-2xs text-muted">
            Scale
            <input
              type="number" min={2} max={40} step={0.5}
              defaultValue={plan.pxPerFoot.toFixed(1)} key={floorId + plan.pxPerFoot}
              onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFloorScale(floorId, v) }}
              className="input h-7 w-16 text-xs"
            />
            px/ft
          </label>
          <span className="text-2xs text-subtle">{Math.round(plan.vbw / plan.pxPerFoot)}′ × {Math.round(plan.vbh / plan.pxPerFoot)}′</span>
          <button onClick={() => setBuilderOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content">
            <Plus className="h-3.5 w-3.5" /> New floor
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { if (confirm('Reset this floor plan to the original design? Your room / wall / furniture edits will be discarded.')) { resetFloorPlan(floorId); setSelection(null) } }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset plan
            </button>
          </div>
        </div>
      )}

      {/* map + rails */}
      <div className="flex min-h-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
        <aside className={cn('hidden shrink-0 flex-col gap-3 lg:flex', editing ? 'w-64 overflow-y-auto pr-1' : 'w-56')}>
          {editing ? (
            <>
              <ToolPalette
                tool={tool} setTool={(t) => { setTool(t); if (t !== 'select') setSelection(null) }}
                gridSnap={gridSnap} setGridSnap={setGridSnap}
                opts={{ roomKind, setRoomKind, wallType, setWallType, doorType, setDoorType, furnitureKind, setFurnitureKind }}
              />
              <PropertiesPanel floorId={floorId} plan={plan} selection={selection} seats={floorSeats} onClear={() => setSelection(null)} />
              <AreaSchedule plan={plan} seats={floorSeats} />
              <PlanLegend />
            </>
          ) : (
            <>
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
            </>
          )}
        </aside>
        <div className="relative min-h-0 flex-1">
          <FloorCanvas
            floorId={floorId}
            seats={floorSeats}
            employees={employees}
            selectedId={selectedId}
            focusId={focusId}
            dimUnmatched={editing ? null : highlightSet}
            onSelect={(s) => setSelectedId(s.id)}
            editing={editing}
            tool={tool}
            wallType={wallType}
            doorType={doorType}
            furnitureKind={furnitureKind}
            roomKind={roomKind}
            gridSnap={gridSnap}
            selection={selection}
            onSelectElement={setSelection}
          />
        </div>
      </div>

      {!editing && <SeatDetail seatId={selectedId} onClose={() => setSelectedId(undefined)} onNavigateSeat={focusSeat} />}
      {builderOpen && (
        <FloorBuilder
          onClose={() => setBuilderOpen(false)}
          onCreated={(id) => { setBuilderOpen(false); setFloorId(id); setSelection(null) }}
        />
      )}
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
