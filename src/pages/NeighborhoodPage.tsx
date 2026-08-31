import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGrid, Search, X, CircleDot, Palette, Building2, Users2, DoorOpen, CalendarClock, RotateCcw, UserCog, User } from 'lucide-react'
import { Segmented, Avatar } from '@/components/ui'
import { useData } from '@/lib/store'
import { useUI } from '@/lib/uiStore'
import { cn } from '@/lib/utils'
import { NeighborhoodMap } from '@/features/neighborhood/NeighborhoodMap'
import { NeighborhoodLegend, SummaryCard, RequestsInbox } from '@/features/neighborhood/panels'
import { DeskDetail } from '@/features/neighborhood/DeskDetail'
import { useNeighborhood } from '@/features/neighborhood/store'
import { PEOPLE, NEIGHBORHOOD, type NPerson } from '@/features/neighborhood/data'
import { SEAT_STATUS, type ColorMode } from '@/features/neighborhood/meta'

const peopleMap = new Map<string, NPerson>(PEOPLE.map((p) => [p.id, p]))

export function NeighborhoodPage() {
  const role = useData((s) => s.role)
  const setRole = useData((s) => s.setRole)
  const toast = useUI((s) => s.toast)

  const desks = useNeighborhood((s) => s.desks)
  const requests = useNeighborhood((s) => s.requests)
  const personaId = useNeighborhood((s) => s.personaId)
  const setPersona = useNeighborhood((s) => s.setPersona)
  const reset = useNeighborhood((s) => s.reset)

  const [colorMode, setColorMode] = useState<ColorMode>('status')
  const [active, setActive] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>()
  const [focusId, setFocusId] = useState<string>()
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchWrap = useRef<HTMLDivElement>(null)

  const isAdmin = role === 'admin'

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (searchWrap.current && !searchWrap.current.contains(e.target as Node)) setShowResults(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const counts = useMemo(() => {
    const c = { vacant: 0, occupied: 0, notice: 0, maintenance: 0, blocked: 0 }
    desks.forEach((d) => (c[d.status] += 1))
    return c
  }, [desks])
  const occRate = desks.length ? Math.round(((counts.occupied + counts.notice) / desks.length) * 100) : 0

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: { desk: typeof desks[number]; person?: NPerson }[] = []
    for (const d of desks) {
      const p = d.personId ? peopleMap.get(d.personId) : undefined
      const hay = `${d.label} ${d.pod} ${p?.name ?? ''} ${p?.code ?? ''} ${p?.title ?? ''}`.toLowerCase()
      if (hay.includes(q)) out.push({ desk: d, person: p })
      if (out.length >= 8) break
    }
    return out
  }, [query, desks])

  const highlight = useMemo(() => {
    if (query.trim()) return new Set(searchResults.map((r) => r.desk.id))
    if (!active) return null
    if (colorMode === 'status') return new Set(desks.filter((d) => d.status === active).map((d) => d.id))
    if (colorMode === 'zone') return new Set(desks.filter((d) => d.zone === active).map((d) => d.id))
    return new Set(desks.filter((d) => d.personId && peopleMap.get(d.personId)?.type === active).map((d) => d.id))
  }, [query, searchResults, active, colorMode, desks])

  const focusDesk = (id: string) => {
    setSelectedId(id)
    setShowResults(false)
    setQuery('')
    setFocusId(undefined)
    requestAnimationFrame(() => setFocusId(id))
  }

  const personaDeskId = useMemo(() => desks.find((d) => d.personId === personaId)?.id, [desks, personaId])
  const myPending = requests.filter((r) => r.requesterId === personaId && r.status === 'pending').length

  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="flex flex-col gap-3 border-b border-border bg-surface/60 px-4 py-3 backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand"><LayoutGrid className="h-4.5 w-4.5" /></div>
            <div>
              <h1 className="text-sm font-semibold text-content">{NEIGHBORHOOD.name}</h1>
              <p className="text-2xs text-muted">{NEIGHBORHOOD.office} · {NEIGHBORHOOD.floor}</p>
            </div>
          </div>
          <Segmented
            size="sm"
            value={colorMode}
            onChange={(v) => { setColorMode(v); setActive(null) }}
            options={[
              { value: 'status', label: <span className="flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5" />Status</span> },
              { value: 'type', label: <span className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" />Type</span> },
              { value: 'zone', label: <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Space</span> },
            ]}
          />
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          {!isAdmin && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-2 py-1">
              <User className="h-3.5 w-3.5 text-brand" />
              <span className="text-2xs text-muted">You</span>
              <select value={personaId} onChange={(e) => setPersona(e.target.value)} className="max-w-[130px] truncate bg-transparent text-xs font-medium text-content focus:outline-none">
                {PEOPLE.filter((p) => desks.some((d) => d.personId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="hidden items-center gap-3 md:flex">
            <MiniStat icon={Users2} label="Occupied" value={counts.occupied + counts.notice} tone="occupied" />
            <MiniStat icon={DoorOpen} label="Vacant" value={counts.vacant} tone="vacant" />
            <MiniStat icon={CalendarClock} label="On notice" value={counts.notice} tone="notice" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold leading-none text-content">{occRate}%</span>
              <span className="text-2xs text-subtle">occupancy</span>
            </div>
          </div>
          <div ref={searchWrap} className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowResults(true) }}
              onFocus={() => setShowResults(true)}
              placeholder="Find a person or desk…"
              className="input pl-9 pr-8"
            />
            {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle hover:text-content"><X className="h-4 w-4" /></button>}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-pop">
                {searchResults.map(({ desk, person }) => (
                  <button key={desk.id} onClick={() => focusDesk(desk.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2">
                    {person ? <Avatar name={person.name} hue={person.hue} size={30} /> : <span className={cn('grid h-7 w-7 place-items-center rounded-lg text-2xs font-bold', SEAT_STATUS[desk.status].bg, SEAT_STATUS[desk.status].text)}>{desk.label}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-content">{person ? person.name : `Desk ${desk.label}`}</p>
                      <p className="truncate text-2xs text-muted">{person ? `${person.title} · #${desk.label}` : `${SEAT_STATUS[desk.status].label} · ${desk.pod}`}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Segmented
            size="sm"
            value={role}
            onChange={(v) => { setRole(v); setActive(null); toast({ tone: 'info', title: `Viewing as ${v === 'admin' ? 'Admin' : 'Employee'}` }) }}
            options={[
              { value: 'admin', label: <span className="flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" />Admin</span> },
              { value: 'employee', label: <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Employee</span> },
            ]}
          />
        </div>
      </div>

      {/* map + rails */}
      <div className="flex min-h-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
        <aside className="hidden w-60 shrink-0 flex-col gap-3 overflow-y-auto pr-1 lg:flex">
          <NeighborhoodLegend desks={desks} people={peopleMap} colorMode={colorMode} active={active} onToggle={(k) => setActive((cur) => (cur === k ? null : k))} />
          <SummaryCard desks={desks} />
          {isAdmin ? (
            <RequestsInbox people={peopleMap} onFocusDesk={focusDesk} />
          ) : (
            <div className="card flex items-start gap-2.5 p-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><User className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-content">{myPending} pending request{myPending === 1 ? '' : 's'}</p>
                <p className="mt-0.5 text-2xs text-muted">Select your desk on the map to request a change or swap.</p>
              </div>
            </div>
          )}
          {isAdmin && (
            <button
              onClick={() => { if (confirm('Reset this neighbourhood to the seeded arrangement? Requests and manual changes will be cleared.')) { reset(); setSelectedId(undefined); toast({ tone: 'info', title: 'Neighbourhood reset', body: 'Seeded seat arrangement restored.' }) } }}
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset arrangement
            </button>
          )}
        </aside>

        <div className="relative min-h-0 flex-1">
          <NeighborhoodMap
            desks={desks}
            people={peopleMap}
            selectedId={selectedId}
            personaDeskId={!isAdmin ? personaDeskId : undefined}
            colorMode={colorMode}
            highlight={highlight}
            focusId={focusId}
            onSelect={(d) => setSelectedId(d.id)}
          />
        </div>
      </div>

      <DeskDetail deskId={selectedId} people={peopleMap} role={role} onClose={() => setSelectedId(undefined)} onFocusDesk={focusDesk} />
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
