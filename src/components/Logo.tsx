import { cn } from '@/lib/utils'

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={cn('shrink-0', className)}>
      <defs>
        <linearGradient id="locusgrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(129 140 248)" />
          <stop offset="100%" stopColor="rgb(79 70 229)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#locusgrad)" />
      <path d="M16 6.5l8 4.6v9.2l-8 4.6-8-4.6v-9.2z" fill="none" stroke="white" strokeWidth="1.9" strokeLinejoin="round" opacity="0.9" />
      <circle cx="16" cy="16" r="3.1" fill="white" />
    </svg>
  )
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={30} />
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight text-content">Locus</div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">Workplace OS</div>
      </div>
    </div>
  )
}
