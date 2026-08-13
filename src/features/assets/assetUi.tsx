import {
  Monitor, Laptop, Armchair, Wind, Printer, Projector, Network, Package,
  Camera, Smartphone, Code2, KeyRound, Repeat, Globe, Cloud, Building2, Map, Car, Upload, ImageIcon,
} from 'lucide-react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import type { AssetImage, AssetImageKind, AssetPrimaryCategory } from '@/lib/types'

// Icon chosen from the subcategory (falls back to the primary category, then a box).
const SUBCAT_ICONS: Record<string, typeof Monitor> = {
  Laptop, Desktop: Monitor, Monitor, Printer, Furniture: Armchair, Networking: Network,
  Projector, 'Mobile Phone': Smartphone, Software: Code2, License: KeyRound, Subscription: Repeat,
  Domain: Globe, 'Cloud Service': Cloud, 'Office Space': Building2, Building: Building2, Land: Map, Parking: Car,
  'AC Unit': Wind,
}
const CAT_ICONS: Record<AssetPrimaryCategory, typeof Monitor> = {
  tangible: Package, intangible: Code2, 'land-building': Building2,
}
export function assetIcon(subcategory?: string, category?: AssetPrimaryCategory) {
  return (subcategory && SUBCAT_ICONS[subcategory]) || (category && CAT_ICONS[category]) || Package
}
export function CategoryIcon({ subcategory, category, className }: { subcategory?: string; category?: AssetPrimaryCategory; className?: string }) {
  const Icon = assetIcon(subcategory, category)
  return <Icon className={className} />
}

const KIND_LABEL: Record<AssetImageKind, string> = { deployment: 'Deployment', current: 'Current', defect: 'Defect' }

/** Asset image tile — shows a real uploaded image, or a labelled placeholder. */
export function AssetImageTile({ image, className }: { image: AssetImage; className?: string }) {
  const isDefect = image.kind === 'defect'
  return (
    <div className={cn('relative aspect-[4/3] overflow-hidden rounded-xl border border-border', className)}>
      {image.src ? (
        <img src={image.src} alt={image.note ?? KIND_LABEL[image.kind]} className="h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(${image.hue} ${isDefect ? 65 : 42}% ${isDefect ? 52 : 60}%), hsl(${(image.hue + 45) % 360} 38% 32%))` }} />
          <ImageIcon className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/45" strokeWidth={1.4} />
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
        <span className={cn('text-2xs font-semibold', isDefect ? 'text-white' : 'text-white/90')}>{KIND_LABEL[image.kind]}</span>
        {image.note && <span className="truncate pl-2 text-2xs text-white/70">{image.note}</span>}
      </div>
    </div>
  )
}

/** Upload slot — reads a chosen image to a data URL and reports it back. */
export function ImageUpload({ label, onFile, className }: { label: string; onFile: (dataUrl: string) => void; className?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const pick = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onFile(String(reader.result))
    reader.readAsDataURL(file)
  }
  return (
    <>
      <button
        onClick={() => ref.current?.click()}
        className={cn('group flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border-strong bg-surface-2/50 transition-colors hover:border-brand hover:bg-brand-soft', className)}
      >
        <Upload className="h-5 w-5 text-subtle transition-colors group-hover:text-brand" />
        <span className="px-2 text-center text-2xs font-medium text-subtle group-hover:text-brand">{label}</span>
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </>
  )
}

export { Camera }
