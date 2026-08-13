import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Map, Users, PieChart, Boxes,
  RotateCcw, Sparkles, Inbox, CalendarClock, Armchair,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { LogoFull } from './Logo'
import { cn } from '@/lib/utils'
import { useData } from '@/lib/store'
import { useUI } from '@/lib/uiStore'

interface NavItem { to: string; label: string; icon: typeof Map; end?: boolean; badge?: number }
interface NavGroup { title: string; items: NavItem[] }

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation()
  const seats = useData((s) => s.seats)
  const seatRequests = useData((s) => s.seatRequests)
  const role = useData((s) => s.role)
  const resetDemo = useData((s) => s.resetDemo)
  const toast = useUI((s) => s.toast)

  const noticeCount = seats.filter((s) => s.status === 'notice').length
  const pendingReq = seatRequests.filter((r) => r.status === 'pending').length

  const groups: NavGroup[] = role === 'employee'
    ? [
        { title: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
        {
          title: 'My Workplace',
          items: [
            { to: '/my-seat', label: 'My Seat', icon: Armchair },
            { to: '/seating', label: 'Floor Map', icon: Map },
            { to: '/meeting-rooms', label: 'Meeting Rooms', icon: CalendarClock },
          ],
        },
      ]
    : [
        { title: 'Overview', items: [{ to: '/', label: 'Executive Dashboard', icon: LayoutDashboard, end: true }] },
        {
          title: 'Workplace · Module A',
          items: [
            { to: '/seating', label: 'Floor Map', icon: Map },
            { to: '/directory', label: 'Employee Locator', icon: Users },
            { to: '/requests', label: 'Seat Requests', icon: Inbox, badge: pendingReq },
            { to: '/meeting-rooms', label: 'Meeting Rooms', icon: CalendarClock },
            { to: '/seating-analytics', label: 'Seating Analytics', icon: PieChart, badge: noticeCount },
          ],
        },
        {
          title: 'Assets · Module B',
          items: [
            { to: '/assets', label: 'Asset Register', icon: Boxes, end: true },
          ],
        },
      ]

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center px-5">
        <LogoFull />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = item.end ? loc.pathname === item.to : loc.pathname.startsWith(item.to) && item.to !== '/'
                const isActive = item.to === '/' ? loc.pathname === '/' : active
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'text-content' : 'text-muted hover:bg-surface-2 hover:text-content',
                    )}
                  >
                    {isActive && (
                      <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                    )}
                    <item.icon className={cn('relative z-10 h-[18px] w-[18px]', isActive && 'text-brand')} />
                    <span className="relative z-10 flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className={cn('relative z-10 grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-2xs font-semibold', isActive ? 'bg-brand text-white' : 'bg-surface-3 text-muted')}>
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-brand-soft to-transparent p-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-content">Concept Preview</p>
            <p className="truncate text-2xs text-muted">Mock data · in-browser</p>
          </div>
        </div>
        <button
          onClick={() => { resetDemo(); toast({ tone: 'info', title: 'Demo reset', body: 'Seeded data restored.' }) }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
        </button>
      </div>
    </aside>
  )
}
