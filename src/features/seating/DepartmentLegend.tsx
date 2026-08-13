import type { Department } from '@/lib/types'
import { cn } from '@/lib/utils'

export function DepartmentLegend({ departments, counts, active, onToggle }: {
  departments: Department[]
  counts: Record<string, number>
  active: string | null
  onToggle: (id: string) => void
}) {
  const shown = departments.filter((d) => (counts[d.id] ?? 0) > 0)
  return (
    <div className="rounded-xl border border-border bg-surface/95 p-2.5 shadow-card backdrop-blur">
      <p className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-wider text-subtle">Departments</p>
      <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto">
        {shown.map((d) => {
          const on = active === null || active === d.id
          return (
            <button
              key={d.id}
              onClick={() => onToggle(d.id)}
              className={cn('flex items-center gap-2 rounded-lg px-2 py-1 transition-colors', on ? 'hover:bg-surface-2' : 'opacity-40 hover:opacity-70', active === d.id && 'bg-surface-2')}
            >
              <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: d.color }} />
              <span className="flex-1 truncate text-left text-xs font-medium text-content">{d.name}</span>
              <span className="text-2xs font-semibold text-muted">{counts[d.id] ?? 0}</span>
            </button>
          )
        })}
      </div>
      {active && <p className="mt-1.5 px-1 text-2xs text-subtle">Showing one department · click again to clear.</p>}
    </div>
  )
}
