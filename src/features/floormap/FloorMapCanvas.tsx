import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Minus, Maximize2, Expand, Shrink } from 'lucide-react'
import { clamp, initials, cn } from '@/lib/utils'
import { ROOMS, PLATE, VBW, VBH, type NDesk, type NPerson, type FloorRoomKind } from './data'
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

// room styling by kind — service (toilets/pantry/store) muted so seating reads first
const ROOM_STYLE: Record<FloorRoomKind, { stroke: string; label: string; muted?: boolean }> = {
  meeting: { stroke: 'rgb(var(--c-notice))', label: 'rgb(var(--c-notice))' },
  cabin: { stroke: 'rgb(var(--c-occupied))', label: 'rgb(var(--c-text))' },
  office: { stroke: 'rgb(var(--c-brand))', label: 'rgb(var(--c-text))' },
  reception: { stroke: 'rgb(var(--c-brand))', label: 'rgb(var(--c-brand))' },
  open: { stroke: 'rgb(var(--c-border-strong))', label: 'rgb(var(--c-text-subtle))' },
  balcony: { stroke: 'rgb(var(--c-vacant))', label: 'rgb(var(--c-text-subtle))', muted: true },
  courtyard: { stroke: 'rgb(var(--c-vacant))', label: 'rgb(var(--c-text-subtle))', muted: true },
  service: { stroke: 'rgb(var(--c-border-strong))', label: 'rgb(var(--c-text-subtle))', muted: true },
}

const DW = 50 // desk width (fills seat pitch so a row reads as a bench)

