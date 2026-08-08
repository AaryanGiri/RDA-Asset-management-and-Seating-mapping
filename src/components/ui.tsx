import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, type ReactNode } from 'react'
import { cn, initials } from '@/lib/utils'
import { ASSET_STATUS_META, CONDITION_META, SEAT_STATUS } from '@/lib/status'
import type { AssetCondition, AssetStatus, SeatStatus } from '@/lib/types'

export function Avatar({ name, hue = 220, size = 36, className }: { name: string; hue?: number; size?: number; className?: string }) {
  return (
    <div
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold text-white shadow-sm ring-1 ring-black/5', className)}
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 68% 42%))`,
      }}
    >
      {initials(name).toUpperCase()}
    </div>
  )
}

export function Badge({ children, className, tone = 'neutral' }: { children: ReactNode; className?: string; tone?: 'neutral' | 'brand' }) {
  return (
    <span className={cn('chip', tone === 'brand' ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-muted', className)}>{children}</span>
  )
}

export function StatusDot({ status, pulse }: { status: SeatStatus; pulse?: boolean }) {
  const m = SEAT_STATUS[status]
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', m.dot)} />}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', m.dot)} />
    </span>
  )
}

export function SeatBadge({ status, className }: { status: SeatStatus; className?: string }) {
  const m = SEAT_STATUS[status]
  return (
    <span className={cn('chip', m.bg, m.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

export function ConditionBadge({ condition, className }: { condition: AssetCondition; className?: string }) {
  const m = CONDITION_META[condition]
  return (
    <span className={cn('chip', m.bg, m.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

export function AssetStatusBadge({ status, className }: { status: AssetStatus; className?: string }) {
  const m = ASSET_STATUS_META[status]
  return (
    <span className={cn('chip', m.bg, m.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

export function StatCard({
  label, value, sub, icon, accent = 'brand', delta,
}: {
  label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode
  accent?: 'brand' | 'vacant' | 'occupied' | 'notice' | 'maint' | 'blocked'
  delta?: { value: string; up?: boolean }
}) {
  const accentMap: Record<string, string> = {
    brand: 'text-brand bg-brand-soft', vacant: 'text-vacant bg-vacant-soft', occupied: 'text-occupied bg-occupied-soft',
    notice: 'text-notice bg-notice-soft', maint: 'text-maint bg-maint-soft', blocked: 'text-blocked bg-blocked-soft',
  }
  return (
    <div className="card card-hover group relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-subtle">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-content sm:text-[1.75rem]">{value}</p>
        </div>
        {icon && <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', accentMap[accent])}>{icon}</div>}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && (
          <span className={cn('chip px-1.5 py-0.5', delta.up ? 'bg-vacant-soft text-vacant' : 'bg-occupied-soft text-occupied')}>
            {delta.up ? '▲' : '▼'} {delta.value}
          </span>
        )}
        {sub && <span className="truncate text-muted">{sub}</span>}
      </div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: {
  options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative rounded-lg font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'text-content' : 'text-muted hover:text-content',
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join()}`} className="absolute inset-0 rounded-lg bg-surface shadow-card" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
          )}
          <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, className, tone = 'brand' }: { value: number; className?: string; tone?: string }) {
  const toneMap: Record<string, string> = { brand: 'bg-brand', vacant: 'bg-vacant', occupied: 'bg-occupied', notice: 'bg-notice', maint: 'bg-maint' }
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}>
      <motion.div className={cn('h-full rounded-full', toneMap[tone])} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface-2/40 px-6 py-14 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-3 text-muted">{icon}</div>}
      <p className="text-sm font-semibold text-content">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function IconButton({ children, onClick, label, active, className }: { children: ReactNode; onClick?: () => void; label: string; active?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick} aria-label={label} title={label}
      className={cn('grid h-9 w-9 place-items-center rounded-xl border border-transparent text-muted transition-colors hover:bg-surface-2 hover:text-content', active && 'border-border bg-surface-2 text-content', className)}
    >
      {children}
    </button>
  )
}

export function PageHeader({ title, subtitle, actions, icon }: { title: string; subtitle?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand">{icon}</div>}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// Right-hand sliding sheet
export function Sheet({ open, onClose, children, width = 440, title }: { open: boolean; onClose: () => void; children: ReactNode; width?: number; title?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="absolute right-0 top-0 flex h-full max-w-[92vw] flex-col border-l border-border bg-surface shadow-pop"
            style={{ width }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                {title}
                <button onClick={onClose} className="btn-ghost -mr-2 h-8 w-8 rounded-lg p-0"><X className="h-4 w-4" /></button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Modal({ open, onClose, children, width = 480 }: { open: boolean; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-pop"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-2xs text-subtle">{hint}</p>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
