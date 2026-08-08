import { Menu, Search, Bell, Sun, Moon, Command } from 'lucide-react'
import { useData } from '@/lib/store'
import { useUI } from '@/lib/uiStore'
import { IconButton } from './ui'
import { cn } from '@/lib/utils'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggleTheme, setPalette, setNotif } = useUI()
  const unread = useData((s) => s.notifications.filter((n) => !n.read).length)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
      <button onClick={onMenu} className="btn-ghost h-9 w-9 rounded-xl p-0 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={() => setPalette(true)}
        className="group flex h-9 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3 text-sm text-subtle transition-colors hover:border-border-strong hover:bg-surface-3 sm:max-w-md"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search people, seats, assets…</span>
        <span className="hidden items-center gap-1 sm:flex">
          <kbd className="kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button onClick={() => setPalette(true)} className="btn-ghost h-9 w-9 rounded-xl p-0 sm:hidden" aria-label="Command palette">
          <Command className="h-5 w-5" />
        </button>
        <IconButton label="Toggle theme" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </IconButton>
        <button onClick={() => setNotif(true)} className="relative grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-occupied opacity-70" />
              <span className={cn('relative inline-flex h-2 w-2 rounded-full bg-occupied ring-2 ring-bg')} />
            </span>
          )}
        </button>
        <div className="ml-1.5 hidden items-center gap-2 rounded-xl border border-border bg-surface-2 py-1 pl-1 pr-3 sm:flex">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-xs font-bold text-white">AM</div>
          <div className="leading-none">
            <div className="text-xs font-semibold text-content">Admin</div>
            <div className="mt-0.5 text-2xs text-subtle">Aster HQ</div>
          </div>
        </div>
      </div>
    </header>
  )
}
