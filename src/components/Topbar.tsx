import { Menu, Search, Bell, Sun, Moon, Command, ShieldCheck, User } from 'lucide-react'
import { useData } from '@/lib/store'
import { useUI } from '@/lib/uiStore'
import { IconButton } from './ui'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/types'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggleTheme, setPalette, setNotif } = useUI()
  const unread = useData((s) => s.notifications.filter((n) => !n.read).length)
  const role = useData((s) => s.role)
  const setRole = useData((s) => s.setRole)
  const persona = useData((s) => s.employees.find((e) => e.id === s.personaId))
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  const roles: { value: UserRole; label: string; icon: typeof User }[] = [
    { value: 'admin', label: 'Admin', icon: ShieldCheck },
    { value: 'employee', label: 'Employee', icon: User },
  ]
  const initials = role === 'admin' ? 'AM' : (persona?.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('') ?? 'EM')

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
      <button onClick={onMenu} className="btn-ghost h-9 w-9 rounded-xl p-0 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={() => setPalette(true)}
        className="group flex h-9 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3 text-sm text-subtle transition-colors hover:border-border-strong hover:bg-surface-3 sm:max-w-sm"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search people, seats, assets…</span>
        <span className="hidden items-center gap-1 sm:flex">
          <kbd className="kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* role switcher */}
        <div className="mr-1 hidden items-center rounded-xl border border-border bg-surface-2 p-0.5 sm:flex" role="tablist" aria-label="Access role">
          {roles.map((r) => (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                role === r.value ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-content',
              )}
            >
              <r.icon className="h-3.5 w-3.5" /> {r.label}
            </button>
          ))}
        </div>

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
          <div className={cn('grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white', role === 'admin' ? 'bg-gradient-to-br from-brand to-brand-strong' : 'bg-gradient-to-br from-notice to-maint')}>{initials}</div>
          <div className="leading-none">
            <div className="text-xs font-semibold text-content">{role === 'admin' ? 'Admin' : (persona?.fullName ?? 'Employee')}</div>
            <div className="mt-0.5 text-2xs text-subtle">{role === 'admin' ? 'Aster HQ · full access' : (persona?.code ?? 'Employee access')}</div>
          </div>
        </div>
        {/* mobile role toggle */}
        <button
          onClick={() => setRole(role === 'admin' ? 'employee' : 'admin')}
          className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-content sm:hidden"
          aria-label="Switch role"
          title={`Role: ${role}`}
        >
          {role === 'admin' ? <ShieldCheck className="h-[18px] w-[18px]" /> : <User className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </header>
  )
}