export function FloorMapCanvas({ desks, people, selectedId, personaDeskId, colorMode, highlight, focusId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ cw: 1000, ch: 640 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [smooth, setSmooth] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [hover, setHover] = useState<{ desk: NDesk; x: number; y: number } | null>(null)
  const drag = useRef<{ sx: number; sy: number; px: number; py: number; moved: boolean } | null>(null)

  const fit = Math.min(size.cw / VBW, size.ch / VBH) * 0.98
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

  // Fullscreen = a reliable CSS full-viewport overlay (works in iframes / all
  // browsers, unlike the Fullscreen API which is often blocked). Esc exits.
  const toggleFullscreen = () => setIsFs((v) => !v)
  useEffect(() => {
    if (!isFs) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFs(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFs])

  const focusDesk = useCallback(
    (desk: NDesk, targetZoom = 3.4) => {
      const newK = fit * targetZoom
      setSmooth(true)
      setZoom(targetZoom)
      setPan({ x: size.cw / 2 - desk.x * newK - (size.cw - VBW * newK) / 2, y: size.ch / 2 - desk.y * newK - (size.ch - VBH * newK) / 2 })
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
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const newZoom = clamp(zoom * factor, 0.35, 9)
    const newK = fit * newZoom
    const cpx = (mx - originX) / k, cpy = (my - originY) / k
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

  const zoomBy = (f: number) => { setSmooth(true); setZoom((z) => clamp(z * f, 0.35, 9)) }
  const reset = () => { setSmooth(true); setZoom(1); setPan({ x: 0, y: 0 }) }

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
          {/* floor plate + outer wall */}
          <rect x={PLATE.x + 6} y={PLATE.y + 6} width={PLATE.w - 12} height={PLATE.h - 12} rx={18} fill="rgb(var(--c-surface))" opacity={0.28} stroke="rgb(var(--c-border-strong))" strokeWidth={10} />

          {/* rooms (real drawing positions) */}
          {ROOMS.map((r) => {
            const st = ROOM_STYLE[r.kind] ?? ROOM_STYLE.service
            return (
              <g key={r.id} style={{ opacity: st.muted ? 0.55 : 1 }}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} fill={st.stroke} fillOpacity={0.05} stroke={st.stroke} strokeWidth={2.2} strokeOpacity={0.7} />
                <text x={r.x + 10} y={r.y + 24} fontSize={19} fontWeight={700} fill={st.label} style={{ pointerEvents: 'none' }}>{r.label}</text>
              </g>
            )
          })}

          {/* seats: desk + chair + person at their real desk positions */}
          {desks.map((desk) => {
            const person = desk.personId ? people.get(desk.personId) : undefined
            const occupied = desk.status === 'occupied' || desk.status === 'notice'
            const fill = deskFill(desk, person, colorMode)
            const status = SEAT_STATUS[desk.status]
            const selected = desk.id === selectedId
            const isYou = desk.id === personaDeskId
            const dim = highlight ? !highlight.has(desk.id) : false
            const hovered = hover?.desk.id === desk.id
            const cx = desk.x, cy = desk.y
            const cabin = desk.seatType === 'cabin'
            const top = desk.chair !== 'bottom' // person above the desk
            const R = cabin ? 15 : 13
            const chairCy = cy // seat marker ≈ chair position
            const deskY = cabin ? cy - 10 : top ? cy + 8 : cy - 26
            const deskH = 18

            return (
              <g
                key={desk.id} data-desk
                style={{ cursor: 'pointer', opacity: dim ? 0.14 : 1, transition: 'opacity 0.3s' }}
                onClick={(e) => { e.stopPropagation(); if (!drag.current?.moved) onSelect(desk) }}
                onPointerEnter={(e) => setHover({ desk, x: e.clientX, y: e.clientY })}
                onPointerMove={(e) => setHover((h) => (h && h.desk.id === desk.id ? { ...h, x: e.clientX, y: e.clientY } : h))}
                onPointerLeave={() => setHover(null)}
              >
                {cabin && <rect x={cx - 32} y={cy - 30} width={64} height={60} rx={8} fill="rgb(var(--c-surface))" stroke={occupied ? fill : status.fill} strokeWidth={1.6} opacity={0.85} />}
                {(selected || hovered) && <circle cx={cx} cy={cy} r={R + 13} fill={occupied ? fill : 'transparent'} fillOpacity={selected ? 0.12 : 0.06} stroke={fill} strokeWidth={selected ? 3 : 2} opacity={selected ? 1 : 0.6} />}

                {/* desk */}
                {!cabin && (
                  <>
                    <rect x={cx - DW / 2} y={deskY} width={DW} height={deskH} rx={4} fill="rgb(var(--c-surface))" stroke={occupied ? fill : status.fill} strokeWidth={1.4} strokeDasharray={occupied ? undefined : '3 3'} />
                    <rect x={cx - 13} y={top ? deskY + deskH - 5 : deskY + 1} width={26} height={4} rx={2} fill={occupied ? fill : 'rgb(var(--c-border-strong))'} opacity={0.55} />
                  </>
                )}

                {/* chair backrest */}
                <rect x={cx - R - 1} y={top ? chairCy - R - 9 : chairCy + R + 4} width={(R + 1) * 2} height={5} rx={2.5} fill={occupied ? fill : 'rgb(var(--c-surface-3))'} />

                {/* person / empty chair */}
                {occupied && person ? (
                  <>
                    <circle cx={cx} cy={chairCy} r={R} fill={`hsl(${person.hue} 62% 52%)`} stroke="#fff" strokeWidth={1.4} />
                    <text x={cx} y={chairCy} textAnchor="middle" dominantBaseline="central" fontSize={cabin ? 12 : 10.5} fontWeight={700} fill="#fff">{initials(person.name).toUpperCase()}</text>
                    {desk.status === 'notice' && <circle cx={cx + R - 3} cy={chairCy - R + 3} r={4} fill={SEAT_STATUS.notice.fill} stroke="#fff" strokeWidth={1} />}
                  </>
                ) : (
                  <circle cx={cx} cy={chairCy} r={R} fill="rgb(var(--c-surface-2))" stroke={status.fill} strokeWidth={1.8} strokeDasharray="3 3" />
                )}

                {isYou && (
                  <g>
                    <rect x={cx - 15} y={chairCy - R - 24} width={30} height={14} rx={7} fill="rgb(var(--c-brand))" />
                    <text x={cx} y={chairCy - R - 17} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={800} fill="#fff">YOU</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* controls */}
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
              <span className="text-sm font-semibold text-content">{person ? person.name : `Seat ${hover.desk.label}`}</span>
              <span className={cn('chip px-1.5 py-0.5 text-2xs', m.bg, m.text)}>{m.label}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{person ? `${person.title} · ${hover.desk.label}` : `${hover.desk.label} · ${hover.desk.note ?? 'Unassigned'}`}</p>
          </div>
        )
      })()}
    </div>
  )

  return isFs ? createPortal(view, document.body) : view
}
