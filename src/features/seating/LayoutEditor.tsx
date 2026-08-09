import {
  MousePointer2, Square, PenLine, DoorOpen, Armchair, CircleDot, Ruler,
  Trash2, RotateCw, FlipHorizontal2, Grid3x3, Layers3, Table2,
} from 'lucide-react'
import { useData } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Seat, SeatType } from '@/lib/types'
import type { RoomKind } from './floorplans'
import {
  WALL_META, DOOR_META, FURNITURE_META, FURNITURE_ORDER, ROOM_META, ROOM_ORDER,
  formatFtIn, roomAreaSqFt,
  type FloorPlan, type Selection, type EditorTool, type WallType, type DoorType, type FurnitureKind,
} from './layout'

const SEAT_TYPES: SeatType[] = ['workstation', 'cabin', 'meeting', 'hotdesk', 'phonebooth']

const TOOLS: { tool: EditorTool; icon: typeof Square; label: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select / move' },
  { tool: 'room', icon: Square, label: 'Room' },
  { tool: 'wall', icon: PenLine, label: 'Wall' },
  { tool: 'door', icon: DoorOpen, label: 'Door' },
  { tool: 'furniture', icon: Armchair, label: 'Furniture' },
  { tool: 'seat', icon: CircleDot, label: 'Seat' },
  { tool: 'measure', icon: Ruler, label: 'Measure' },
]

interface Opts {
  roomKind: RoomKind
  setRoomKind: (k: RoomKind) => void
  wallType: WallType
  setWallType: (t: WallType) => void
  doorType: DoorType
  setDoorType: (t: DoorType) => void
  furnitureKind: FurnitureKind
  setFurnitureKind: (k: FurnitureKind) => void
}

export function ToolPalette({
  tool, setTool, gridSnap, setGridSnap, opts,
}: {
  tool: EditorTool
  setTool: (t: EditorTool) => void
  gridSnap: boolean
  setGridSnap: (v: boolean) => void
  opts: Opts
}) {
  return (
    <div className="card p-3">
      <p className="section-title mb-2">Tools</p>
      <div className="grid grid-cols-4 gap-1.5">
        {TOOLS.map(({ tool: t, icon: Icon, label }) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            title={label}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] font-medium transition-colors',
              tool === t ? 'border-brand bg-brand text-white shadow-sm' : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-content',
            )}
          >
            <Icon className="h-4 w-4" />
            {label.split(' ')[0]}
          </button>
        ))}
        <button
          onClick={() => setGridSnap(!gridSnap)}
          title="Snap to grid"
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] font-medium transition-colors',
            gridSnap ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-content',
          )}
        >
          <Grid3x3 className="h-4 w-4" />
          Snap
        </button>
      </div>

      {/* contextual options */}
      {tool === 'room' && (
        <OptGroup label="Room type">
          {ROOM_ORDER.map((k) => (
            <Chip key={k} active={opts.roomKind === k} onClick={() => opts.setRoomKind(k)}>{ROOM_META[k].label}</Chip>
          ))}
        </OptGroup>
      )}
      {tool === 'wall' && (
        <OptGroup label="Partition type">
          {(Object.keys(WALL_META) as WallType[]).map((t) => (
            <Chip key={t} active={opts.wallType === t} onClick={() => opts.setWallType(t)}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: WALL_META[t].color }} />
              {WALL_META[t].short}
            </Chip>
          ))}
        </OptGroup>
      )}
      {tool === 'door' && (
        <OptGroup label="Door type">
          {(Object.keys(DOOR_META) as DoorType[]).map((t) => (
            <Chip key={t} active={opts.doorType === t} onClick={() => opts.setDoorType(t)}>{DOOR_META[t].label}</Chip>
          ))}
        </OptGroup>
      )}
      {tool === 'furniture' && (
        <OptGroup label="Furniture">
          {FURNITURE_ORDER.map((k) => (
            <Chip key={k} active={opts.furnitureKind === k} onClick={() => opts.setFurnitureKind(k)}>{FURNITURE_META[k].label}</Chip>
          ))}
        </OptGroup>
      )}
      <p className="mt-3 text-2xs leading-relaxed text-subtle">
        {tool === 'select' && 'Click any element to select. Drag to move; use handles to resize.'}
        {tool === 'room' && 'Drag on the plan to draw a room, or click for a default size.'}
        {tool === 'wall' && 'Drag to draw a partition wall at real thickness.'}
        {tool === 'door' && 'Click to drop a door; rotate it in Properties.'}
        {tool === 'furniture' && 'Click to place; drag to size it as you drop.'}
        {tool === 'seat' && 'Click anywhere to add a workstation seat.'}
        {tool === 'measure' && 'Drag between two points to measure a distance.'}
      </p>
    </div>
  )
}

function OptGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-subtle">{label}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md border px-1.5 py-1 text-[11px] font-medium transition-colors',
        active ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-content',
      )}
    >
      {children}
    </button>
  )
}

// ── properties panel for the selected element ────────────────────────────────
export function PropertiesPanel({
  floorId, plan, selection, seats, onClear,
}: {
  floorId: string
  plan: FloorPlan
  selection: Selection | null
  seats: Seat[]
  onClear: () => void
}) {
  const store = useData()
  const ppf = plan.pxPerFoot
  if (!selection) {
    return (
      <div className="card p-3.5">
        <p className="section-title mb-1">Properties</p>
        <p className="text-xs text-muted">Select an element on the plan to edit its size, type, and label.</p>
      </div>
    )
  }

  const field = 'flex flex-col gap-1'
  const lbl = 'text-2xs font-medium text-muted'
  const del = (
    <button
      onClick={() => {
        if (selection.type === 'room') store.removeRoom(floorId, selection.id)
        else if (selection.type === 'furniture') store.removeFurniture(floorId, selection.id)
        else if (selection.type === 'wall') store.removeWall(floorId, selection.id)
        else if (selection.type === 'door') store.removeDoor(floorId, selection.id)
        else if (selection.type === 'seat') store.removeSeat(selection.id)
        onClear()
      }}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-danger/40 bg-danger-soft px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger hover:text-white"
    >
      <Trash2 className="h-3.5 w-3.5" /> Delete {selection.type}
    </button>
  )

  let body: React.ReactNode = null

  if (selection.type === 'room') {
    const r = plan.rooms.find((x) => x.id === selection.id)
    if (!r) return null
    body = (
      <>
        <label className={field}><span className={lbl}>Label</span><input className="input h-8 text-sm" value={r.label} onChange={(e) => store.updateRoom(floorId, r.id, { label: e.target.value })} /></label>
        <label className={field}><span className={lbl}>Sub-label</span><input className="input h-8 text-sm" value={r.sub ?? ''} placeholder="e.g. 23′-6″ × 12′-9″" onChange={(e) => store.updateRoom(floorId, r.id, { sub: e.target.value })} /></label>
        <label className={field}>
          <span className={lbl}>Type</span>
          <select className="input h-8 text-sm" value={r.kind} onChange={(e) => store.updateRoom(floorId, r.id, { kind: e.target.value as RoomKind })}>
            {ROOM_ORDER.map((k) => <option key={k} value={k}>{ROOM_META[k].label}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <FtInput label="Width" px={r.w} ppf={ppf} onCommit={(px) => store.updateRoom(floorId, r.id, { w: px })} />
          <FtInput label="Depth" px={r.h} ppf={ppf} onCommit={(px) => store.updateRoom(floorId, r.id, { h: px })} />
        </div>
        <Readout label="Area" value={`${Math.round(roomAreaSqFt(r, ppf)).toLocaleString()} sq ft`} />
      </>
    )
  } else if (selection.type === 'furniture') {
    const f = plan.furniture.find((x) => x.id === selection.id)
    if (!f) return null
    body = (
      <>
        <label className={field}>
          <span className={lbl}>Kind</span>
          <select className="input h-8 text-sm" value={f.kind} onChange={(e) => store.updateFurniture(floorId, f.id, { kind: e.target.value as FurnitureKind })}>
            {FURNITURE_ORDER.map((k) => <option key={k} value={k}>{FURNITURE_META[k].label}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <FtInput label="Width" px={f.w} ppf={ppf} onCommit={(px) => store.updateFurniture(floorId, f.id, { w: px })} />
          <FtInput label="Depth" px={f.h} ppf={ppf} onCommit={(px) => store.updateFurniture(floorId, f.id, { h: px })} />
        </div>
        <div className="flex items-center gap-2">
          <span className={lbl}>Rotate</span>
          <button className="btn-ghost h-7 px-2 text-xs" onClick={() => store.updateFurniture(floorId, f.id, { rot: ((f.rot ?? 0) + 15) % 360 })}><RotateCw className="h-3.5 w-3.5" /></button>
          <span className="text-2xs text-muted">{f.rot ?? 0}°</span>
        </div>
      </>
    )
  } else if (selection.type === 'wall') {
    const w = plan.walls.find((x) => x.id === selection.id)
    if (!w) return null
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1)
    body = (
      <>
        <label className={field}>
          <span className={lbl}>Partition type</span>
          <select className="input h-8 text-sm" value={w.type} onChange={(e) => store.updateWall(floorId, w.id, { type: e.target.value as WallType })}>
            {(Object.keys(WALL_META) as WallType[]).map((t) => <option key={t} value={t}>{WALL_META[t].label}</option>)}
          </select>
        </label>
        <Readout label="Length" value={formatFtIn(len, ppf)} />
        <Readout label="Thickness" value={`${WALL_META[w.type].thicknessIn}″`} />
      </>
    )
  } else if (selection.type === 'door') {
    const d = plan.doors.find((x) => x.id === selection.id)
    if (!d) return null
    body = (
      <>
        <label className={field}>
          <span className={lbl}>Door type</span>
          <select className="input h-8 text-sm" value={d.type} onChange={(e) => store.updateDoor(floorId, d.id, { type: e.target.value as DoorType, w: DOOR_META[e.target.value as DoorType].widthFt * ppf })}>
            {(Object.keys(DOOR_META) as DoorType[]).map((t) => <option key={t} value={t}>{DOOR_META[t].label}</option>)}
          </select>
        </label>
        <FtInput label="Width" px={d.w} ppf={ppf} onCommit={(px) => store.updateDoor(floorId, d.id, { w: px })} />
        <div className="flex items-center gap-2">
          <span className={lbl}>Swing</span>
          <button className="btn-ghost h-7 px-2 text-xs" onClick={() => store.updateDoor(floorId, d.id, { angle: ((d.angle ?? 0) + 15) % 360 })}><RotateCw className="h-3.5 w-3.5" /></button>
          <button className="btn-ghost h-7 px-2 text-xs" onClick={() => store.updateDoor(floorId, d.id, { flip: !d.flip })}><FlipHorizontal2 className="h-3.5 w-3.5" /></button>
          <span className="text-2xs text-muted">{d.angle}°</span>
        </div>
      </>
    )
  } else if (selection.type === 'seat') {
    const st = seats.find((x) => x.id === selection.id)
    if (!st) return null
    body = (
      <>
        <label className={field}><span className={lbl}>Seat number</span><input className="input h-8 text-sm" value={st.seatNumber} onChange={(e) => store.updateSeatMeta(st.id, { seatNumber: e.target.value })} /></label>
        <label className={field}>
          <span className={lbl}>Type</span>
          <select className="input h-8 text-sm capitalize" value={st.seatType} onChange={(e) => store.updateSeatMeta(st.id, { seatType: e.target.value as SeatType })}>
            {SEAT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className={field}><span className={lbl}>Zone</span><input className="input h-8 text-sm" value={st.zone} onChange={(e) => store.updateSeatMeta(st.id, { zone: e.target.value })} /></label>
      </>
    )
  }

  return (
    <div className="card space-y-2.5 p-3.5">
      <div className="flex items-center justify-between">
        <p className="section-title capitalize">{selection.type}</p>
        <span className="chip bg-brand-soft px-1.5 py-0.5 text-2xs text-brand">selected</span>
      </div>
      {body}
      {del}
    </div>
  )
}

function FtInput({ label, px, ppf, onCommit }: { label: string; px: number; ppf: number; onCommit: (px: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-2xs font-medium text-muted">{label} (ft)</span>
      <input
        type="number"
        step={0.5}
        min={0.5}
        className="input h-8 text-sm"
        defaultValue={(px / ppf).toFixed(1)}
        key={px.toFixed(2)}
        onBlur={(e) => { const ft = parseFloat(e.target.value); if (!isNaN(ft) && ft > 0) onCommit(ft * ppf) }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      />
    </label>
  )
}
function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5">
      <span className="text-2xs font-medium text-muted">{label}</span>
      <span className="text-xs font-semibold text-content">{value}</span>
    </div>
  )
}

// ── auto area schedule (mirrors the drawing's schedule) ──────────────────────
export function AreaSchedule({ plan, seats }: { plan: FloorPlan; seats: Seat[] }) {
  const roomGroups = new Map<RoomKind, { count: number; area: number }>()
  let totalArea = 0
  for (const r of plan.rooms) {
    const g = roomGroups.get(r.kind) ?? { count: 0, area: 0 }
    const a = roomAreaSqFt(r, plan.pxPerFoot)
    g.count += 1
    g.area += a
    totalArea += a
    roomGroups.set(r.kind, g)
  }
  const furnCounts = new Map<FurnitureKind, number>()
  for (const f of plan.furniture) furnCounts.set(f.kind, (furnCounts.get(f.kind) ?? 0) + 1)

  return (
    <div className="card p-3.5">
      <p className="section-title mb-2 flex items-center gap-1.5"><Table2 className="h-3.5 w-3.5" /> Area schedule</p>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xs text-muted">Built-up area</span>
        <span className="text-lg font-semibold text-content">{Math.round(totalArea).toLocaleString()} <span className="text-xs text-muted">sq ft</span></span>
      </div>
      <table className="w-full text-2xs">
        <thead>
          <tr className="text-subtle">
            <th className="pb-1 text-left font-medium">Space</th>
            <th className="pb-1 text-right font-medium">No.</th>
            <th className="pb-1 text-right font-medium">Area</th>
          </tr>
        </thead>
        <tbody>
          {[...roomGroups.entries()].map(([kind, g]) => (
            <tr key={kind} className="border-t border-border/60">
              <td className="py-1 text-content">{ROOM_META[kind].label}</td>
              <td className="py-1 text-right text-muted">{g.count}</td>
              <td className="py-1 text-right text-muted">{Math.round(g.area).toLocaleString()}</td>
            </tr>
          ))}
          {seats.length > 0 && (
            <tr className="border-t border-border/60">
              <td className="py-1 text-content">Seats</td>
              <td className="py-1 text-right text-muted">{seats.length}</td>
              <td className="py-1 text-right text-subtle">—</td>
            </tr>
          )}
          {[...furnCounts.entries()].map(([kind, n]) => (
            <tr key={kind} className="border-t border-border/60">
              <td className="py-1 text-content">{FURNITURE_META[kind].label}</td>
              <td className="py-1 text-right text-muted">{n}</td>
              <td className="py-1 text-right text-subtle">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── legend of partition + door types ─────────────────────────────────────────
export function PlanLegend() {
  return (
    <div className="card p-3.5">
      <p className="section-title mb-2 flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5" /> Legend</p>
      <div className="space-y-1.5">
        {(Object.keys(WALL_META) as WallType[]).map((t) => (
          <div key={t} className="flex items-center gap-2">
            <span className="h-1.5 w-6 rounded-full" style={{ background: WALL_META[t].color }} />
            <span className="text-2xs text-muted">{WALL_META[t].label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
