import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Plus, Minus, Maximize2, Locate } from 'lucide-react'
import { FLOOR_GEOMETRY } from './floorplans'
import type { RoomKind } from './floorplans'
import {
  geometryToPlan,
  formatFtIn,
  WALL_META,
  DOOR_META,
  FURNITURE_META,
  type EditorTool,
  type Selection,
  type WallType,
  type DoorType,
  type FurnitureKind,
} from './layout'
import { FloorSVG } from './FloorSVG'
import { useData } from '@/lib/store'
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
  // editor
  editing?: boolean
  tool?: EditorTool
  wallType?: WallType
  doorType?: DoorType
  furnitureKind?: FurnitureKind
  roomKind?: RoomKind
  gridSnap?: boolean
  selection?: Selection | null
  onSelectElement?: (sel: Selection | null) => void
}

type Gesture =
  | { t: 'create'; tool: EditorTool; x0: number; y0: number; x1: number; y1: number }
  | { t: 'move'; elType: 'room' | 'furniture' | 'wall' | 'door'; id: string; ox: number; oy: number; ox2?: number; oy2?: number; dx: number; dy: number; moved: boolean }
  | { t: 'resize'; elType: 'room' | 'furniture'; id: string; handle: string; ox: number; oy: number; ow: number; oh: number; nx: number; ny: number; nw: number; nh: number }
  | { t: 'wall-end'; id: string; end: 1 | 2; x: number; y: number }

function rank(seat: Seat, selectedId?: string, hoverId?: string) {
  if (seat.id === hoverId) return 2
  if (seat.id === selectedId) return 1
  return 0
}

