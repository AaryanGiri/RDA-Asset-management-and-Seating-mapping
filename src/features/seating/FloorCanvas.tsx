import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Plus, Minus, Maximize2, Locate } from 'lucide-react'
import { FLOOR_GEOMETRY } from './floorplans'
import { FloorSVG } from './FloorSVG'
import { SEAT_STATUS } from '@/lib/status'
import { clamp } from '@/lib/utils'
import type { Seat, Employee } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  floorId: string
  seats: Seat[]
  employees: Employee[]
  selectedId?: string
  focusId?: string
  dimUnmatched?: Set<string> | null
  onSelect: (seat: Seat) => void
}

function markerGlyph(seat: Seat, r: number) {
  const white = { stroke: '#fff', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const }
  switch (seat.status) {
    case 'vacant':
      return null
    case 'notice':
      return <circle r={r * 0.42} style={{ fill: 'none', stroke: '#fff' }} strokeWidth={2} />
    case 'maintenance':
      return <line x1={-r * 0.42} y1={r * 0.42} x2={r * 0.42} y2={-r * 0.42} {...white} />
    case 'blocked':
      return (
        <g {...white}>
          <line x1={-r * 0.38} y1={-r * 0.38} x2={r * 0.38} y2={r * 0.38} />
          <line x1={-r * 0.38} y1={r * 0.38} x2={r * 0.38} y2={-r * 0.38} />
        </g>
      )
    default:
      return null
  }
}

