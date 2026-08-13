import type { RoomShape } from './floorplans'
import type { FloorPlan, Wall, Door, FurnitureItem } from './layout'
import { WALL_META } from './layout'
import type { Seat } from '@/lib/types'

// Pure vector rendering of an editable floor plan: floor plate + exterior wall,
// corridors, rooms (with procedural furniture per kind), typed partition walls,
// doors with swing arcs, and user-placed furniture. All interaction (select /
// drag / resize) is layered on top by FloorCanvas — this component only draws.

const WALL = 'rgb(var(--c-text-muted))'
const WALL_IN = 'rgb(var(--c-border-strong))'
const FLOOR = 'rgb(var(--c-surface-2))'
const CORRIDOR = 'rgb(var(--c-surface-3))'

const roomFill: Record<string, string> = {
  courtyard: 'rgb(var(--c-surface))',
  meeting: 'rgb(var(--c-brand-soft))',
  service: 'rgb(var(--c-surface))',
  reception: 'rgb(var(--c-surface))',
  open: 'rgb(var(--c-surface))',
  balcony: 'rgb(var(--c-surface))',
  collab: 'rgb(var(--c-brand-soft))',
  training: 'rgb(var(--c-surface))',
  office: 'rgb(var(--c-brand-soft))',
  cabin: 'rgb(var(--c-surface))',
}

function MeetingTable({ room }: { room: RoomShape }) {
  const mx = 14
  const tableX = room.x + mx
  const tableW = room.w - mx * 2
  const tableY = room.y + room.h * 0.58
  const maxPerSide = Math.max(1, Math.floor(tableW / 13))
  const perSide = Math.min(Math.ceil((room.chairs ?? 6) / 2), maxPerSide)
  const seats = []
  for (let i = 0; i < perSide; i++) {
    const cx = tableX + (tableW / perSide) * (i + 0.5)
    seats.push(<circle key={`t${i}`} cx={cx} cy={tableY - 8} r={4} style={{ fill: 'rgb(var(--c-surface-2))', stroke: WALL_IN }} strokeWidth={0.9} />)
    seats.push(<circle key={`b${i}`} cx={cx} cy={tableY + 20} r={4} style={{ fill: 'rgb(var(--c-surface-2))', stroke: WALL_IN }} strokeWidth={0.9} />)
  }
  return (
    <g style={{ pointerEvents: 'none' }}>
      {seats}
      <rect x={tableX} y={tableY} width={tableW} height={12} rx={6} style={{ fill: 'rgb(var(--c-surface-2))', stroke: WALL_IN }} strokeWidth={1.1} />
    </g>
  )
}

function TrainingRoom({ room }: { room: RoomShape }) {
  const chairs = []
  const cols = 4
  const rows = 5
  const gx = room.x + 76
  const gy = room.y + 44
  const gw = room.w - 96
  const gh = room.h - 66
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      chairs.push(
        <circle key={`${r}-${c}`} cx={gx + (gw / (cols - 1)) * c} cy={gy + (gh / (rows - 1)) * r} r={5}
          style={{ fill: 'rgb(var(--c-surface-2))', stroke: WALL_IN }} strokeWidth={1} />,
      )
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={room.x + 16} y={room.y + 40} width={10} height={room.h - 68} rx={3} style={{ fill: 'rgb(var(--c-brand))' }} opacity={0.7} />
      {chairs}
    </g>
  )
}

function ExecOffice({ room }: { room: RoomShape }) {
  const cx = room.x + room.w / 2
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={cx - 56} y={room.y + 54} width={112} height={38} rx={5} style={{ fill: 'rgb(var(--c-surface-2))', stroke: WALL_IN }} strokeWidth={1.2} />
      <circle cx={cx} cy={room.y + 112} r={8} style={{ fill: 'rgb(var(--c-surface))', stroke: WALL_IN }} strokeWidth={1.2} />
      <rect x={room.x + 22} y={room.y + room.h - 60} width={66} height={40} rx={8} style={{ fill: 'rgb(var(--c-surface-2))', stroke: WALL_IN }} strokeWidth={1.1} />
      <rect x={room.x + room.w - 88} y={room.y + room.h - 60} width={66} height={40} rx={8} style={{ fill: 'rgb(var(--c-surface-2))', stroke: WALL_IN }} strokeWidth={1.1} />
    </g>
  )
}

