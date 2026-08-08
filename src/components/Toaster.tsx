import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useUI } from '@/lib/uiStore'
import { cn } from '@/lib/utils'

const icons = {
  info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle,
}
const tones = {
  info: 'text-notice', success: 'text-vacant', warning: 'text-maint', danger: 'text-occupied',
}

export function Toaster() {
  const { toasts, dismissToast } = useUI()
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.tone]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-pop"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tones[t.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-content">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs text-muted">{t.body}</p>}
              </div>
              <button onClick={() => dismissToast(t.id)} className="text-subtle transition-colors hover:text-content">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
