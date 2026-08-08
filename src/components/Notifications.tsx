import { Bell, CheckCheck, Package, Map, ShieldCheck, ArrowLeftRight, Settings } from 'lucide-react'
import { Sheet, EmptyState } from './ui'
import { useData } from '@/lib/store'
import { useUI } from '@/lib/uiStore'
import { cn, relativeTime } from '@/lib/utils'
import type { Notification } from '@/lib/types'

const kindIcon = { seat: Map, asset: Package, movement: ArrowLeftRight, verification: ShieldCheck, system: Settings }
const toneClasses = {
  info: 'text-notice bg-notice-soft', success: 'text-vacant bg-vacant-soft',
  warning: 'text-maint bg-maint-soft', danger: 'text-occupied bg-occupied-soft',
}

export function Notifications() {
  const { notifOpen, setNotif } = useUI()
  const { notifications, markNotificationRead, markAllRead } = useData()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <Sheet
      open={notifOpen}
      onClose={() => setNotif(false)}
      width={400}
      title={
        <div className="flex items-center gap-2.5">
          <Bell className="h-4.5 w-4.5 text-content" />
          <span className="font-semibold text-content">Notifications</span>
          {unread > 0 && <span className="chip bg-occupied-soft px-2 py-0.5 text-occupied">{unread} new</span>}
        </div>
      }
    >
      <div className="flex items-center justify-between px-5 py-2.5">
        <p className="text-xs text-muted">{notifications.length} total</p>
        <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>
      <div className="space-y-1 px-3 pb-6">
        {notifications.length === 0 ? (
          <div className="p-4"><EmptyState icon={<Bell className="h-5 w-5" />} title="All clear" body="No notifications right now." /></div>
        ) : (
          notifications.map((n: Notification) => {
            const Icon = kindIcon[n.kind]
            return (
              <button
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={cn('flex w-full items-start gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:bg-surface-2', !n.read && 'bg-surface-2/60')}
              >
                <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', toneClasses[n.tone])}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-content">{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                  <p className="mt-1 text-2xs text-subtle">{relativeTime(n.timestamp)}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </Sheet>
  )
}