function Courtyard({ room }: { room: RoomShape }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={room.x + 10} y={room.y + 28} width={room.w - 20} height={room.h - 40} rx={6} fill="url(#hatch)" opacity={0.5} />
      {[0.26, 0.5, 0.74].map((fx, i) =>
        [0.42, 0.72].map((fy, j) => (
          <circle key={`g${i}${j}`} cx={room.x + room.w * fx} cy={room.y + room.h * fy} r={9} style={{ fill: 'rgb(var(--c-vacant))' }} opacity={0.32} />
        )),
      )}
    </g>
  )
}

function CabinDesk({ room }: { room: RoomShape }) {
  return (
    <rect x={room.x + room.w / 2 - 15} y={room.y + room.h - 22} width={30} height={11} rx={2} style={{ fill: 'rgb(var(--c-surface-2))', stroke: WALL_IN, pointerEvents: 'none' }} strokeWidth={0.9} />
  )
}

function Desk({ cx, cy, r = 8 }: { cx: number; cy: number; r?: number }) {
  const w = r * 2.9
  const h = r * 1.9
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={2.5} style={{ fill: 'rgb(var(--c-surface))', stroke: WALL_IN }} strokeWidth={0.9} />
      <rect x={cx - r * 0.55} y={cy - h / 2 + 1.5} width={r * 1.1} height={2.2} rx={1} style={{ fill: WALL_IN }} opacity={0.7} />
    </g>
  )
}

// ── typed partition wall — a colored capsule at real thickness ────────────────
function WallSeg({ wall, ppf }: { wall: Wall; ppf: number }) {
  const meta = WALL_META[wall.type]
  const thickness = Math.max(3, (meta.thicknessIn / 12) * ppf)
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2} stroke={meta.color} strokeWidth={thickness} strokeLinecap="round" opacity={0.9} />
      {wall.type === 'glass' && (
        <line x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2} stroke="#fff" strokeWidth={Math.max(1, thickness * 0.35)} strokeLinecap="round" strokeDasharray="1 6" opacity={0.8} />
      )}
    </g>
  )
}

// ── door leaf + swing arc ─────────────────────────────────────────────────────
const DOOR_COLOR: Record<string, string> = {
  wooden: '#B45309', double: '#B45309', toilet: '#B45309', glass: '#0EA5E9', sliding: '#0EA5E9',
}
function DoorGlyph({ door }: { door: FurnitureItem | Door }) {
  const d = door as Door
  const color = DOOR_COLOR[d.type] ?? '#B45309'
  const a = (d.angle * Math.PI) / 180
  const dir = d.flip ? -1 : 1
  // leaf endpoint
  const lx = d.x + Math.cos(a) * d.w
  const ly = d.y + Math.sin(a) * d.w
  // arc endpoint (swept 90° toward the wall normal)
  const na = a + (dir * Math.PI) / 2
  const ex = d.x + Math.cos(na) * d.w
  const ey = d.y + Math.sin(na) * d.w
  const sweep = dir > 0 ? 1 : 0
  if (d.type === 'sliding') {
    return (
      <g style={{ pointerEvents: 'none' }}>
        <line x1={d.x} y1={d.y} x2={lx} y2={ly} stroke={color} strokeWidth={3} strokeLinecap="round" />
        <line x1={d.x + (lx - d.x) * 0.5} y1={d.y + (ly - d.y) * 0.5} x2={ex} y2={ey} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      </g>
    )
  }
  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={`M ${lx} ${ly} A ${d.w} ${d.w} 0 0 ${sweep} ${ex} ${ey}`} fill="none" stroke={color} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.7} />
      <line x1={d.x} y1={d.y} x2={lx} y2={ly} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      {d.type === 'double' && (
        <line x1={d.x} y1={d.y} x2={d.x - Math.cos(a) * d.w} y2={d.y - Math.sin(a) * d.w} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      )}
    </g>
  )
}

