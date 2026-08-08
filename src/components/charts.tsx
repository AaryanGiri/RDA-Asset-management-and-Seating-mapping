import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ChartCard({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-content">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function ChartTooltip({ active, payload, label, tooltipBg, border, valueSuffix }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-3 py-2 shadow-pop" style={{ background: tooltipBg, borderColor: border }}>
      {label != null && <p className="mb-1 text-2xs font-medium text-subtle">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto font-semibold text-content">{p.value}{valueSuffix ?? ''}</span>
        </div>
      ))}
    </div>
  )
}