export function FloorCanvas({ floorId, seats, employees, selectedId, focusId, dimUnmatched, onSelect }: Props) {
  const geo = FLOOR_GEOMETRY[floorId]
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ cw: 1000, ch: 640 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [smooth, setSmooth] = useState(false)
  const [hover, setHover] = useState<{ seat: Seat; x: number; y: number } | null>(null)
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)

  const fit = Math.min(size.cw / geo.vbw, size.ch / geo.vbh) * 0.94
  const k = fit * zoom
  const originX = (size.cw - geo.vbw * k) / 2 + pan.x
  const originY = (size.ch - geo.vbh * k) / 2 + pan.y

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ cw: el.clientWidth, ch: el.clientHeight })
    })
    ro.observe(el)
    setSize({ cw: el.clientWidth, ch: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // reset view on floor change
  useEffect(() => {
    setSmooth(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [floorId])

  const focusSeat = useCallback(
    (seat: Seat, targetZoom = 2.6) => {
      const newK = fit * targetZoom
      const sx = seat.x * geo.vbw
      const sy = seat.y * geo.vbh
      const newOriginX = size.cw / 2 - sx * newK
      const newOriginY = size.ch / 2 - sy * newK
      setSmooth(true)
      setZoom(targetZoom)
      setPan({
        x: newOriginX - (size.cw - geo.vbw * newK) / 2,
        y: newOriginY - (size.ch - geo.vbh * newK) / 2,
      })
    },
    [fit, geo, size],
  )

  useEffect(() => {
    if (!focusId) return
    const seat = seats.find((s) => s.id === focusId)
    if (seat) focusSeat(seat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId])

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = containerRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const oldK = k
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const newZoom = clamp(zoom * factor, 0.7, 6)
    const newK = fit * newZoom
    const cpx = (mx - originX) / oldK
    const cpy = (my - originY) / oldK
    const newOriginX = mx - cpx * newK
    const newOriginY = my - cpy * newK
    setSmooth(false)
    setZoom(newZoom)
    setPan({
      x: newOriginX - (size.cw - geo.vbw * newK) / 2,
      y: newOriginY - (size.ch - geo.vbh * newK) / 2,
    })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-seat]')) return
    drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSmooth(false)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPan({ x: drag.current.px + (e.clientX - drag.current.sx), y: drag.current.py + (e.clientY - drag.current.sy) })
  }
  const onPointerUp = () => (drag.current = null)

  const zoomBy = (f: number) => {
    setSmooth(true)
    const newZoom = clamp(zoom * f, 0.7, 6)
    setZoom(newZoom)
  }
  const reset = () => {
    setSmooth(true)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const markerR = 12

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
          width: geo.vbw,
          height: geo.vbh,
          transform: `translate(${originX}px, ${originY}px) scale(${k})`,
          transformOrigin: '0 0',
          transition: smooth ? 'transform 0.55s cubic-bezier(0.22,1,0.36,1)' : 'none',
        }}
      >
        <div className="absolute inset-0">
          <FloorSVG floorId={floorId} seats={seats} />
        </div>
        {/* marker overlay — same viewBox, same coordinate space → perfect alignment */}
        <svg viewBox={`0 0 ${geo.vbw} ${geo.vbh}`} width={geo.vbw} height={geo.vbh} className="absolute inset-0 overflow-visible">
          {seats.map((seat) => {
            const m = SEAT_STATUS[seat.status]
            const cx = seat.x * geo.vbw
            const cy = seat.y * geo.vbh
            const selected = seat.id === selectedId
            const dim = dimUnmatched ? !dimUnmatched.has(seat.id) : false
            const isVacant = seat.status === 'vacant'
            const emp = employees.find((e) => e.id === seat.employeeId)
            return (
              <g
                key={seat.id}
                data-seat
                transform={`translate(${cx}, ${cy})`}
                style={{ cursor: 'pointer', opacity: dim ? 0.18 : 1, transition: 'opacity 0.3s' }}
                onClick={(e) => { e.stopPropagation(); onSelect(seat) }}
                onPointerEnter={(e) => setHover({ seat, x: e.clientX, y: e.clientY })}
                onPointerMove={(e) => setHover((h) => (h && h.seat.id === seat.id ? { ...h, x: e.clientX, y: e.clientY } : h))}
                onPointerLeave={() => setHover(null)}
              >
                {selected && (
                  <circle r={markerR + 7} style={{ fill: 'none', stroke: m.fill, transformBox: 'fill-box', transformOrigin: 'center' }} strokeWidth={2.5} className="animate-pulse-ring" />
                )}
                {selected && <circle r={markerR + 5} style={{ fill: 'none', stroke: m.fill }} strokeWidth={2} opacity={0.9} />}
                <circle
                  r={markerR}
                  style={{
                    fill: isVacant ? 'rgb(var(--c-surface))' : m.fill,
                    stroke: isVacant ? m.fill : '#fff',
                  }}
                  strokeWidth={isVacant ? 3 : 2}
                  className="transition-[r] duration-150"
                />
                {markerGlyph(seat, markerR)}
                {emp && (
                  <text textAnchor="middle" dominantBaseline="central" y={0.5} style={{ fill: '#fff', pointerEvents: 'none' }} fontSize={9.5} fontWeight={700} className="font-sans">
                    {emp.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 rounded-xl border border-border bg-surface/90 p-1 shadow-card backdrop-blur">
        <button onClick={() => zoomBy(1.3)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
        <button onClick={() => zoomBy(1 / 1.3)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
        <div className="mx-1 h-px bg-border" />
        <button onClick={reset} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content" aria-label="Fit to screen"><Maximize2 className="h-4 w-4" /></button>
      </div>
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-border bg-surface/90 px-2.5 py-1.5 text-2xs font-medium text-muted shadow-card backdrop-blur">
        <Locate className="h-3.5 w-3.5" /> {Math.round(zoom * 100)}% · scroll to zoom · drag to pan
      </div>

      {/* tooltip */}
      {hover && (
        <div
          className="pointer-events-none fixed z-50 w-max max-w-[220px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-border bg-surface p-2.5 shadow-pop"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', SEAT_STATUS[hover.seat.status].dot)} />
            <span className="text-sm font-semibold text-content">Seat {hover.seat.seatNumber}</span>
            <span className={cn('chip px-1.5 py-0.5 text-2xs', SEAT_STATUS[hover.seat.status].bg, SEAT_STATUS[hover.seat.status].text)}>{SEAT_STATUS[hover.seat.status].label}</span>
          </div>
          {(() => {
            const emp = employees.find((e) => e.id === hover.seat.employeeId)
            return emp ? (
              <p className="mt-1 text-xs text-muted">{emp.fullName} · {emp.designation}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">{hover.seat.zone} · {hover.seat.seatType}</p>
            )
          })()}
        </div>
      )}
    </div>
  )
}
