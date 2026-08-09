import { FLOOR_GEOMETRY, type FloorGeometry, type RoomShape } from './floorplans'
import type { Seat } from '@/lib/types'

// Renders the floor as a 2D architectural plan: floor plate + exterior wall,
// walkable corridors, rooms as walled cells, furniture, and desks. Pure vector so
// it stays crisp at any zoom. Seat markers are drawn by FloorCanvas on top.

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

/** door opening: a gap drawn as a light rect over the wall + a quarter-arc swing */
function Door({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} style={{ fill: FLOOR }} />
}

export function FloorSVG({
  floorId,
  seats,
  hoveredRoomId,
  onRoomHover,
}: {
  floorId: string
  seats: Seat[]
  hoveredRoomId?: string | null
  onRoomHover?: (room: RoomShape | null, e?: React.PointerEvent) => void
}) {
  const geo: FloorGeometry = FLOOR_GEOMETRY[floorId]
  const workstations = seats.filter((s) => s.seatType === 'workstation')
  const plate = geo.plate ?? geo.slabRect

  return (
    <svg viewBox={`0 0 ${geo.vbw} ${geo.vbh}`} width={geo.vbw} height={geo.vbh} className="select-none">
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
      {(geo.corridors ?? []).map((c, i) => (
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
      {geo.rooms.map((r) => {
        const hovered = hoveredRoomId === r.id
        return (
          <g
            key={r.id}
            onPointerEnter={(e) => onRoomHover?.(r, e)}
            onPointerMove={(e) => onRoomHover?.(r, e)}
            onPointerLeave={() => onRoomHover?.(null)}
            style={{ cursor: 'default' }}
          >
            <rect
              x={r.x} y={r.y} width={r.w} height={r.h} rx={4}
              style={{ fill: roomFill[r.kind] ?? 'rgb(var(--c-surface))', stroke: WALL }}
              strokeWidth={2.4}
            />
            {hovered && (
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={4} style={{ fill: 'rgb(var(--c-brand))', pointerEvents: 'none' }} opacity={0.12} />
            )}
            {r.kind === 'courtyard' && <Courtyard room={r} />}
            {(r.kind === 'meeting' || r.kind === 'collab') && r.chairs && <MeetingTable room={r} />}
            {r.kind === 'training' && <TrainingRoom room={r} />}
            {r.kind === 'office' && <ExecOffice room={r} />}
            <text x={r.x + 10} y={r.y + 20} style={{ fill: 'rgb(var(--c-text))', pointerEvents: 'none' }} fontSize={Math.max(9, Math.min(13.5, (r.w - 14) / (r.label.length * 0.56)))} fontWeight={650} className="font-sans">
              {r.label}
            </text>
            {r.sub && r.h >= 40 && (
              <text x={r.x + 10} y={r.y + 34} style={{ fill: 'rgb(var(--c-text-subtle))', pointerEvents: 'none' }} fontSize={Math.max(8, Math.min(10.5, (r.w - 14) / (r.sub.length * 0.52)))} className="font-sans">
                {r.sub}
              </text>
            )}
          </g>
        )
      })}

      {/* cabins — walled cells with a desk + centered marker (marker drawn by canvas) */}
      {geo.cabins.map((c) => {
        const booth = c.seatNumber.startsWith('P')
        return (
          <g key={c.seatNumber} style={{ pointerEvents: 'none' }}>
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={4} style={{ fill: 'rgb(var(--c-surface))', stroke: WALL }} strokeWidth={2.2} />
            {!booth && (
              <rect x={c.x + c.w / 2 - 15} y={c.y + c.h - 22} width={30} height={11} rx={2} style={{ fill: 'rgb(var(--c-surface-2))', stroke: WALL_IN }} strokeWidth={0.9} />
            )}
            <text x={c.x + 6} y={c.y + 15} style={{ fill: 'rgb(var(--c-text-muted))' }} fontSize={10} fontWeight={600} className="font-sans">
              {booth ? 'Booth' : c.seatNumber === 'C7' || c.seatNumber === 'C8' ? `Cabin ${c.seatNumber.slice(1)}` : c.seatNumber}
            </text>
          </g>
        )
      })}

      {/* desks under workstation markers */}
      {workstations.map((s) => (
        <Desk key={s.id} cx={s.x * geo.vbw} cy={s.y * geo.vbh} r={geo.markerR ?? 8} />
      ))}

      {/* entry marker */}
      {(geo.markers ?? []).map((m, i) => (
        <g key={i} style={{ pointerEvents: 'none' }}>
          <path d={`M ${m.x - 8} ${m.y - 10} L ${m.x + 8} ${m.y - 10} L ${m.x} ${m.y - 1} Z`} style={{ fill: 'rgb(var(--c-brand))' }} />
          <text x={m.x} y={m.y + 12} textAnchor="middle" style={{ fill: 'rgb(var(--c-text-subtle))' }} fontSize={11} fontWeight={600} letterSpacing={0.5} className="font-sans uppercase">
            {m.label}
          </text>
        </g>
      ))}

      {/* exterior wall (drawn last, on top) */}
      <rect x={plate.x} y={plate.y} width={plate.w} height={plate.h} rx={14} style={{ fill: 'none', stroke: WALL, pointerEvents: 'none' }} strokeWidth={4} />
    </svg>
  )
}
