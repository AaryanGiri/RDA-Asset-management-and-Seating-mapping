import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Download, Users, ArrowUpDown, MapPin, UserX } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, Avatar, SeatBadge, Segmented, EmptyState } from '@/components/ui'
import { useData, deptName } from '@/lib/store'
import { useSimulatedLoad } from '@/hooks'
import { cn, downloadCSV, formatDate } from '@/lib/utils'
import type { SeatStatus } from '@/lib/types'

type Filter = 'all' | 'seated' | 'unseated' | 'notice'
type SortKey = 'name' | 'dept' | 'seat'

export function DirectoryPage() {
  const employees = useData((s) => s.employees)
  const seats = useData((s) => s.seats)
  const departments = useData((s) => s.departments)
  const floors = useData((s) => s.floors)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const loading = useSimulatedLoad(420)

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [dept, setDept] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('name')

  const rows = useMemo(() => {
    const list = employees.map((e) => {
      const seat = seats.find((s) => s.id === e.currentSeatId)
      const floor = floors.find((f) => f.id === seat?.floorId)
      return { e, seat, floor }
    })
    let filtered = list.filter(({ e, seat }) => {
      if (filter === 'seated' && !seat) return false
      if (filter === 'unseated' && seat) return false
      if (filter === 'notice' && e.employmentStatus !== 'notice') return false
      if (dept !== 'all' && e.departmentId !== dept) return false
      const hay = `${e.fullName} ${e.code} ${deptName(e.departmentId)} ${e.project} ${e.designation} ${seat?.seatNumber ?? ''}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
    filtered.sort((a, b) => {
      if (sort === 'name') return a.e.fullName.localeCompare(b.e.fullName)
      if (sort === 'dept') return deptName(a.e.departmentId).localeCompare(deptName(b.e.departmentId))
      return (a.seat?.seatNumber ?? 'zzz').localeCompare(b.seat?.seatNumber ?? 'zzz')
    })
    return filtered
  }, [employees, seats, floors, q, filter, dept, sort])

  const exportCSV = () => {
    downloadCSV('locus-employee-directory.csv', rows.map(({ e, seat, floor }) => ({
      Name: e.fullName, Code: e.code, Designation: e.designation, Department: deptName(e.departmentId),
      Project: e.project, Manager: e.reportingManager, Seat: seat?.seatNumber ?? '—', Floor: floor?.name ?? '—',
      Status: e.employmentStatus === 'notice' ? 'On Notice' : seat ? 'Seated' : 'Unseated', Email: e.email,
    })))
  }

  const seatedCount = employees.filter((e) => e.currentSeatId).length
  const unseated = employees.length - seatedCount

  return (
    <Page>
      <PageHeader
        title="Employee Locator"
        subtitle={`${employees.length} people · ${seatedCount} seated · ${unseated} awaiting allocation`}
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
              { value: 'unseated', label: 'Unseated' },
              { value: 'notice', label: 'On notice' },
            ]}
          />
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="input h-9 w-auto py-1.5">
            <option value="all">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, project, seat…" className="input pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[2.2fr_1.2fr_1fr_1fr_0.9fr] gap-4 border-b border-border bg-surface-2/50 px-5 py-3 text-2xs font-semibold uppercase tracking-wide text-subtle md:grid">
          <button onClick={() => setSort('name')} className="flex items-center gap-1 text-left hover:text-content">Employee <ArrowUpDown className="h-3 w-3" /></button>
          <button onClick={() => setSort('dept')} className="flex items-center gap-1 text-left hover:text-content">Department <ArrowUpDown className="h-3 w-3" /></button>
          <span>Project</span>
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
        ) : rows.length === 0 ? (
          <div className="p-6"><EmptyState icon={<UserX className="h-5 w-5" />} title="No people match" body="Try clearing filters or searching a different term." /></div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map(({ e, seat, floor }) => (
              <button
                key={e.id}
                onClick={() => seat && nav(`/seating?seat=${seat.id}`)}
                className={cn('grid w-full grid-cols-1 items-center gap-2 px-5 py-3 text-left transition-colors hover:bg-surface-2 md:grid-cols-[2.2fr_1.2fr_1fr_1fr_0.9fr] md:gap-4',
                  params.get('emp') === e.id && 'bg-brand-soft')}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={e.fullName} hue={e.avatarHue} size={38} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-content">{e.fullName}</p>
                    <p className="truncate text-2xs text-muted">{e.designation} · {e.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: departments.find((d) => d.id === e.departmentId)?.color }} />
                  <span className="truncate text-sm text-muted">{deptName(e.departmentId)}</span>
                </div>
                <span className="truncate text-sm text-muted">{e.project}</span>
                <div className="flex items-center gap-1.5 text-sm text-content">
                  {seat ? (
                    <><MapPin className="h-3.5 w-3.5 text-subtle" /><span className="font-medium">{seat.seatNumber}</span><span className="text-2xs text-subtle">{floor?.name.split('·')[0]}</span></>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </div>
                <div>
                  {e.employmentStatus === 'notice' ? <SeatBadge status="notice" /> : seat ? <SeatBadge status="occupied" /> : <span className="chip bg-surface-2 text-muted">Unseated</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {!loading && <p className="mt-3 text-xs text-subtle">Showing {rows.length} of {employees.length} people · click a seated person to locate them on the map.</p>}
    </Page>
  )
}
