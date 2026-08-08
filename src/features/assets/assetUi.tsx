import { QRCodeSVG } from 'qrcode.react'
import {
  Monitor, Laptop, Armchair, Table2, Wind, Printer, Projector, Network, Package,
  Camera, Check, ImageIcon,
} from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import { cn } from '@/lib/utils'
import type { AssetCategory, AssetPhoto } from '@/lib/types'

const ICONS: Record<string, typeof Monitor> = {
  monitor: Monitor, laptop: Laptop, chair: Armchair, desk: Table2, ac: Wind,
  printer: Printer, projector: Projector, switch: Network,
}
export function categoryIcon(catId: string) {
  return ICONS[catId] ?? Package
}

export function CategoryIcon({ catId, className }: { catId: string; className?: string }) {
  const Icon = categoryIcon(catId)
  return <Icon className={className} />
}

/** A believable placeholder "photo" tile — gradient + category watermark + view label. */
export function PhotoTile({
  hue, view, catId, empty, highlight, className, onCapture,
}: {
  hue?: number; view: string; catId?: string; empty?: boolean; highlight?: { x: number; y: number; r: number } | null
  className?: string; onCapture?: () => void
}) {
  const Icon = catId ? categoryIcon(catId) : ImageIcon
  if (empty) {
    return (
      <button
        onClick={onCapture}
        className={cn('group relative flex aspect-[4/3] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-border-strong bg-surface-2/50 transition-colors hover:border-brand hover:bg-brand-soft', className)}
      >
        <Camera className="h-5 w-5 text-subtle transition-colors group-hover:text-brand" />
        <span className="text-2xs font-medium text-subtle group-hover:text-brand">{view}</span>
      </button>
    )
  }
  return (
    <div className={cn('relative aspect-[4/3] overflow-hidden rounded-xl border border-border', className)}>
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(${hue ?? 210} 42% 62%), hsl(${((hue ?? 210) + 45) % 360} 38% 34%))` }} />
      <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, white, transparent 45%)' }} />
      <Icon className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/40" strokeWidth={1.4} />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/55 to-transparent px-2 py-1.5">
        <span className="text-2xs font-medium text-white/90">{view}</span>
        <Check className="h-3 w-3 text-white/80" />
      </div>
      {highlight && (
        <span
          className="absolute rounded-full border-2 border-maint"
          style={{
            left: `${highlight.x * 100}%`, top: `${highlight.y * 100}%`,
            width: `${highlight.r * 160}%`, height: `${highlight.r * 160}%`,
            transform: 'translate(-50%,-50%)', boxShadow: '0 0 0 3px rgba(217,119,6,0.25)',
          }}
        >
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-maint opacity-60" />
        </span>
      )}
    </div>
  )
}

export function QrThumb({ value, size = 44 }: { value: string; size?: number }) {
  return (
    <div className="rounded-lg border border-border bg-white p-1">
      <QRCodeSVG value={value} size={size} bgColor="#ffffff" fgColor="#0b1020" level="M" />
    </div>
  )
}

/** Printable asset label: QR + identity, styled like a real tamper-evident tag. */
export function QrLabel({ tag, name, category, serial }: { tag: string; name: string; category: AssetCategory; serial: string }) {
  return (
    <div className="w-[300px] overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
      <div className="flex items-center justify-between bg-slate-900 px-3 py-2 text-white">
        <div className="flex items-center gap-1.5">
          <LogoMark size={18} />
          <span className="text-xs font-semibold tracking-wide">LOCUS ASSET</span>
        </div>
        <span className="text-2xs opacity-70">Property of Aster</span>
      </div>
      <div className="flex gap-3 p-3">
        <div className="rounded-lg border border-slate-200 bg-white p-1.5">
          <QRCodeSVG value={tag} size={92} bgColor="#ffffff" fgColor="#0b1020" level="M" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold tracking-tight text-slate-900">{tag}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-700">{name}</p>
          <p className="mt-1 text-2xs text-slate-500">{category.name}</p>
          <p className="text-2xs text-slate-500">S/N · {serial}</p>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className="h-4 w-[2px] bg-slate-900" style={{ opacity: (i * 7) % 3 === 0 ? 1 : 0.4, width: (i % 4 === 0 ? 3 : 2) }} />
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-dashed border-slate-300 px-3 py-1.5 text-center text-2xs text-slate-400">
        Scan with the Locus app · do not remove
      </div>
    </div>
  )
}