// ── user-placed furniture ─────────────────────────────────────────────────────
export function FurnitureGlyph({ item }: { item: FurnitureItem }) {
  const { x, y, w, h, kind } = item
  const cx = x + w / 2
  const cy = y + h / 2
  const surf2 = 'rgb(var(--c-surface-2))'
  const surf = 'rgb(var(--c-surface))'
  const inner = (() => {
    switch (kind) {
      case 'desk':
        return (
          <>
            <rect x={x} y={y} width={w} height={h} rx={2.5} style={{ fill: surf, stroke: WALL_IN }} strokeWidth={1} />
            <circle cx={cx} cy={y + h + 4} r={Math.min(w, h) * 0.24} style={{ fill: surf2, stroke: WALL_IN }} strokeWidth={0.9} />
          </>
        )
      case 'meeting-table':
        return <rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) * 0.28} style={{ fill: surf2, stroke: WALL_IN }} strokeWidth={1.2} />
      case 'sofa':
        return (
          <g>
            <rect x={x} y={y} width={w} height={h} rx={6} style={{ fill: surf2, stroke: WALL_IN }} strokeWidth={1.1} />
            <rect x={x + 3} y={y + 3} width={w - 6} height={h * 0.5} rx={4} style={{ fill: surf, stroke: WALL_IN }} strokeWidth={0.8} />
          </g>
        )
      case 'plant':
        return <circle cx={cx} cy={cy} r={Math.min(w, h) / 2} style={{ fill: 'rgb(var(--c-vacant))', stroke: WALL_IN }} strokeWidth={1} opacity={0.5} />
      case 'toilet':
        return (
          <g>
            <rect x={x} y={y} width={w} height={h} rx={w * 0.4} style={{ fill: surf, stroke: WALL_IN }} strokeWidth={1} />
            <ellipse cx={cx} cy={y + h * 0.6} rx={w * 0.3} ry={h * 0.28} style={{ fill: surf2, stroke: WALL_IN }} strokeWidth={0.8} />
          </g>
        )
      case 'stairs': {
        const steps = Math.max(3, Math.round(w / 8))
        return (
          <g>
            <rect x={x} y={y} width={w} height={h} style={{ fill: surf, stroke: WALL_IN }} strokeWidth={1} />
            {Array.from({ length: steps }).map((_, i) => (
              <line key={i} x1={x + (w / steps) * (i + 1)} y1={y} x2={x + (w / steps) * (i + 1)} y2={y + h} stroke={WALL_IN} strokeWidth={0.8} />
            ))}
          </g>
        )
      }
      case 'screen':
        return <rect x={x} y={y} width={w} height={h} rx={2} style={{ fill: 'rgb(var(--c-brand))' }} opacity={0.75} />
      case 'reception':
        return <rect x={x} y={y} width={w} height={h} rx={h * 0.4} style={{ fill: surf2, stroke: WALL_IN }} strokeWidth={1.1} />
      case 'storage':
      default:
        return <rect x={x} y={y} width={w} height={h} rx={2} style={{ fill: surf2, stroke: WALL_IN }} strokeWidth={1} />
    }
  })()
  return (
    <g style={{ pointerEvents: 'none' }} transform={item.rot ? `rotate(${item.rot} ${cx} ${cy})` : undefined}>
      {inner}
    </g>
  )
}

