import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Minus, Maximize2, Expand, Shrink } from 'lucide-react'
import { clamp, initials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  ROOMS, CLUSTERS, STORAGE, STAIR, PILLAR, WIFI, CORRIDOR, LABELS, VBW, VBH,
  type NDesk, type NPerson, type RoomKind,
} from './data'
import { deskFill, SEAT_STATUS, type ColorMode } from './meta'

interface Props {
  desks: NDesk[]
  people: Map<string, NPerson>
  selectedId?: string
  personaDeskId?: string
  colorMode: ColorMode
  highlight: Set<string> | null
  focusId?: string
  onSelect: (desk: NDesk) => void
}

function shortName(name: string) {
  const parts = name.replace(/\s*\/\s*/g, ' / ').split(' ')
  if (parts.length === 1) return parts[0]
  const first = parts[0]
  const last = parts[parts.length - 1]
  if (last === '/' || first.length + last.length > 14) return first
  return `${first} ${last[0]}.`
}

const ROOM_COLOR: Record<RoomKind, string> = {
  meeting: 'rgb(var(--c-notice))', cabin: 'rgb(var(--c-occupied))', vr: 'rgb(var(--c-brand))', flex: 'rgb(var(--c-maint))', workstation: 'rgb(var(--c-brand))',
}

