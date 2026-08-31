import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Plus, Minus, Maximize2 } from 'lucide-react'
import { clamp, initials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { PODS, ROOMS, VBW, VBH, type NDesk, type NPerson } from './data'
import { deskFill, SEAT_STATUS, ZONE_META, type ColorMode } from './meta'

interface Props {
  desks: NDesk[]
  people: Map<string, NPerson>
  selectedId?: string
  personaDeskId?: string
  colorMode: ColorMode
  highlight: Set<string> | null // desks to keep bright; others dim
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

export function NeighborhoodMap({ desks, people, selectedId, personaDeskId, colorMode, highlight, focusId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ cw: 1000, ch: 640 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [smooth, setSmooth] = useState(false)
  const [hover, setHover] = useState<{ desk: NDesk; x: number; y: number } | null>(null)
  const drag = useRef<{ sx: number; sy: number; px: number; py: number; moved: boolean } | null>(null)

  const fit = Math.min(size.cw / VBW, size.ch / VBH) * 0.96
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
  }, [])

  const focusDesk = useCallback(
    (desk: NDesk, targetZoom = 2.2) => {
      const newK = fit * targetZoom
      const cx = desk.x + desk.w / 2
      const cy = desk.y + desk.h / 2
      setSmooth(true)
      setZoom(targetZoom)
      setPan({
        x: size.cw / 2 - cx * newK - (size.cw - VBW * newK) / 2,
        y: size.ch / 2 - cy * newK - (size.ch - VBH * newK) / 2,
      })
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
    const newZoom = clamp(zoom * factor, 0.6, 6)
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
    const dx = e.clientX - drag.current.sx
    const dy = e.clientY - drag.current.sy
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
    setPan({ x: drag.current.px + dx, y: drag.current.py + dy })
  }
  const onPointerUp = () => { drag.current = null }

  const zoomBy = (f: number) => { setSmooth(true); setZoom((z) => clamp(z * f, 0.6, 6)) }
  const reset = () => { setSmooth(true); setZoom(1); setPan({ x: 0, y: 0 }) }

  const roomStroke = (kind: NDesk['zone']) => ZONE_META[kind].fill

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl bg-bg grid-bg touch-none"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { onPointerUp(); setHover(null) }}
      style={{ cursor: drag.current ? 'grabbing' : 'grab' }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: VBW, height: VBH,
          transform: `translate(${originX}px, ${originY}px) scale(${k})`,
          transformOrigin: '0 0',
          transition: smooth ? 'transform 0.5s cubic-bezier(0.22,1,0.36,1)' : 'none',
        }}
      >
        <svg viewBox={`0 0 ${VBW} ${VBH}`} width={VBW} height={VBH} className="absolute inset-0 overflow-visible">
          {/* pod backings */}
          {PODS.map((p) => (
            <g key={p.id}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={16}
                fill="rgb(var(--c-surface))" stroke="rgb(var(--c-border))" strokeWidth={1.2} opacity={0.55} />
              <text x={p.x + 16} y={p.y + 18} fontSize={12} fontWeight={700} fill="rgb(var(--c-text-subtle))" style={{ letterSpacing: 0.4 }}>
                {p.label.toUpperCase()}
              </text>
            </g>
          ))}

          {/* enclosed rooms (VR / cabin / flex) */}
          {ROOMS.map((r) => (
            <g key={r.id}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={16}
                fill="rgb(var(--c-surface))" stroke={roomStroke(r.kind)} strokeWidth={1.6} strokeDasharray="2 5" opacity={0.9} />
              <rect x={r.x} y={r.y} width={r.w} height={30} rx={16} fill={roomStroke(r.kind)} opacity={0.12} />
              <text x={r.x + 16} y={r.y + 20} fontSize={13} fontWeight={700} fill="rgb(var(--c-text))">{r.label}</text>
              {r.sub && <text x={r.x + r.w - 14} y={r.y + 20} textAnchor="end" fontSize={11} fill="rgb(var(--c-text-subtle))">{r.sub}</text>}
            </g>
          ))}

          {/* desks */}
          {desks.map((desk) => {
            const person = desk.personId ? people.get(desk.personId) : undefined
            const occupied = desk.status === 'occupied' || desk.status === 'notice'
            const fill = deskFill(desk, person, colorMode)
            const selected = desk.id === selectedId
            const isYou = desk.id === personaDeskId
            const dim = highlight ? !highlight.has(desk.id) : false
            const hovered = hover?.desk.id === desk.id
            const cx = desk.x + desk.w / 2

            // chair sits on the outer edge
            const chairY = desk.chair === 'top' ? desk.y - 15 : desk.y + desk.h + 3
            return (
              <g
                key={desk.id}
                data-desk
                style={{ cursor: 'pointer', opacity: dim ? 0.2 : 1, transition: 'opacity 0.3s' }}
                onClick={(e) => { e.stopPropagation(); if (!drag.current?.moved) onSelect(desk) }}
                onPointerEnter={(e) => setHover({ desk, x: e.clientX, y: e.clientY })}
                onPointerMove={(e) => setHover((h) => (h && h.desk.id === desk.id ? { ...h, x: e.clientX, y: e.clientY } : h))}
                onPointerLeave={() => setHover(null)}
              >
                {/* selection glow */}
                {(selected || hovered) && (
                  <rect x={desk.x - 3} y={desk.y - 3} width={desk.w + 6} height={desk.h + 6} rx={11}
                    fill="none" stroke={fill} strokeWidth={selected ? 2.6 : 1.6} opacity={selected ? 1 : 0.5} />
                )}
                {/* chair */}
                <rect x={cx - 22} y={chairY} width={44} height={12} rx={6} fill={occupied ? fill : 'rgb(var(--c-surface-3))'} opacity={occupied ? 0.5 : 1} />

                {/* desk surface */}
                <rect x={desk.x} y={desk.y} width={desk.w} height={desk.h} rx={9}
                  fill="rgb(var(--c-surface))"
                  stroke={occupied ? fill : SEAT_STATUS[desk.status].fill}
                  strokeWidth={occupied ? 1.4 : 1.5}
                  strokeDasharray={occupied ? undefined : '4 4'} />
                {/* top accent bar (colour mode) */}
                {occupied && <rect x={desk.x} y={desk.y} width={desk.w} height={5} rx={2.5} fill={fill} />}

                {occupied && person ? (
                  <>
                    <circle cx={desk.x + 20} cy={desk.y + desk.h / 2 + 2} r={13}
                      fill={`hsl(${person.hue} 65% 52%)`} stroke="#fff" strokeWidth={1.4} />
                    <text x={desk.x + 20} y={desk.y + desk.h / 2 + 2} textAnchor="middle" dominantBaseline="central"
                      fontSize={11} fontWeight={700} fill="#fff">{initials(person.name).toUpperCase()}</text>
                    <text x={desk.x + 38} y={desk.y + 22} fontSize={11.5} fontWeight={600} fill="rgb(var(--c-text))">{shortName(person.name)}</text>
                    <text x={desk.x + 38} y={desk.y + 37} fontSize={10} fill="rgb(var(--c-text-subtle))">#{desk.label}</text>
                    {desk.status === 'notice' && <circle cx={desk.x + desk.w - 9} cy={desk.y + desk.h - 9} r={4} fill={SEAT_STATUS.notice.fill} stroke="#fff" strokeWidth={1} />}
                  </>
                ) : (
                  <>
                    <text x={cx} y={desk.y + desk.h / 2 - 3} textAnchor="middle" fontSize={11} fontWeight={600} fill={SEAT_STATUS[desk.status].fill}>
                      {SEAT_STATUS[desk.status].label}
                    </text>
                    <text x={cx} y={desk.y + desk.h / 2 + 12} textAnchor="middle" fontSize={10} fill="rgb(var(--c-text-subtle))">#{desk.label}</text>
                  </>
                )}

                {isYou && (
                  <g>
                    <rect x={desk.x + desk.w - 34} y={desk.y - 9} width={30} height={15} rx={7.5} fill="rgb(var(--c-brand))" />
                    <text x={desk.x + desk.w - 19} y={desk.y - 1.5} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill="#fff">YOU</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 rounded-xl border border-border bg-surface/90 p-1 shadow-card backdrop-blur">
        <button onClick={() => zoomBy(1.3)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
        <button onClick={() => zoomBy(1 / 1.3)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
        <div className="mx-1 h-px bg-border" />
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
          <div className="pointer-events-none fixed z-50 w-max max-w-[240px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-border bg-surface p-2.5 shadow-pop"
            style={{ left: hover.x, top: hover.y }}>
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', m.dot)} />
              <span className="text-sm font-semibold text-content">{person ? person.name : `Desk ${hover.desk.label}`}</span>
              <span className={cn('chip px-1.5 py-0.5 text-2xs', m.bg, m.text)}>{m.label}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {person ? `${person.title} · #${hover.desk.label}` : `${hover.desk.pod} · ${hover.desk.note ?? 'Unassigned'}`}
            </p>
          </div>
        )
      })()}
    </div>
  )
}