// One room cell — reused by the vector floors and as an editable overlay on the
// image-backed floors (where `translucent` lets the real drawing show through).
function RoomCell({
  r, hovered, translucent, onRoomHover,
}: {
  r: RoomShape
  hovered: boolean
  translucent?: boolean
  onRoomHover?: (room: RoomShape | null, e?: React.PointerEvent) => void
}) {
  return (
    <g
      onPointerEnter={(e) => onRoomHover?.(r, e)}
      onPointerMove={(e) => onRoomHover?.(r, e)}
      onPointerLeave={() => onRoomHover?.(null)}
      style={{ cursor: 'default' }}
    >
      <rect
        x={r.x} y={r.y} width={r.w} height={r.h} rx={4}
        style={{ fill: roomFill[r.kind] ?? 'rgb(var(--c-surface))', stroke: WALL }}
        strokeWidth={2.4}
        fillOpacity={translucent ? 0.5 : 1}
      />
      {hovered && (
        <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={4} style={{ fill: 'rgb(var(--c-brand))', pointerEvents: 'none' }} opacity={0.12} />
      )}
      {r.kind === 'courtyard' && <Courtyard room={r} />}
      {(r.kind === 'meeting' || r.kind === 'collab') && r.chairs && <MeetingTable room={r} />}
      {r.kind === 'training' && <TrainingRoom room={r} />}
      {r.kind === 'office' && <ExecOffice room={r} />}
      {r.kind === 'cabin' && r.w < 120 && r.h < 130 && <CabinDesk room={r} />}
      <text x={r.x + 8} y={r.y + 17} style={{ fill: 'rgb(var(--c-text))', pointerEvents: 'none' }} fontSize={Math.max(8, Math.min(13, (r.w - 12) / (r.label.length * 0.56)))} fontWeight={650} className="font-sans">
        {r.label}
      </text>
      {r.sub && r.h >= 40 && (
        <text x={r.x + 8} y={r.y + 31} style={{ fill: 'rgb(var(--c-text-subtle))', pointerEvents: 'none' }} fontSize={Math.max(7, Math.min(10, (r.w - 12) / (r.sub.length * 0.52)))} className="font-sans">
          {r.sub}
        </text>
      )}
    </g>
  )
}

