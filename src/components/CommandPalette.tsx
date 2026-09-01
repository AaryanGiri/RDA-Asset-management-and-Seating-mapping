import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Search, Map, Users, Boxes, LayoutDashboard,
  BarChart3, CornerDownLeft, Package, Armchair, Inbox, CalendarClock,
} from 'lucide-react'
import { useData, deptName } from '@/lib/store'
import { useUI } from '@/lib/uiStore'
import { cn } from '@/lib/utils'
import { SEAT_STATUS } from '@/lib/status'

interface Cmd { id: string; label: string; sub?: string; icon: typeof Map; group: string; run: () => void; keywords?: string }

export function CommandPalette() {
  const { paletteOpen, setPalette } = useUI()
  const nav = useNavigate()
  const { employees, seats, assets } = useData()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paletteOpen) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [paletteOpen])

  const close = () => setPalette(false)
  const go = (path: string) => { nav(path); close() }

  const navCommands: Cmd[] = [
    { id: 'nav-dash', label: 'Dashboard', icon: LayoutDashboard, group: 'Navigate', run: () => go('/') },
    { id: 'nav-map', label: 'Seat Map', icon: Map, group: 'Navigate', run: () => go('/neighborhood') },
    { id: 'nav-dir', label: 'Employee Locator', icon: Users, group: 'Navigate', run: () => go('/directory') },
    { id: 'nav-req', label: 'Seat Requests', icon: Inbox, group: 'Navigate', run: () => go('/requests') },
    { id: 'nav-mr', label: 'Meeting Rooms', icon: CalendarClock, group: 'Navigate', run: () => go('/meeting-rooms') },
    { id: 'nav-seat-an', label: 'Seating Analytics', icon: BarChart3, group: 'Navigate', run: () => go('/seating-analytics') },
    { id: 'nav-assets', label: 'Asset Register', icon: Boxes, group: 'Navigate', run: () => go('/assets') },
  ]

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) {
      return [...navCommands].slice(0, 8)
    }
    const out: Cmd[] = []
    // people
    for (const e of employees) {
      const seat = seats.find((s) => s.id === e.currentSeatId)
      if (`${e.fullName} ${e.code} ${deptName(e.departmentId)} ${e.project} ${seat?.seatNumber ?? ''}`.toLowerCase().includes(query)) {
        out.push({
          id: `emp-${e.id}`, label: e.fullName, sub: `${e.designation} · ${seat?.seatNumber ?? 'Unseated'}`,
          icon: Users, group: 'People', run: () => go(seat ? `/seating?seat=${seat.id}` : `/directory?emp=${e.id}`),
        })
      }
      if (out.filter((o) => o.group === 'People').length >= 6) break
    }
    // seats
    for (const s of seats) {
      if (s.seatNumber.toLowerCase().includes(query) || SEAT_STATUS[s.status].label.toLowerCase().includes(query)) {
        out.push({ id: `seat-${s.id}`, label: `Seat ${s.seatNumber}`, sub: `${SEAT_STATUS[s.status].label} · ${s.zone}`, icon: Armchair, group: 'Seats', run: () => go(`/seating?seat=${s.id}`) })
      }
      if (out.filter((o) => o.group === 'Seats').length >= 5) break
    }
    // assets
    for (const a of assets) {
      if (`${a.assetId} ${a.name} ${a.subcategory} ${a.location ?? ''}`.toLowerCase().includes(query)) {
        out.push({ id: `ast-${a.id}`, label: a.name, sub: `${a.assetId} · ${a.subcategory}`, icon: Package, group: 'Assets', run: () => go(`/assets/${a.id}`) })
      }
      if (out.filter((o) => o.group === 'Assets').length >= 6) break
    }
    // nav matches
    for (const c of navCommands) {
      if (c.label.toLowerCase().includes(query)) out.push(c)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, employees, seats, assets])

  useEffect(() => { setActive(0) }, [q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!paletteOpen) return
      if (e.key === 'Escape') { e.preventDefault(); close() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
      if (e.key === 'Enter') { e.preventDefault(); results[active]?.run() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paletteOpen, results, active])

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  // group results preserving order
  const groups = useMemo(() => {
    const g: Record<string, Cmd[]> = {}
    results.forEach((r) => { (g[r.group] ??= []).push(r) })
    return g
  }, [results])

  let idx = -1
  return createPortal(
    <AnimatePresence>
      {paletteOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-pop"
            initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4.5 w-4.5 text-subtle" />
              <input
                ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search people, seats, assets, or jump to…"
                className="h-14 flex-1 bg-transparent text-sm text-content placeholder:text-subtle focus:outline-none"
              />
              <kbd className="kbd">esc</kbd>
            </div>
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted">No matches for “{q}”.</div>
              ) : (
                Object.entries(groups).map(([group, items]) => (
                  <div key={group} className="mb-1">
                    <p className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-subtle">{group}</p>
                    {items.map((r) => {
                      idx++
                      const i = idx
                      return (
                        <button
                          key={r.id} data-idx={i}
                          onMouseEnter={() => setActive(i)} onClick={r.run}
                          className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors', i === active ? 'bg-brand-soft' : 'hover:bg-surface-2')}
                        >
                          <div className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', i === active ? 'bg-brand text-white' : 'bg-surface-3 text-muted')}>
                            <r.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-content">{r.label}</p>
                            {r.sub && <p className="truncate text-xs text-muted">{r.sub}</p>}
                          </div>
                          {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-subtle" />}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-2xs text-subtle">
              <span className="flex items-center gap-1"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> open</span>
              <span className="ml-auto">Rodic AssetSpace</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
