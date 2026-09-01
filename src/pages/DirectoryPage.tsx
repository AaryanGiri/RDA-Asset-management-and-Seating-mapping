import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Users, ArrowUpDown, MapPin, UserX } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, Avatar, SeatBadge, Segmented, EmptyState } from '@/components/ui'
import { useSimulatedLoad } from '@/hooks'
import { cn, downloadCSV } from '@/lib/utils'
import { useSeatSource, NEIGHBORHOOD } from '@/features/neighborhood/seatSource'
import { TYPE_META } from '@/features/neighborhood/meta'
import type { NType } from '@/features/neighborhood/data'

type Filter = 'all' | 'seated' | 'notice'
type SortKey = 'name' | 'type' | 'seat'

export function DirectoryPage() {
  const { rows, seated, headcount } = useSeatSource()
  const nav = useNavigate()
  const loading = useSimulatedLoad(360)

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [type, setType] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('seat')

  const list = useMemo(() => {
    const filtered = rows.filter(({ person, desk }) => {
      if (filter === 'seated' && !desk) return false
      if (filter === 'notice' && desk?.status !== 'notice') return false
      if (type !== 'all' && person.type !== type) return false
      const hay = `${person.name} ${person.code} ${person.title} ${desk?.label ?? ''} ${desk?.pod ?? ''}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
    filtered.sort((a, b) => {
      if (sort === 'name') return a.person.name.localeCompare(b.person.name)
      if (sort === 'type') return a.person.type.localeCompare(b.person.type)
      return (a.desk?.label ?? 'zzz').localeCompare(b.desk?.label ?? 'zzz', undefined, { numeric: true })
    })
    return filtered
  }, [rows, q, filter, type, sort])

  const exportCSV = () => downloadCSV('rodic-assetspace-employee-directory.csv', list.map(({ person, desk }) => ({
    Name: person.name, Code: person.code, Type: TYPE_META[person.type].label,
    Neighbourhood: NEIGHBORHOOD.name, Seat: desk?.label ?? '—', Area: desk?.pod ?? '—',
    Status: desk?.status === 'notice' ? 'On Notice' : desk ? 'Seated' : 'Unseated',
  })))

  return (
    <Page>
      <PageHeader
        title="Employee Locator"
        subtitle={`${headcount} people · ${seated} seated · ${NEIGHBORHOOD.name}`}
        icon={<Users className="h-5 w-5" />}
        actions={<button className="btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</button>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'seated', label: 'Seated' },
              { value: 'notice', label: 'On notice' },
            ]}
          />
          <select value={type} onChange={(e) => setType(e.target.value)} className="input h-9 w-auto py-1.5">
            <option value="all">All types</option>
            {(['employee', 'intern', 'partner'] as NType[]).map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
          </select>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, seat, area…" className="input pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[2.2fr_1.2fr_1.2fr_0.9fr] gap-4 border-b border-border bg-surface-2/50 px-5 py-3 text-2xs font-semibold uppercase tracking-wide text-subtle md:grid">
          <button onClick={() => setSort('name')} className="flex items-center gap-1 text-left hover:text-content">Employee <ArrowUpDown className="h-3 w-3" /></button>
          <button onClick={() => setSort('type')} className="flex items-center gap-1 text-left hover:text-content">Type <ArrowUpDown className="h-3 w-3" /></button>
          <button onClick={() => setSort('seat')} className="flex items-center gap-1 text-left hover:text-content">Seat <ArrowUpDown className="h-3 w-3" /></button>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="skeleton h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-40" /><div className="skeleton h-2.5 w-24" /></div>
                <div className="skeleton h-3 w-20" /><div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="p-6"><EmptyState icon={<UserX className="h-5 w-5" />} title="No people match" body="Try clearing filters or searching a different term." /></div>
        ) : (
          <div className="divide-y divide-border">
            {list.map(({ person, desk }) => (
              <button
                key={person.id}
                onClick={() => desk && nav(`/neighborhood?desk=${desk.id}`)}
                className="grid w-full grid-cols-1 items-center gap-2 px-5 py-3 text-left transition-colors hover:bg-surface-2 md:grid-cols-[2.2fr_1.2fr_1.2fr_0.9fr] md:gap-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={person.name} hue={person.hue} size={38} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-content">{person.name}</p>
                    <p className="truncate text-2xs text-muted">{person.title} · {person.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_META[person.type].fill }} />
                  <span className="truncate text-sm text-muted">{TYPE_META[person.type].label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-content">
                  {desk ? (
                    <><MapPin className="h-3.5 w-3.5 text-subtle" /><span className="font-medium">{desk.label}</span><span className="text-2xs text-subtle">{desk.pod}</span></>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </div>
                <div>
                  {desk?.status === 'notice' ? <SeatBadge status="notice" /> : desk ? <SeatBadge status="occupied" /> : <span className="chip bg-surface-2 text-muted">Unseated</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {!loading && <p className="mt-3 text-xs text-subtle">Showing {list.length} of {headcount} people · click a person to locate them on the Seat Map.</p>}
    </Page>
  )
}
