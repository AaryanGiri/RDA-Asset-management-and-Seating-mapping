import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Plus, Minus, Maximize2 } from 'lucide-react'
import { clamp, initials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BENCHES, ROOMS, VBW, VBH, SW, type NDesk, type NPerson, type RoomKind } from './data'
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
  meeting: 'rgb(var(--c-notice))',
  cabin: 'rgb(var(--c-occupied))',
  vr: 'rgb(var(--c-brand))',
  flex: 'rgb(var(--c-maint))',
  workstation: 'rgb(var(--c-brand))',
}

export function NeighborhoodMap({ desks, people, selectedId, personaDeskId, colorMode, highlight, focusId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ cw: 1000, ch: 640 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [smooth, setSmooth] = useState(false)
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
  }, [])

  const focusDesk = useCallback(
    (desk: NDesk, targetZoom = 2.4) => {
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
    const dx = e.clientX - drag.current.sx
    const dy = e.clientY - drag.current.sy
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
    setPan({ x: drag.current.px + dx, y: drag.current.py + dy })
  }
  const onPointerUp = () => { drag.current = null }

  const zoomBy = (f: number) => { setSmooth(true); setZoom((z) => clamp(z * f, 0.55, 6)) }
  const reset = () => { setSmooth(true); setZoom(1); setPan({ x: 0, y: 0 }) }

  const benchDividers = useMemo(() => {
    // vertical seat dividers on each bench table
    const lines: { x: number; y1: number; y2: number }[] = []
    for (const b of BENCHES) {
      const n = Math.round(b.w / SW)
      for (let i = 1; i < n; i++) lines.push({ x: b.x + SW * i, y1: b.y + 4, y2: b.y + b.h - 4 })
    }
    return lines
  }, [])

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
          {/* hall floor + outer wall */}
          <rect x={14} y={14} width={VBW - 28} height={VBH - 28} rx={20}
            fill="rgb(var(--c-surface))" opacity={0.4} stroke="rgb(var(--c-border-strong))" strokeWidth={5} />

          {/* bench tables */}
          {BENCHES.map((b) => (
            <g key={b.id}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10}
                fill="rgb(var(--c-surface-2))" stroke="rgb(var(--c-border))" strokeWidth={1.4} />
              {/* spine */}
              <line x1={b.x + 4} y1={b.y + b.h / 2} x2={b.x + b.w - 4} y2={b.y + b.h / 2} stroke="rgb(var(--c-border))" strokeWidth={1} />
              <text x={b.x + 2} y={b.y - 8} fontSize={11} fontWeight={700} fill="rgb(var(--c-text-subtle))" style={{ letterSpacing: 0.3 }}>{b.label.toUpperCase()}</text>
            </g>
          ))}
          {benchDividers.map((l, i) => <line key={i} x1={l.x} y1={l.y1} x2={l.x} y2={l.y2} stroke="rgb(var(--c-border))" strokeWidth={1} opacity={0.7} />)}

          {/* walled rooms */}
          {ROOMS.map((r) => {
            const c = ROOM_COLOR[r.kind]
            return (
              <g key={r.id}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={12} fill="rgb(var(--c-surface))" stroke={c} strokeWidth={2} />
                <rect x={r.x} y={r.y} width={r.w} height={26} rx={12} fill={c} opacity={0.14} />
                <text x={r.x + 12} y={r.y + 18} fontSize={12.5} fontWeight={700} fill="rgb(var(--c-text))">{r.label}</text>
                {r.sub && <text x={r.x + r.w - 12} y={r.y + 18} textAnchor="end" fontSize={10.5} fill="rgb(var(--c-text-subtle))">{r.sub}</text>}
                {r.kind === 'meeting' && (
                  <g>
                    {/* conference table + chairs */}
                    <rect x={r.x + r.w / 2 - 46} y={r.y + r.h / 2 - 20} width={92} height={40} rx={10} fill="rgb(var(--c-surface-2))" stroke="rgb(var(--c-border))" strokeWidth={1.4} />
                    {[-34, 0, 34].map((dx) => <circle key={`u${dx}`} cx={r.x + r.w / 2 + dx} cy={r.y + r.h / 2 - 32} r={8} fill="rgb(var(--c-surface-3))" stroke="rgb(var(--c-border))" strokeWidth={1} />)}
                    {[-34, 0, 34].map((dx) => <circle key={`d${dx}`} cx={r.x + r.w / 2 + dx} cy={r.y + r.h / 2 + 32} r={8} fill="rgb(var(--c-surface-3))" stroke="rgb(var(--c-border))" strokeWidth={1} />)}
                  </g>
                )}
              </g>
            )
          })}

          {/* seats (desk + chair + person) */}
          {desks.map((desk) => {
            const person = desk.personId ? people.get(desk.personId) : undefined
            const occupied = desk.status === 'occupied' || desk.status === 'notice'
            const fill = deskFill(desk, person, colorMode)
            const status = SEAT_STATUS[desk.status]
            const selected = desk.id === selectedId
            const isYou = desk.id === personaDeskId
            const dim = highlight ? !highlight.has(desk.id) : false
            const hovered = hover?.desk.id === desk.id
            const onBench = desk.zone === 'workstation'

            const cx = desk.x + desk.w / 2
            const top = desk.chair !== 'bottom'
            const chairCy = top ? desk.y + 13 : desk.y + desk.h - 13
            const avatarR = 13
            // name / number placed toward the spine (inner) side
            const nameY = top ? desk.y + desk.h - 9 : desk.y + 13
            const numY = top ? desk.y + desk.h - 22 : desk.y + 26

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
                {/* selection / hover cell ring */}
                {(selected || hovered) && (
                  <rect x={desk.x + 1} y={desk.y + 1} width={desk.w - 2} height={desk.h - 2} rx={8}
                    fill={occupied ? fill : 'transparent'} fillOpacity={selected ? 0.1 : 0.06}
                    stroke={fill} strokeWidth={selected ? 2 : 1.3} opacity={selected ? 1 : 0.6} />
                )}

                {/* standalone desk surface for room desks (bench desks sit on the table) */}
                {!onBench && (
                  <rect x={desk.x + 8} y={top ? desk.y + 24 : desk.y + 6} width={desk.w - 16} height={desk.h - 30} rx={6}
                    fill="rgb(var(--c-surface-2))" stroke="rgb(var(--c-border))" strokeWidth={1.2} />
                )}

                {/* monitor near the spine */}
                <rect x={cx - 13} y={top ? desk.y + desk.h - 7 : desk.y + 2} width={26} height={4.5} rx={2}
                  fill={occupied ? fill : 'rgb(var(--c-border-strong))'} opacity={occupied ? 0.55 : 0.8} />

                {/* chair: backrest + seat */}
                <rect x={cx - 15} y={top ? desk.y + 1 : desk.y + desk.h - 7} width={30} height={5} rx={2.5} fill={occupied ? fill : 'rgb(var(--c-surface-3))'} />
                <rect x={cx - 16} y={top ? desk.y + 5 : desk.y + desk.h - 23} width={32} height={18} rx={8}
                  fill={occupied ? 'rgb(var(--c-surface))' : 'rgb(var(--c-surface-2))'} stroke={occupied ? fill : status.fill} strokeWidth={1.6} />

                {occupied && person ? (
                  <>
                    <circle cx={cx} cy={chairCy} r={avatarR} fill={`hsl(${person.hue} 62% 52%)`} stroke="#fff" strokeWidth={1.4} />
                    <text x={cx} y={chairCy} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={700} fill="#fff">{initials(person.name).toUpperCase()}</text>
                    <text x={cx} y={nameY} textAnchor="middle" fontSize={10} fontWeight={600} fill="rgb(var(--c-text))">{shortName(person.name)}</text>
                    <text x={desk.x + desk.w - 5} y={numY} textAnchor="end" fontSize={8.5} fill="rgb(var(--c-text-subtle))">#{desk.label}</text>
                    {desk.status === 'notice' && <circle cx={desk.x + 8} cy={numY - 3} r={3.5} fill={SEAT_STATUS.notice.fill} stroke="#fff" strokeWidth={1} />}
                  </>
                ) : (
                  <>
                    <text x={cx} y={chairCy + 1} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill={status.fill}>#{desk.label}</text>
                    <text x={cx} y={nameY} textAnchor="middle" fontSize={9} fontWeight={600} fill={status.fill}>{status.label}</text>
                  </>
                )}

                {isYou && (
                  <g>
                    <rect x={desk.x + desk.w / 2 - 15} y={top ? desk.y - 12 : desk.y + desk.h} width={30} height={14} rx={7} fill="rgb(var(--c-brand))" />
                    <text x={desk.x + desk.w / 2} y={top ? desk.y - 5 : desk.y + desk.h + 7} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={800} fill="#fff">YOU</text>
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
          <div className="pointer-events-none fixed z-50 w-max max-w-[240px] -translate-x-1/2 -translate-y-[calc(100%+16px)] rounded-xl border border-border bg-surface p-2.5 shadow-pop"
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