export function NeighborhoodMap({ desks, people, selectedId, personaDeskId, colorMode, highlight, focusId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ cw: 1000, ch: 640 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [smooth, setSmooth] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [hover, setHover] = useState<{ desk: NDesk; x: number; y: number } | null>(null)
  const drag = useRef<{ sx: number; sy: number; px: number; py: number; moved: boolean } | null>(null)

  const fit = Math.min(size.cw / VBW, size.ch / VBH) * 0.97
  const k = fit * zoom
  const originX = (size.cw - VBW * k) / 2 + pan.x
  const originY = (size.ch - VBH * k) / 2 + pan.y

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ cw: el.clientWidth, ch: el.clientHeight }))
    ro.observe(el)
    setSize({ cw: el.clientWidth, ch: el.clientHeight })
    return () => ro.disconnect()
  }, [isFs])

  const focusDesk = useCallback(
    (desk: NDesk, targetZoom = 2.4) => {
      const newK = fit * targetZoom
      const cx = desk.x + desk.w / 2
      const cy = desk.y + desk.h / 2
      setSmooth(true)
      setZoom(targetZoom)
      setPan({ x: size.cw / 2 - cx * newK - (size.cw - VBW * newK) / 2, y: size.ch / 2 - cy * newK - (size.ch - VBH * newK) / 2 })
    },
    [fit, size],
  )

  useEffect(() => {
    if (!focusId) return
    const d = desks.find((x) => x.id === focusId)
    if (d) focusDesk(d)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId])

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = containerRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const newZoom = clamp(zoom * factor, 0.55, 6)
    const newK = fit * newZoom
    const cpx = (mx - originX) / k
    const cpy = (my - originY) / k
    setSmooth(false)
    setZoom(newZoom)
    setPan({ x: mx - cpx * newK - (size.cw - VBW * newK) / 2, y: my - cpy * newK - (size.ch - VBH * newK) / 2 })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-desk]')) return
    drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSmooth(false)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
    setPan({ x: drag.current.px + dx, y: drag.current.py + dy })
  }
  const onPointerUp = () => { drag.current = null }

  const zoomBy = (f: number) => { setSmooth(true); setZoom((z) => clamp(z * f, 0.55, 6)) }
  const reset = () => { setSmooth(true); setZoom(1); setPan({ x: 0, y: 0 }) }

  // Fullscreen = a reliable CSS full-viewport overlay (works in iframes / all
  // browsers, unlike the Fullscreen API which is often blocked). Esc exits.
  const toggleFullscreen = () => setIsFs((v) => !v)
  useEffect(() => {
    if (!isFs) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFs(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFs])

  const view = (
    <div
      ref={containerRef}
      className={cn('overflow-hidden bg-bg grid-bg touch-none', isFs ? 'fixed inset-0 z-[60] h-screen w-screen rounded-none' : 'relative h-full w-full rounded-2xl')}
      onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerLeave={() => { onPointerUp(); setHover(null) }}
      style={{ cursor: drag.current ? 'grabbing' : 'grab' }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: VBW, height: VBH, transform: `translate(${originX}px, ${originY}px) scale(${k})`, transformOrigin: '0 0', transition: smooth ? 'transform 0.5s cubic-bezier(0.22,1,0.36,1)' : 'none' }}
      >
        <svg viewBox={`0 0 ${VBW} ${VBH}`} width={VBW} height={VBH} className="absolute inset-0 overflow-visible">
          <defs>
            <pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="7" stroke="rgb(var(--c-text-subtle))" strokeWidth="1.2" opacity="0.6" />
            </pattern>
          </defs>

          {/* hall floor + outer wall */}
          <rect x={16} y={44} width={880} height={566} rx={6} fill="rgb(var(--c-surface))" opacity={0.35} stroke="rgb(var(--c-border-strong))" strokeWidth={6} />
          {/* corridor */}
          <g>
            <rect x={CORRIDOR.x} y={CORRIDOR.y} width={CORRIDOR.w} height={CORRIDOR.h} fill="rgb(var(--c-surface-2))" opacity={0.5} stroke="rgb(var(--c-border))" strokeWidth={1.4} />
            <text x={CORRIDOR.x + CORRIDOR.w / 2} y={CORRIDOR.y + CORRIDOR.h / 2} fontSize={13} fontWeight={600} fill="rgb(var(--c-text-subtle))" textAnchor="middle" transform={`rotate(90 ${CORRIDOR.x + CORRIDOR.w / 2} ${CORRIDOR.y + CORRIDOR.h / 2})`}>6'-0" WIDE CORRIDOR</text>
          </g>

          {/* furniture cluster backings */}
          {CLUSTERS.map((c) => <rect key={c.id} x={c.x} y={c.y} width={c.w} height={c.h} rx={8} fill="rgb(var(--c-surface-2))" opacity={0.55} stroke="rgb(var(--c-border))" strokeWidth={1.2} />)}

          {/* low-height storage */}
          {STORAGE.map((s) => (
            <g key={s.id}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={2} fill="rgb(var(--c-surface-3))" stroke="rgb(var(--c-border-strong))" strokeWidth={1.2} />
              {s.label && s.h > 50 && <text x={s.x + s.w / 2} y={s.y + s.h / 2} fontSize={7.5} fill="rgb(var(--c-text-subtle))" textAnchor="middle" transform={`rotate(90 ${s.x + s.w / 2} ${s.y + s.h / 2})`}>{s.label}</text>}
            </g>
          ))}

          {/* staircase + pillar + wifi */}
          <rect x={STAIR.x} y={STAIR.y} width={STAIR.w} height={STAIR.h} fill="url(#hatch)" stroke="rgb(var(--c-border-strong))" strokeWidth={1.2} />
          {Array.from({ length: 6 }).map((_, i) => <line key={i} x1={STAIR.x} y1={STAIR.y + (STAIR.h / 6) * (i + 1)} x2={STAIR.x + STAIR.w} y2={STAIR.y + (STAIR.h / 6) * (i + 1)} stroke="rgb(var(--c-border-strong))" strokeWidth={0.8} />)}
          <rect x={PILLAR.x} y={PILLAR.y} width={PILLAR.w} height={PILLAR.h} rx={2} fill="#c026d3" opacity={0.85} />
          <text x={PILLAR.x + PILLAR.w / 2} y={PILLAR.y + PILLAR.h / 2} fontSize={13} fontWeight={800} fill="#fff" textAnchor="middle" dominantBaseline="central">P</text>
          <rect x={WIFI.x} y={WIFI.y} width={WIFI.w} height={WIFI.h} rx={4} fill="#facc15" opacity={0.9} />
          <text x={WIFI.x + WIFI.w / 2} y={WIFI.y + WIFI.h / 2} fontSize={12} fontWeight={800} fill="#422006" textAnchor="middle" dominantBaseline="central">WIFI</text>

          {/* meeting room */}
          {ROOMS.map((r) => (
            <g key={r.id}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} fill="rgb(var(--c-surface))" stroke={ROOM_COLOR[r.kind]} strokeWidth={2} />
              <rect x={r.x} y={r.y} width={r.w} height={24} rx={8} fill={ROOM_COLOR[r.kind]} opacity={0.14} />
              <text x={r.x + 10} y={r.y + 17} fontSize={12} fontWeight={700} fill="rgb(var(--c-text))">{r.label}</text>
              {r.sub && <text x={r.x + r.w / 2} y={r.y + r.h - 12} fontSize={9.5} fill="rgb(var(--c-text-subtle))" textAnchor="middle">{r.sub}</text>}
              <rect x={r.x + r.w / 2 - 44} y={r.y + r.h / 2 - 18} width={88} height={36} rx={9} fill="rgb(var(--c-surface-2))" stroke="rgb(var(--c-border))" strokeWidth={1.4} />
              {[-30, 0, 30].map((dx) => <circle key={`u${dx}`} cx={r.x + r.w / 2 + dx} cy={r.y + r.h / 2 - 30} r={8} fill="rgb(var(--c-surface-3))" stroke="rgb(var(--c-border))" strokeWidth={1} />)}
              {[-30, 0, 30].map((dx) => <circle key={`d${dx}`} cx={r.x + r.w / 2 + dx} cy={r.y + r.h / 2 + 30} r={8} fill="rgb(var(--c-surface-3))" stroke="rgb(var(--c-border))" strokeWidth={1} />)}
            </g>
          ))}

          {/* zone labels */}
          {LABELS.map((l) => <text key={l.text} x={l.x} y={l.y} fontSize={l.text === 'TECH INNOVATION' ? 15 : 11.5} fontWeight={l.text === 'TECH INNOVATION' ? 800 : 700} fill={l.color} style={{ letterSpacing: 0.3 }}>{l.text}</text>)}

          {/* seats: desk + office chair + person */}
          {desks.map((desk) => {
            const person = desk.personId ? people.get(desk.personId) : undefined
            const occupied = desk.status === 'occupied' || desk.status === 'notice'
            const fill = deskFill(desk, person, colorMode)
            const status = SEAT_STATUS[desk.status]
            const selected = desk.id === selectedId
            const isYou = desk.id === personaDeskId
            const dim = highlight ? !highlight.has(desk.id) : false
            const hovered = hover?.desk.id === desk.id

            const cx = desk.x + desk.w / 2
            const top = desk.chair !== 'bottom' // chair at top of the cell
            const chairCy = top ? desk.y + 13 : desk.y + desk.h - 13
            const deskY = top ? desk.y + 24 : desk.y + 6
            const deskH = desk.h - 30
            const nameY = top ? desk.y + desk.h - 8 : desk.y + 14
            const numY = top ? deskY + 12 : deskY + deskH - 4

            return (
              <g
                key={desk.id} data-desk
                style={{ cursor: 'pointer', opacity: dim ? 0.22 : 1, transition: 'opacity 0.3s' }}
                onClick={(e) => { e.stopPropagation(); if (!drag.current?.moved) onSelect(desk) }}
                onPointerEnter={(e) => setHover({ desk, x: e.clientX, y: e.clientY })}
                onPointerMove={(e) => setHover((h) => (h && h.desk.id === desk.id ? { ...h, x: e.clientX, y: e.clientY } : h))}
                onPointerLeave={() => setHover(null)}
              >
                {(selected || hovered) && (
                  <rect x={desk.x} y={desk.y} width={desk.w} height={desk.h} rx={8} fill={occupied ? fill : 'transparent'} fillOpacity={selected ? 0.1 : 0.06} stroke={fill} strokeWidth={selected ? 2 : 1.3} opacity={selected ? 1 : 0.6} />
                )}

                {/* desk surface */}
                <rect x={desk.x + 8} y={deskY} width={desk.w - 16} height={deskH} rx={5} fill="rgb(var(--c-surface))" stroke={occupied ? fill : status.fill} strokeWidth={1.3} strokeDasharray={occupied ? undefined : '3 3'} />
                {/* monitor at the inner edge */}
                <rect x={cx - 13} y={top ? deskY + deskH - 5 : deskY + 1} width={26} height={4} rx={2} fill={occupied ? fill : 'rgb(var(--c-border-strong))'} opacity={occupied ? 0.6 : 0.8} />

                {/* office chair: backrest + seat */}
                <rect x={cx - 15} y={top ? desk.y + 1 : desk.y + desk.h - 7} width={30} height={5} rx={2.5} fill={occupied ? fill : 'rgb(var(--c-surface-3))'} />
                <rect x={cx - 16} y={top ? desk.y + 5 : desk.y + desk.h - 23} width={32} height={18} rx={9} fill={occupied ? 'rgb(var(--c-surface))' : 'rgb(var(--c-surface-2))'} stroke={occupied ? fill : status.fill} strokeWidth={1.6} />

                {occupied && person ? (
                  <>
                    <circle cx={cx} cy={chairCy} r={13} fill={`hsl(${person.hue} 62% 52%)`} stroke="#fff" strokeWidth={1.4} />
                    <text x={cx} y={chairCy} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={700} fill="#fff">{initials(person.name).toUpperCase()}</text>
                    <text x={cx} y={nameY} textAnchor="middle" fontSize={10} fontWeight={600} fill="rgb(var(--c-text))">{shortName(person.name)}</text>
                    <text x={desk.x + desk.w - 12} y={numY} textAnchor="end" fontSize={8.5} fontWeight={700} fill="rgb(var(--c-text-subtle))">{desk.label}</text>
                    {desk.status === 'notice' && <circle cx={desk.x + 14} cy={numY - 3} r={3.5} fill={SEAT_STATUS.notice.fill} stroke="#fff" strokeWidth={1} />}
                  </>
                ) : (
                  <>
                    <text x={cx} y={chairCy + 1} textAnchor="middle" dominantBaseline="central" fontSize={8.5} fontWeight={700} fill={status.fill}>{desk.label}</text>
                    <text x={cx} y={nameY} textAnchor="middle" fontSize={9} fontWeight={600} fill={status.fill}>{status.label}</text>
                  </>
                )}

                {isYou && (
                  <g>
                    <rect x={cx - 15} y={top ? desk.y - 13 : desk.y + desk.h + 1} width={30} height={14} rx={7} fill="rgb(var(--c-brand))" />
                    <text x={cx} y={top ? desk.y - 6 : desk.y + desk.h + 8} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={800} fill="#fff">YOU</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 rounded-xl border border-border bg-surface/90 p-1 shadow-card backdrop-blur">
        <button onClick={toggleFullscreen} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Fullscreen">{isFs ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}</button>
        <div className="mx-1 h-px bg-border" />
        <button onClick={() => zoomBy(1.3)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
        <button onClick={() => zoomBy(1 / 1.3)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
        <button onClick={reset} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Fit to screen"><Maximize2 className="h-4 w-4" /></button>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-border bg-surface/90 px-2.5 py-1.5 text-2xs font-medium text-muted shadow-card backdrop-blur">
        {Math.round(zoom * 100)}% · scroll to zoom · drag to pan
      </div>

      {/* hover card */}
      {hover && (() => {
        const person = hover.desk.personId ? people.get(hover.desk.personId) : undefined
        const m = SEAT_STATUS[hover.desk.status]
        return (
          <div className="pointer-events-none fixed z-50 w-max max-w-[240px] -translate-x-1/2 -translate-y-[calc(100%+16px)] rounded-xl border border-border bg-surface p-2.5 shadow-pop" style={{ left: hover.x, top: hover.y }}>
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', m.dot)} />
              <span className="text-sm font-semibold text-content">{person ? person.name : `Desk ${hover.desk.label}`}</span>
              <span className={cn('chip px-1.5 py-0.5 text-2xs', m.bg, m.text)}>{m.label}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{person ? `${person.title} · ${hover.desk.label}` : `${hover.desk.pod} · ${hover.desk.note ?? 'Unassigned'}`}</p>
          </div>
        )
      })()}
    </div>
  )

  return isFs ? createPortal(view, document.body) : view
}