function markerGlyph(seat: Seat, r: number) {
  const white = { stroke: '#fff', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const }
  switch (seat.status) {
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

function resizeRect(o: { x: number; y: number; w: number; h: number }, handle: string, dx: number, dy: number) {
  let { x, y, w, h } = o
  let l = x, t = y, rgt = x + w, bot = y + h
  if (handle.includes('w')) l = x + dx
  if (handle.includes('e')) rgt = x + w + dx
  if (handle.includes('n')) t = y + dy
  if (handle.includes('s')) bot = y + h + dy
  const nx = Math.min(l, rgt)
  const ny = Math.min(t, bot)
  const nw = Math.max(6, Math.abs(rgt - l))
  const nh = Math.max(6, Math.abs(bot - t))
  return { x: nx, y: ny, w: nw, h: nh }
}

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
function handlePos(r: { x: number; y: number; w: number; h: number }, h: string) {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  const x = h.includes('w') ? r.x : h.includes('e') ? r.x + r.w : cx
  const y = h.includes('n') ? r.y : h.includes('s') ? r.y + r.h : cy
  return { x, y }
}
const handleCursor: Record<string, string> = {
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
}

export function FloorCanvas({
  floorId, seats, employees, selectedId, focusId, dimUnmatched, onSelect,
  editing = false, tool = 'select', wallType = 'gypsum', doorType = 'glass',
  furnitureKind = 'desk', roomKind = 'office', gridSnap = true, selection = null, onSelectElement,
}: Props) {
  const storePlan = useData((s) => s.floorPlans[floorId])
  const plan = storePlan ?? geometryToPlan(FLOOR_GEOMETRY[floorId])
  const ppf = plan.pxPerFoot
  // store actions
  const addRoom = useData((s) => s.addRoom)
  const updateRoom = useData((s) => s.updateRoom)
  const addWall = useData((s) => s.addWall)
  const updateWall = useData((s) => s.updateWall)
  const addDoor = useData((s) => s.addDoor)
  const updateDoor = useData((s) => s.updateDoor)
  const addFurniture = useData((s) => s.addFurniture)
  const updateFurniture = useData((s) => s.updateFurniture)
  const addSeat = useData((s) => s.addSeat)
  const setSeatPosition = useData((s) => s.setSeatPosition)

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ cw: 1000, ch: 640 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [smooth, setSmooth] = useState(false)
  const [hover, setHover] = useState<{ seat: Seat; x: number; y: number } | null>(null)
  const [roomHover, setRoomHover] = useState<{ room: { id: string; label: string; sub?: string; kind: string }; x: number; y: number } | null>(null)
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const [seatDrag, setSeatDrag] = useState<{ seatId: string; x: number; y: number; moved: boolean } | null>(null)
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const [measure, setMeasure] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)

  const fit = Math.min(size.cw / plan.vbw, size.ch / plan.vbh) * 0.94
  const k = fit * zoom
  const originX = (size.cw - plan.vbw * k) / 2 + pan.x
  const originY = (size.ch - plan.vbh * k) / 2 + pan.y
  const s = 1 / k // screen→viewBox scale for handles/labels so they stay constant on screen

  const clientToPx = (cx: number, cy: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return { x: (cx - rect.left - originX) / k, y: (cy - rect.top - originY) / k }
  }
  const clientToNorm = (cx: number, cy: number) => {
    const p = clientToPx(cx, cy)
    return { x: clamp(p.x / plan.vbw, 0, 1), y: clamp(p.y / plan.vbh, 0, 1) }
  }
  const gridStepPx = ppf * 0.5
  const snap = (v: number) => (gridSnap ? Math.round(v / gridStepPx) * gridStepPx : v)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ cw: el.clientWidth, ch: el.clientHeight }))
    ro.observe(el)
    setSize({ cw: el.clientWidth, ch: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setSmooth(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [floorId])

  const focusSeat = useCallback(
    (seat: Seat, targetZoom = 2.6) => {
      const newK = fit * targetZoom
      const sx = seat.x * plan.vbw
      const sy = seat.y * plan.vbh
      setSmooth(true)
      setZoom(targetZoom)
      setPan({
        x: size.cw / 2 - sx * newK - (size.cw - plan.vbw * newK) / 2,
        y: size.ch / 2 - sy * newK - (size.ch - plan.vbh * newK) / 2,
      })
    },
    [fit, plan, size],
  )

  useEffect(() => {
    if (!focusId) return
    const seat = seats.find((x) => x.id === focusId)
    if (seat) focusSeat(seat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId])

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = containerRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const newZoom = clamp(zoom * factor, 0.6, 8)
    const newK = fit * newZoom
    const cpx = (mx - originX) / k
    const cpy = (my - originY) / k
    setSmooth(false)
    setZoom(newZoom)
    setPan({
      x: mx - cpx * newK - (size.cw - plan.vbw * newK) / 2,
      y: my - cpy * newK - (size.ch - plan.vbh * newK) / 2,
    })
  }

  // ── container pointer: pan, create tools, deselect ──────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('[data-seat]') || t.closest('[data-elem]') || t.closest('[data-handle]')) return

    if (editing && tool === 'seat') {
      const { x, y } = clientToNorm(e.clientX, e.clientY)
      const id = addSeat(floorId, x, y)
      onSelectElement?.({ type: 'seat', id })
      return
    }
    if (editing && tool !== 'select') {
      const p = clientToPx(e.clientX, e.clientY)
      const sx = snap(p.x), sy = snap(p.y)
      setGesture({ t: 'create', tool, x0: sx, y0: sy, x1: sx, y1: sy })
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }
    // select tool on empty space → deselect + pan
    if (editing && tool === 'select') onSelectElement?.(null)
    drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSmooth(false)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (seatDrag) {
      const { x, y } = clientToNorm(e.clientX, e.clientY)
      setSeatDrag((d) => (d ? { ...d, x, y, moved: true } : d))
      return
    }
    if (gesture) {
      const p = clientToPx(e.clientX, e.clientY)
      const gx = snap(p.x), gy = snap(p.y)
      if (gesture.t === 'create') setGesture({ ...gesture, x1: gx, y1: gy })
      else if (gesture.t === 'move') {
        const dx = snap(p.x - startRef.current.x + gesture.ox) - gesture.ox
        const dy = snap(p.y - startRef.current.y + gesture.oy) - gesture.oy
        setGesture({ ...gesture, dx, dy, moved: true })
      } else if (gesture.t === 'resize') {
        const r = resizeRect({ x: gesture.ox, y: gesture.oy, w: gesture.ow, h: gesture.oh }, gesture.handle, snap(p.x) - snap(startRef.current.x), snap(p.y) - snap(startRef.current.y))
        setGesture({ ...gesture, nx: r.x, ny: r.y, nw: r.w, nh: r.h })
      } else if (gesture.t === 'wall-end') {
        setGesture({ ...gesture, x: gx, y: gy })
      }
      return
    }
    if (!drag.current) return
    setPan({ x: drag.current.px + (e.clientX - drag.current.sx), y: drag.current.py + (e.clientY - drag.current.sy) })
  }

  const startRef = useRef({ x: 0, y: 0 })

  const onPointerUp = () => {
    if (seatDrag) {
      const seat = seats.find((x) => x.id === seatDrag.seatId)
      if (seat) {
        if (seatDrag.moved) setSeatPosition(seat.id, seatDrag.x, seatDrag.y)
        else onSelectElement?.({ type: 'seat', id: seat.id })
      }
      setSeatDrag(null)
      return
    }
    if (gesture) {
      commitGesture(gesture)
      setGesture(null)
      return
    }
    drag.current = null
  }

  const commitGesture = (g: Gesture) => {
    if (g.t === 'create') {
      const x = Math.min(g.x0, g.x1), y = Math.min(g.y0, g.y1)
      const w = Math.abs(g.x1 - g.x0), h = Math.abs(g.y1 - g.y0)
      if (g.tool === 'room') {
        const rw = w < 12 ? 130 : w, rh = h < 12 ? 100 : h
        const id = addRoom(floorId, { label: 'New Room', kind: roomKind, x, y, w: rw, h: rh })
        onSelectElement?.({ type: 'room', id })
      } else if (g.tool === 'furniture') {
        const meta = FURNITURE_META[furnitureKind]
        const fw = w < 12 ? meta.wFt * ppf : w, fh = h < 12 ? meta.hFt * ppf : h
        const id = addFurniture(floorId, { kind: furnitureKind, x: w < 12 ? g.x0 - fw / 2 : x, y: h < 12 ? g.y0 - fh / 2 : y, w: fw, h: fh })
        onSelectElement?.({ type: 'furniture', id })
      } else if (g.tool === 'wall') {
        const len = Math.hypot(g.x1 - g.x0, g.y1 - g.y0)
        if (len >= 8) {
          const id = addWall(floorId, { type: wallType, x1: g.x0, y1: g.y0, x2: g.x1, y2: g.y1 })
          onSelectElement?.({ type: 'wall', id })
        }
      } else if (g.tool === 'door') {
        const id = addDoor(floorId, { type: doorType, x: g.x0, y: g.y0, angle: 0, w: DOOR_META[doorType].widthFt * ppf })
        onSelectElement?.({ type: 'door', id })
      } else if (g.tool === 'measure') {
        setMeasure({ x0: g.x0, y0: g.y0, x1: g.x1, y1: g.y1 })
      }
    } else if (g.t === 'move' && g.moved) {
      if (g.elType === 'room') updateRoom(floorId, g.id, { x: g.ox + g.dx, y: g.oy + g.dy })
      else if (g.elType === 'furniture') updateFurniture(floorId, g.id, { x: g.ox + g.dx, y: g.oy + g.dy })
      else if (g.elType === 'door') updateDoor(floorId, g.id, { x: g.ox + g.dx, y: g.oy + g.dy })
      else if (g.elType === 'wall') updateWall(floorId, g.id, { x1: g.ox + g.dx, y1: g.oy + g.dy, x2: (g.ox2 ?? 0) + g.dx, y2: (g.oy2 ?? 0) + g.dy })
    } else if (g.t === 'resize') {
      if (g.elType === 'room') updateRoom(floorId, g.id, { x: g.nx, y: g.ny, w: g.nw, h: g.nh })
      else updateFurniture(floorId, g.id, { x: g.nx, y: g.ny, w: g.nw, h: g.nh })
    } else if (g.t === 'wall-end') {
      updateWall(floorId, g.id, g.end === 1 ? { x1: g.x, y1: g.y } : { x2: g.x, y2: g.y })
    }
    drag.current = null
  }

  const beginElemMove = (e: React.PointerEvent, elType: 'room' | 'furniture' | 'wall' | 'door', el: any) => {
    e.stopPropagation()
    containerRef.current?.setPointerCapture(e.pointerId)
    const p = clientToPx(e.clientX, e.clientY)
    startRef.current = p
    onSelectElement?.({ type: elType, id: el.id })
    if (elType === 'wall') setGesture({ t: 'move', elType, id: el.id, ox: el.x1, oy: el.y1, ox2: el.x2, oy2: el.y2, dx: 0, dy: 0, moved: false })
    else setGesture({ t: 'move', elType, id: el.id, ox: el.x, oy: el.y, dx: 0, dy: 0, moved: false })
  }
  const beginResize = (e: React.PointerEvent, elType: 'room' | 'furniture', el: any, handle: string) => {
    e.stopPropagation()
    containerRef.current?.setPointerCapture(e.pointerId)
    startRef.current = clientToPx(e.clientX, e.clientY)
    setGesture({ t: 'resize', elType, id: el.id, handle, ox: el.x, oy: el.y, ow: el.w, oh: el.h, nx: el.x, ny: el.y, nw: el.w, nh: el.h })
  }
  const beginWallEnd = (e: React.PointerEvent, wall: any, end: 1 | 2) => {
    e.stopPropagation()
    containerRef.current?.setPointerCapture(e.pointerId)
    setGesture({ t: 'wall-end', id: wall.id, end, x: end === 1 ? wall.x1 : wall.x2, y: end === 1 ? wall.y1 : wall.y2 })
  }

  const zoomBy = (f: number) => { setSmooth(true); setZoom(clamp(zoom * f, 0.6, 8)) }
  const reset = () => { setSmooth(true); setZoom(1); setPan({ x: 0, y: 0 }) }

  const markerR = plan.markerR ?? 8
  const selectInteractive = editing && tool === 'select'

  // grid lines (every 5 ft) in edit mode
  const gridLines: React.ReactNode[] = []
  if (editing) {
    const step = ppf * 5
    for (let gx = 0; gx <= plan.vbw; gx += step) gridLines.push(<line key={`gx${gx}`} x1={gx} y1={0} x2={gx} y2={plan.vbh} stroke="rgb(var(--c-border))" strokeWidth={0.6 * s} opacity={0.5} />)
    for (let gy = 0; gy <= plan.vbh; gy += step) gridLines.push(<line key={`gy${gy}`} x1={0} y1={gy} x2={plan.vbw} y2={gy} stroke="rgb(var(--c-border))" strokeWidth={0.6 * s} opacity={0.5} />)
  }

  const selRoom = selection?.type === 'room' ? plan.rooms.find((r) => r.id === selection.id) : undefined
  const selFurn = selection?.type === 'furniture' ? plan.furniture.find((f) => f.id === selection.id) : undefined
  const selWall = selection?.type === 'wall' ? plan.walls.find((w) => w.id === selection.id) : undefined
  const selDoor = selection?.type === 'door' ? plan.doors.find((d) => d.id === selection.id) : undefined

  // preview rect for move/resize/create of a rect element
  const previewRect = (() => {
    if (!gesture) return null
    if (gesture.t === 'move' && (gesture.elType === 'room' || gesture.elType === 'furniture')) {
      const base = gesture.elType === 'room' ? selRoom : selFurn
      if (base) return { x: gesture.ox + gesture.dx, y: gesture.oy + gesture.dy, w: base.w, h: base.h }
    }
    if (gesture.t === 'resize') return { x: gesture.nx, y: gesture.ny, w: gesture.nw, h: gesture.nh }
    if (gesture.t === 'create' && (gesture.tool === 'room' || gesture.tool === 'furniture')) {
      return { x: Math.min(gesture.x0, gesture.x1), y: Math.min(gesture.y0, gesture.y1), w: Math.abs(gesture.x1 - gesture.x0), h: Math.abs(gesture.y1 - gesture.y0) }
    }
    return null
  })()
  const previewLine = (() => {
    if (!gesture) return null
    if (gesture.t === 'create' && (gesture.tool === 'wall' || gesture.tool === 'measure')) return { x1: gesture.x0, y1: gesture.y0, x2: gesture.x1, y2: gesture.y1 }
    if (gesture.t === 'move' && gesture.elType === 'wall' && selWall) return { x1: selWall.x1 + gesture.dx, y1: selWall.y1 + gesture.dy, x2: selWall.x2 + gesture.dx, y2: selWall.y2 + gesture.dy }
    if (gesture.t === 'wall-end' && selWall) return gesture.end === 1 ? { x1: gesture.x, y1: gesture.y, x2: selWall.x2, y2: selWall.y2 } : { x1: selWall.x1, y1: selWall.y1, x2: gesture.x, y2: gesture.y }
    return null
  })()

  const cursor = editing
    ? tool === 'select'
      ? drag.current ? 'grabbing' : 'default'
      : 'crosshair'
    : drag.current ? 'grabbing' : 'grab'

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl bg-bg grid-bg touch-none"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { onPointerUp(); setHover(null) }}
      style={{ cursor }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: plan.vbw,
          height: plan.vbh,
          transform: `translate(${originX}px, ${originY}px) scale(${k})`,
          transformOrigin: '0 0',
          transition: smooth ? 'transform 0.55s cubic-bezier(0.22,1,0.36,1)' : 'none',
        }}
      >
        <div className="absolute inset-0">
          <FloorSVG
            plan={plan}
            seats={seats}
            editing={editing}
            hoveredRoomId={roomHover?.room.id ?? null}
            onRoomHover={(room, e) => (editing ? null : setRoomHover(room && e ? { room, x: e.clientX, y: e.clientY } : null))}
          />
        </div>

        {/* editor grid + element hit/selection overlay */}
        {editing && (
          <svg viewBox={`0 0 ${plan.vbw} ${plan.vbh}`} width={plan.vbw} height={plan.vbh} className="absolute inset-0 overflow-visible" style={{ pointerEvents: 'none' }}>
            <g style={{ pointerEvents: 'none' }}>{gridLines}</g>

            {/* hit targets (select tool only) */}
            {selectInteractive && (
              <g>
                {plan.rooms.map((r) => (
                  <rect key={r.id} data-elem x={r.x} y={r.y} width={r.w} height={r.h} fill="transparent" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => beginElemMove(e, 'room', r)} />
                ))}
                {plan.furniture.map((f) => (
                  <rect key={f.id} data-elem x={f.x} y={f.y} width={f.w} height={f.h} fill="transparent" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => beginElemMove(e, 'furniture', f)} />
                ))}
                {plan.walls.map((w) => (
                  <line key={w.id} data-elem x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="transparent" strokeWidth={Math.max(10 * s, 8)} style={{ pointerEvents: 'stroke', cursor: 'move' }} onPointerDown={(e) => beginElemMove(e, 'wall', w)} />
                ))}
                {plan.doors.map((d) => (
                  <circle key={d.id} data-elem cx={d.x} cy={d.y} r={Math.max(9 * s, 7)} fill="transparent" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => beginElemMove(e, 'door', d)} />
                ))}
              </g>
            )}

            {/* selection outline + handles */}
            {(selRoom || selFurn) && (() => {
              const el = (selRoom || selFurn)!
              const activeForEl = !!gesture && (('id' in gesture && gesture.id === el.id) || gesture.t === 'create')
              const box = previewRect && activeForEl ? previewRect : { x: el.x, y: el.y, w: el.w, h: el.h }
              return (
                <g>
                  <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="rgb(var(--c-brand))" strokeWidth={1.6 * s} />
                  {selectInteractive && HANDLES.map((h) => {
                    const p = handlePos(box, h)
                    return <rect key={h} data-handle x={p.x - 4 * s} y={p.y - 4 * s} width={8 * s} height={8 * s} fill="#fff" stroke="rgb(var(--c-brand))" strokeWidth={1.4 * s} style={{ pointerEvents: 'all', cursor: handleCursor[h] }} onPointerDown={(e) => beginResize(e, selRoom ? 'room' : 'furniture', el, h)} />
                  })}
                  <DimLabels box={box} ppf={ppf} s={s} />
                </g>
              )
            })()}

            {/* wall selection + endpoint handles */}
            {selWall && (() => {
              const w = previewLine ?? { x1: selWall.x1, y1: selWall.y1, x2: selWall.x2, y2: selWall.y2 }
              return (
                <g>
                  <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="rgb(var(--c-brand))" strokeWidth={2 * s} strokeDasharray={`${4 * s} ${3 * s}`} />
                  {selectInteractive && ([1, 2] as const).map((end) => {
                    const px = end === 1 ? w.x1 : w.x2, py = end === 1 ? w.y1 : w.y2
                    return <circle key={end} data-handle cx={px} cy={py} r={4.5 * s} fill="#fff" stroke="rgb(var(--c-brand))" strokeWidth={1.4 * s} style={{ pointerEvents: 'all', cursor: 'crosshair' }} onPointerDown={(e) => beginWallEnd(e, selWall, end)} />
                  })}
                  <text x={(w.x1 + w.x2) / 2} y={(w.y1 + w.y2) / 2 - 6 * s} textAnchor="middle" fontSize={11 * s} fontWeight={700} fill="rgb(var(--c-brand))" style={{ pointerEvents: 'none' }}>
                    {formatFtIn(Math.hypot(w.x2 - w.x1, w.y2 - w.y1), ppf)}
                  </text>
                </g>
              )
            })()}

            {/* door selection ring */}
            {selDoor && <circle cx={selDoor.x} cy={selDoor.y} r={9 * s} fill="none" stroke="rgb(var(--c-brand))" strokeWidth={1.6 * s} />}

            {/* live preview for create wall/measure */}
            {previewLine && (gesture?.t === 'create') && (
              <g style={{ pointerEvents: 'none' }}>
                <line x1={previewLine.x1} y1={previewLine.y1} x2={previewLine.x2} y2={previewLine.y2} stroke={gesture.tool === 'measure' ? 'rgb(var(--c-notice))' : WALL_META[wallType].color} strokeWidth={2.4 * s} strokeDasharray={`${4 * s} ${3 * s}`} />
                <text x={(previewLine.x1 + previewLine.x2) / 2} y={(previewLine.y1 + previewLine.y2) / 2 - 6 * s} textAnchor="middle" fontSize={12 * s} fontWeight={700} fill={gesture.tool === 'measure' ? 'rgb(var(--c-notice))' : 'rgb(var(--c-brand))'}>
                  {formatFtIn(Math.hypot(previewLine.x2 - previewLine.x1, previewLine.y2 - previewLine.y1), ppf)}
                </text>
              </g>
            )}
            {/* create-rect preview dims */}
            {previewRect && gesture?.t === 'create' && (gesture.tool === 'room' || gesture.tool === 'furniture') && (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={previewRect.x} y={previewRect.y} width={previewRect.w} height={previewRect.h} fill="rgb(var(--c-brand))" opacity={0.12} stroke="rgb(var(--c-brand))" strokeWidth={1.4 * s} strokeDasharray={`${4 * s} ${3 * s}`} />
                <DimLabels box={previewRect} ppf={ppf} s={s} />
              </g>
            )}

            {/* persisted measure result */}
            {measure && !gesture && (
              <g style={{ pointerEvents: 'none' }}>
                <line x1={measure.x0} y1={measure.y0} x2={measure.x1} y2={measure.y1} stroke="rgb(var(--c-notice))" strokeWidth={1.8 * s} />
                <circle cx={measure.x0} cy={measure.y0} r={2.6 * s} fill="rgb(var(--c-notice))" />
                <circle cx={measure.x1} cy={measure.y1} r={2.6 * s} fill="rgb(var(--c-notice))" />
                <text x={(measure.x0 + measure.x1) / 2} y={(measure.y0 + measure.y1) / 2 - 6 * s} textAnchor="middle" fontSize={12 * s} fontWeight={700} fill="rgb(var(--c-notice))">
                  {formatFtIn(Math.hypot(measure.x1 - measure.x0, measure.y1 - measure.y0), ppf)}
                </text>
              </g>
            )}
          </svg>
        )}

        {/* seat marker overlay */}
        <svg viewBox={`0 0 ${plan.vbw} ${plan.vbh}`} width={plan.vbw} height={plan.vbh} className="absolute inset-0 overflow-visible" style={{ pointerEvents: 'none' }}>
          {[...seats]
            .sort((a, b) => rank(a, selectedId, hover?.seat.id) - rank(b, selectedId, hover?.seat.id))
            .map((seat) => {
              const m = SEAT_STATUS[seat.status]
              const dragging = seatDrag?.seatId === seat.id
              const cx = (dragging ? seatDrag!.x : seat.x) * plan.vbw
              const cy = (dragging ? seatDrag!.y : seat.y) * plan.vbh
              const selected = editing ? selection?.type === 'seat' && selection.id === seat.id : seat.id === selectedId
              const hovered = hover?.seat.id === seat.id
              const dim = dimUnmatched ? !dimUnmatched.has(seat.id) : false
              const isVacant = seat.status === 'vacant'
              const emp = employees.find((e) => e.id === seat.employeeId)
              const r = hovered ? markerR * 1.32 : markerR
              const seatInteractive = editing ? tool === 'select' || tool === 'seat' : true
              return (
                <g
                  key={seat.id}
                  data-seat
                  transform={`translate(${cx}, ${cy})`}
                  style={{
                    cursor: editing ? (dragging ? 'grabbing' : 'grab') : 'pointer',
                    pointerEvents: seatInteractive ? 'auto' : 'none',
                    opacity: dim ? 0.18 : 1,
                    transition: dragging ? 'none' : 'opacity 0.3s',
                    filter: hovered || dragging ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.45))' : undefined,
                  }}
                  onPointerDown={
                    editing && tool === 'select'
                      ? (e) => {
                          e.stopPropagation()
                          containerRef.current?.setPointerCapture(e.pointerId)
                          setSmooth(false)
                          setHover(null)
                          setSeatDrag({ seatId: seat.id, x: seat.x, y: seat.y, moved: false })
                        }
                      : undefined
                  }
                  onClick={(e) => { e.stopPropagation(); if (!editing) onSelect(seat) }}
                  onPointerEnter={(e) => { if (!editing) setHover({ seat, x: e.clientX, y: e.clientY }) }}
                  onPointerMove={(e) => setHover((h) => (h && h.seat.id === seat.id ? { ...h, x: e.clientX, y: e.clientY } : h))}
                  onPointerLeave={() => setHover(null)}
                >
                  {editing && <circle r={markerR + 4.5} style={{ fill: 'none', stroke: m.fill, pointerEvents: 'none' }} strokeWidth={1.2} strokeDasharray="2 3" opacity={selected ? 0 : 0.55} />}
                  {selected && <circle r={markerR + 7} style={{ fill: 'none', stroke: m.fill, transformBox: 'fill-box', transformOrigin: 'center' }} strokeWidth={2.5} className="animate-pulse-ring" />}
                  {selected && <circle r={markerR + 5} style={{ fill: 'none', stroke: m.fill }} strokeWidth={2} opacity={0.9} />}
                  {hovered && !selected && <circle r={markerR + 3.5} style={{ fill: 'none', stroke: m.fill }} strokeWidth={1.5} opacity={0.5} />}
                  <circle r={r} style={{ fill: isVacant ? 'rgb(var(--c-surface))' : m.fill, stroke: isVacant ? m.fill : '#fff' }} strokeWidth={isVacant ? 2.4 : 1.6} className="transition-all duration-150" />
                  {markerGlyph(seat, r)}
                  {emp && (
                    <text textAnchor="middle" dominantBaseline="central" y={0.5} style={{ fill: '#fff', pointerEvents: 'none' }} fontSize={r * 0.82} fontWeight={700} className="font-sans transition-all duration-150">
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
        <Locate className="h-3.5 w-3.5" /> {Math.round(zoom * 100)}% · {editing ? `${plan.pxPerFoot.toFixed(1)} px/ft${gridSnap ? ' · snap 6″' : ''}` : 'scroll to zoom · drag to pan'}
      </div>

      {/* seat tooltip (view mode) */}
      {hover && !editing && (
        <div className="pointer-events-none fixed z-50 w-max max-w-[220px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-border bg-surface p-2.5 shadow-pop" style={{ left: hover.x, top: hover.y }}>
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', SEAT_STATUS[hover.seat.status].dot)} />
            <span className="text-sm font-semibold text-content">Seat {hover.seat.seatNumber}</span>
            <span className={cn('chip px-1.5 py-0.5 text-2xs', SEAT_STATUS[hover.seat.status].bg, SEAT_STATUS[hover.seat.status].text)}>{SEAT_STATUS[hover.seat.status].label}</span>
          </div>
          {(() => {
            const emp = employees.find((e) => e.id === hover.seat.employeeId)
            return emp ? <p className="mt-1 text-xs text-muted">{emp.fullName} · {emp.designation}</p> : <p className="mt-1 text-xs text-muted">{hover.seat.zone} · {hover.seat.seatType}</p>
          })()}
        </div>
      )}

      {roomHover && !hover && !editing && (
        <div className="pointer-events-none fixed z-50 w-max max-w-[240px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-border bg-surface p-2.5 shadow-pop" style={{ left: roomHover.x, top: roomHover.y }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-content">{roomHover.room.label}</span>
            <span className="chip bg-brand-soft px-1.5 py-0.5 text-2xs text-brand">{ROOM_KIND_LABEL[roomHover.room.kind] ?? 'Space'}</span>
          </div>
          {roomHover.room.sub && <p className="mt-1 text-xs text-muted">{roomHover.room.sub}</p>}
        </div>
      )}
    </div>
  )
}

function DimLabels({ box, ppf, s }: { box: { x: number; y: number; w: number; h: number }; ppf: number; s: number }) {
  return (
    <g style={{ pointerEvents: 'none' }} fontWeight={700} fill="rgb(var(--c-brand))">
      <text x={box.x + box.w / 2} y={box.y - 5 * s} textAnchor="middle" fontSize={11 * s}>{formatFtIn(box.w, ppf)}</text>
      <text x={box.x - 5 * s} y={box.y + box.h / 2} textAnchor="middle" fontSize={11 * s} transform={`rotate(-90 ${box.x - 5 * s} ${box.y + box.h / 2})`}>{formatFtIn(box.h, ppf)}</text>
    </g>
  )
}

const ROOM_KIND_LABEL: Record<string, string> = {
  meeting: 'Meeting room', office: 'Office', service: 'Facility', reception: 'Reception',
  open: 'Open workspace', balcony: 'Balcony', collab: 'Collaboration', training: 'Training room',
  courtyard: 'Courtyard', cabin: 'Cabin',
}
