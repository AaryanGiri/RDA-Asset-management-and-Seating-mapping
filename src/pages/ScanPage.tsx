import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, ScanLine, Check, ChevronRight, Camera, Zap, RefreshCw, ShieldCheck, ArrowLeftRight } from 'lucide-react'
import { Page } from '@/components/Page'
import { ConditionBadge, AssetStatusBadge, Spinner } from '@/components/ui'
import { CategoryIcon } from '@/features/assets/assetUi'
import { useData, officeName } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Asset } from '@/lib/types'

export function ScanPage() {
  const assets = useData((s) => s.assets)
  const nav = useNavigate()
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'result'>('idle')
  const [asset, setAsset] = useState<Asset | null>(null)

  const scan = () => {
    setPhase('scanning')
    setTimeout(() => {
      setAsset(assets[Math.floor(Math.random() * assets.length)])
      setPhase('result')
    }, 1900)
  }
  const reset = () => { setPhase('idle'); setAsset(null) }

  return (
    <Page>
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand"><QrCode className="h-6 w-6" /></div>
          <h1 className="text-xl font-semibold text-content">Scan to Open</h1>
          <p className="mt-1 text-sm text-muted">Point the camera at a Locus asset tag. No hardware scanner needed.</p>
        </div>

        {/* phone-style scanner */}
        <div className="card overflow-hidden p-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-950">
            {/* faux camera background */}
            <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 40% 30%, #1e293b, #020617 70%)' }} />
            <div className="absolute inset-0 grid-bg opacity-30" />

            {/* frame corners */}
            <div className="pointer-events-none absolute inset-8">
              {['-top-1 -left-1 border-t-4 border-l-4 rounded-tl-xl', '-top-1 -right-1 border-t-4 border-r-4 rounded-tr-xl', '-bottom-1 -left-1 border-b-4 border-l-4 rounded-bl-xl', '-bottom-1 -right-1 border-b-4 border-r-4 rounded-br-xl'].map((cls, i) => (
                <span key={i} className={cn('absolute h-8 w-8 border-brand', cls)} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <QrCode className="h-16 w-16 text-white/25" />
                  <p className="text-sm text-white/60">Ready to scan</p>
                </motion.div>
              )}
              {phase === 'scanning' && (
                <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <div className="absolute inset-x-8 h-0.5 animate-scan-line bg-brand shadow-[0_0_16px_4px_rgba(129,140,248,0.7)]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="rounded-lg border-2 border-white/20 p-3"><QrCode className="h-12 w-12 text-white/70" /></div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-white/70"><ScanLine className="h-3.5 w-3.5" /> Reading QR…</p>
                  </div>
                </motion.div>
              )}
              {phase === 'result' && asset && (
                <motion.div key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-vacant/10">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }} className="grid h-16 w-16 place-items-center rounded-full bg-vacant text-white">
                    <Check className="h-8 w-8" />
                  </motion.div>
                  <p className="font-mono text-sm font-semibold text-white">{asset.tag}</p>
                  <p className="text-xs text-white/60">Asset matched</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4">
            {phase === 'idle' && <button onClick={scan} className="btn-primary w-full"><Zap className="h-4 w-4" /> Simulate scan</button>}
            {phase === 'scanning' && <button className="btn-secondary w-full" disabled><Spinner className="h-4 w-4" /> Scanning…</button>}
            {phase === 'result' && <button onClick={reset} className="btn-secondary w-full"><RefreshCw className="h-4 w-4" /> Scan another</button>}
          </div>
        </div>

        {/* result card */}
        <AnimatePresence>
          {phase === 'result' && asset && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card mt-4 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><CategoryIcon catId={asset.categoryId} className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-content">{asset.name}</p>
                  <p className="truncate font-mono text-2xs text-muted">{asset.tag}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <ConditionBadge condition={asset.condition} className="px-1.5 py-0.5 text-2xs" />
                  <AssetStatusBadge status={asset.status} className="px-1.5 py-0.5 text-2xs" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-2xs">
                <div className="rounded-lg bg-surface-2 p-2"><p className="text-subtle">Location</p><p className="font-medium text-content">{asset.room}</p></div>
                <div className="rounded-lg bg-surface-2 p-2"><p className="text-subtle">Office</p><p className="font-medium text-content">{officeName(asset.officeId)}</p></div>
              </div>
              <button onClick={() => nav(`/assets/${asset.id}`)} className="btn-primary mt-3 w-full">Open passport <ChevronRight className="h-4 w-4" /></button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => nav(`/assets/${asset.id}`)} className="btn-secondary text-xs"><ShieldCheck className="h-3.5 w-3.5" /> Verify</button>
                <button onClick={() => nav(`/assets/${asset.id}`)} className="btn-secondary text-xs"><ArrowLeftRight className="h-3.5 w-3.5" /> Move</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'idle' && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-surface-2/40 p-4">
            <Camera className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <p className="text-xs text-muted">On a real device this opens the camera. Scanning a tag jumps straight to the asset passport, guided photo capture, or a verification — optimised for phones in the field.</p>
          </div>
        )}
      </div>
    </Page>
  )
}
