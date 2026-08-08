import { SEAT_ORDER, SEAT_STATUS } from '@/lib/status'
import type { SeatStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function Legend({ counts, active, onToggle }: {
  counts: Record<SeatStatus, number>
  active: Set<SeatStatus>
  onToggle: (s: SeatStatus) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/95 p-2.5 shadow-card backdrop-blur">
      <p className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-wider text-subtle">Seat status</p>
      <div className="flex flex-col gap-0.5">
        {SEAT_ORDER.map((s) => {
          const m = SEAT_STATUS[s]
          const on = active.has(s)
          return (
            <button
              key={s}
              onClick={() => onToggle(s)}
              className={cn('flex items-center gap-2 rounded-lg px-2 py-1 transition-colors', on ? 'hover:bg-surface-2' : 'opacity-40 hover:opacity-70')}
            >
              <LegendGlyph status={s} />
              <span className="flex-1 text-left text-xs font-medium text-content">{m.label}</span>
              <span className="text-2xs font-semibold text-muted">{counts[s] ?? 0}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LegendGlyph({ status }: { status: SeatStatus }) {
  const m = SEAT_STATUS[status]
  return (
    <svg width={18} height={18} viewBox="-11 -11 22 22" className="shrink-0">
      {status === 'vacant' ? (
        <circle r={8} style={{ fill: 'rgb(var(--c-surface))', stroke: m.fill }} strokeWidth={2.5} />
      ) : (
        <circle r={9} style={{ fill: m.fill, stroke: 'rgb(var(--c-surface))' }} strokeWidth={1.5} />
      )}
      {status === 'notice' && <circle r={4} style={{ fill: 'none', stroke: '#fff' }} strokeWidth={1.6} />}
      {status === 'maintenance' && <line x1={-4} y1={4} x2={4} y2={-4} style={{ stroke: '#fff' }} strokeWidth={1.8} strokeLinecap="round" />}
      {status === 'blocked' && (
        <g style={{ stroke: '#fff' }} strokeWidth={1.8} strokeLinecap="round">
          <line x1={-3.5} y1={-3.5} x2={3.5} y2={3.5} />
          <line x1={-3.5} y1={3.5} x2={3.5} y2={-3.5} />
        </g>
      )}
    </svg>
  )
}