export function FloorSVG({
  plan,
  seats,
  hoveredRoomId,
  onRoomHover,
  editing = false,
}: {
  plan: FloorPlan
  seats: Seat[]
  hoveredRoomId?: string | null
  onRoomHover?: (room: RoomShape | null, e?: React.PointerEvent) => void
  editing?: boolean
}) {
  const workstations = seats.filter((s) => s.seatType === 'workstation')
  const plate = plan.plate ?? { x: 2, y: 2, w: plan.vbw - 4, h: plan.vbh - 4 }

  // Image-backed floor: the real architectural drawing is the map. Any rooms /
  // walls / doors / furniture the user draws in the editor render on top of it,
  // so the whole floor is buildable from the frontend while the exact drawing
  // stays as a reference (dimmed slightly in edit mode so overlays stand out).
  // Seat markers are drawn separately by FloorCanvas above this.
  if (plan.bg) {
    const href = `${import.meta.env.BASE_URL}${plan.bg.src}`
    return (
      <svg viewBox={`0 0 ${plan.vbw} ${plan.vbh}`} width={plan.vbw} height={plan.vbh} className="select-none">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: WALL_IN }} strokeWidth="1" opacity="0.5" />
          </pattern>
          <filter id="plateShadow" x="-4%" y="-4%" width="108%" height="112%">
            <feDropShadow dx="0" dy="10" stdDeviation="18" floodColor="#000" floodOpacity="0.16" />
          </filter>
        </defs>
        <rect x={0} y={0} width={plan.vbw} height={plan.vbh} rx={10} style={{ fill: '#fff' }} filter="url(#plateShadow)" />
        <image href={href} x={0} y={0} width={plan.vbw} height={plan.vbh} preserveAspectRatio="xMidYMid meet" opacity={editing ? 0.45 : 1} />

        {/* editable structure — shown only in edit mode so the plain view stays a
            clean, exact drawing; here they overlay the dimmed drawing to be moved. */}
        {editing && (
          <>
            {plan.rooms.map((r) => (
              <RoomCell key={r.id} r={r} hovered={hoveredRoomId === r.id} translucent onRoomHover={onRoomHover} />
            ))}
            {plan.walls.map((w) => <WallSeg key={w.id} wall={w} ppf={plan.pxPerFoot} />)}
            {plan.furniture.map((f) => <FurnitureGlyph key={f.id} item={f} />)}
            {plan.doors.map((d) => <DoorGlyph key={d.id} door={d} />)}
          </>
        )}
      </svg>
    )
  }

  return (
    <svg viewBox={`0 0 ${plan.vbw} ${plan.vbh}`} width={plan.vbw} height={plan.vbh} className="select-none">
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: WALL_IN }} strokeWidth="1" opacity="0.5" />
        </pattern>
        <filter id="plateShadow" x="-4%" y="-4%" width="108%" height="112%">
          <feDropShadow dx="0" dy="10" stdDeviation="18" floodColor="#000" floodOpacity="0.16" />
        </filter>
      </defs>

      {/* floor plate + exterior wall */}
      <rect x={plate.x} y={plate.y} width={plate.w} height={plate.h} rx={14} style={{ fill: FLOOR }} filter="url(#plateShadow)" />

      {/* corridors (walkable) */}
      {(plan.corridors ?? []).map((c, i) => (
        <g key={i} style={{ pointerEvents: 'none' }}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} style={{ fill: CORRIDOR }} />
          <line
            x1={c.dir === 'v' ? c.x + c.w / 2 : c.x + 8}
            y1={c.dir === 'v' ? c.y + 8 : c.y + c.h / 2}
            x2={c.dir === 'v' ? c.x + c.w / 2 : c.x + c.w - 8}
            y2={c.dir === 'v' ? c.y + c.h - 8 : c.y + c.h / 2}
            style={{ stroke: WALL_IN }}
            strokeWidth={1.4}
            strokeDasharray="2 9"
            opacity={0.7}
          />
        </g>
      ))}

      {/* rooms */}
      {plan.rooms.map((r) => (
        <RoomCell key={r.id} r={r} hovered={hoveredRoomId === r.id} onRoomHover={onRoomHover} />
      ))}

      {/* typed partition walls */}
      {plan.walls.map((w) => <WallSeg key={w.id} wall={w} ppf={plan.pxPerFoot} />)}

      {/* user furniture */}
      {plan.furniture.map((f) => <FurnitureGlyph key={f.id} item={f} />)}

      {/* doors */}
      {plan.doors.map((d) => <DoorGlyph key={d.id} door={d} />)}

      {/* desks under workstation markers */}
      {workstations.map((s) => (
        <Desk key={s.id} cx={s.x * plan.vbw} cy={s.y * plan.vbh} r={plan.markerR ?? 8} />
      ))}

      {/* entry markers */}
      {(plan.markers ?? []).map((m, i) => (
        <g key={i} style={{ pointerEvents: 'none' }}>
          <path d={`M ${m.x - 8} ${m.y - 10} L ${m.x + 8} ${m.y - 10} L ${m.x} ${m.y - 1} Z`} style={{ fill: 'rgb(var(--c-brand))' }} />
          <text x={m.x} y={m.y + 12} textAnchor="middle" style={{ fill: 'rgb(var(--c-text-subtle))' }} fontSize={11} fontWeight={600} letterSpacing={0.5} className="font-sans uppercase">
            {m.label}
          </text>
        </g>
      ))}

      {/* zone captions */}
      {(plan.zoneLabels ?? []).map((z, i) => (
        <text key={i} x={z.x} y={z.y} style={{ fill: 'rgb(var(--c-text-subtle))', pointerEvents: 'none' }} fontSize={12} fontWeight={600} letterSpacing={0.6} className="font-sans uppercase" opacity={0.7}>
          {z.text}
        </text>
      ))}

      {/* exterior wall (drawn last, on top) */}
      <rect x={plate.x} y={plate.y} width={plate.w} height={plate.h} rx={14} style={{ fill: 'none', stroke: WALL, pointerEvents: 'none' }} strokeWidth={4} />
    </svg>
  )
}
