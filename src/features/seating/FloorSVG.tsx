import { FLOOR_GEOMETRY, type FloorGeometry, type RoomShape } from './floorplans'
import type { Seat } from '@/lib/types'

// Renders the static floor: slab, walls, rooms, furniture. Pure vector so it
// stays crisp at any zoom. Seat markers are drawn by FloorCanvas on top, using
// the same coordinate space (guaranteed alignment).

const roomFill: Record<string, string> = {
  courtyard: 'rgb(var(--c-surface-2))',
  meeting: 'rgb(var(--c-brand-soft))',
  service: 'rgb(var(--c-surface-2))',
  reception: 'rgb(var(--c-surface-2))',
  collab: 'rgb(var(--c-brand-soft))',
  open: 'rgb(var(--c-surface))',
  balcony: 'rgb(var(--c-surface-2))',
}

function MeetingTable({ room }: { room: RoomShape }) {
  const pad = 26
  const tx = room.x + pad
  const ty = room.y + room.h / 2 - 12
  const tw = room.w - pad * 2
  const chairs = room.chairs ?? 6
  const perSide = Math.ceil(chairs / 2)
  const seats = []
  for (let i = 0; i < perSide; i++) {
    const cx = tx + (tw / perSide) * (i + 0.5)
    seats.push(<circle key={`t${i}`} cx={cx} cy={ty - 10} r={5.5} style={{ fill: 'rgb(var(--c-surface-3))', stroke: 'rgb(var(--c-border-strong))' }} strokeWidth={1} />)
    seats.push(<circle key={`b${i}`} cx={cx} cy={ty + 34} r={5.5} style={{ fill: 'rgb(var(--c-surface-3))', stroke: 'rgb(var(--c-border-strong))' }} strokeWidth={1} />)
  }
  return (
    <g>
      {seats}
      <rect x={tx} y={ty} width={tw} height={24} rx={8} style={{ fill: 'rgb(var(--c-surface))', stroke: 'rgb(var(--c-border-strong))' }} strokeWidth={1.2} />
    </g>
  )
}

function Desk({ cx, cy }: { cx: number; cy: number }) {
  // desk surface with a monitor bar — marker sits centered on top
  return (
    <g>
      <rect x={cx - 24} y={cy - 15} width={48} height={30} rx={4} style={{ fill: 'rgb(var(--c-surface-3))', stroke: 'rgb(var(--c-border))' }} strokeWidth={1} />
      <rect x={cx - 11} y={cy - 12} width={22} height={5} rx={2} style={{ fill: 'rgb(var(--c-border-strong))' }} opacity={0.5} />
    </g>
  )
}

export function FloorSVG({ floorId, seats }: { floorId: string; seats: Seat[] }) {
  const geo: FloorGeometry = FLOOR_GEOMETRY[floorId]
  const workstations = seats.filter((s) => s.seatType === 'workstation')

  return (
    <svg viewBox={`0 0 ${geo.vbw} ${geo.vbh}`} width={geo.vbw} height={geo.vbh} className="select-none">
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: 'rgb(var(--c-border-strong))' }} strokeWidth="1" opacity="0.5" />
        </pattern>
        <filter id="slabShadow" x="-5%" y="-5%" width="110%" height="115%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* slab */}
      <path d={geo.slab} style={{ fill: 'rgb(var(--c-surface))' }} filter="url(#slabShadow)" />
      <path d={geo.slab} style={{ fill: 'none', stroke: 'rgb(var(--c-border-strong))' }} strokeWidth={3} />

      {/* rooms */}
      {geo.rooms.map((r) => (
        <g key={r.id}>
          <rect
            x={r.x} y={r.y} width={r.w} height={r.h} rx={10}
            style={{ fill: roomFill[r.kind] ?? 'rgb(var(--c-surface-2))', stroke: 'rgb(var(--c-border-strong))' }}
            strokeWidth={1.4}
          />
          {r.kind === 'courtyard' && (
            <>
              <rect x={r.x + 8} y={r.y + 8} width={r.w - 16} height={r.h - 16} rx={6} fill="url(#hatch)" opacity={0.6} />
              {[0.28, 0.5, 0.72].map((fx, i) =>
                [0.3, 0.55, 0.78].map((fy, j) => (
                  <circle key={`g${i}${j}`} cx={r.x + r.w * fx} cy={r.y + r.h * fy} r={7} style={{ fill: 'rgb(var(--c-vacant))' }} opacity={0.28} />
                )),
              )}
            </>
          )}
          {(r.kind === 'meeting' || r.kind === 'collab') && r.chairs && <MeetingTable room={r} />}
          <text x={r.x + 12} y={r.y + 20} style={{ fill: 'rgb(var(--c-text-muted))' }} fontSize={13} fontWeight={600} className="font-sans">
            {r.label}
          </text>
          {r.sub && (
            <text x={r.x + 12} y={r.y + 36} style={{ fill: 'rgb(var(--c-text-subtle))' }} fontSize={11} className="font-sans">
              {r.sub}
            </text>
          )}
        </g>
      ))}

      {/* cabins & phone booths (rooms whose seat marker sits at center) */}
      {geo.cabins.map((c) => {
        const booth = c.seatNumber.startsWith('P')
        return (
          <g key={c.seatNumber}>
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={9} style={{ fill: 'rgb(var(--c-surface-2))', stroke: 'rgb(var(--c-border-strong))' }} strokeWidth={1.4} />
            {!booth && (
              <rect x={c.x + c.w / 2 - 22} y={c.y + c.h - 30} width={44} height={16} rx={3} style={{ fill: 'rgb(var(--c-surface-3))', stroke: 'rgb(var(--c-border))' }} strokeWidth={1} />
            )}
            <text x={c.x + 8} y={c.y + 16} style={{ fill: 'rgb(var(--c-text-subtle))' }} fontSize={10} fontWeight={600} className="font-sans">
              {booth ? 'Booth' : 'Cabin'}
            </text>
          </g>
        )
      })}

      {/* structural cores */}
      {geo.cores.map((core, i) => (
        <g key={i}>
          <rect x={core.x} y={core.y} width={core.w} height={core.h} rx={4} fill="url(#hatch)" style={{ stroke: 'rgb(var(--c-border-strong))' }} strokeWidth={1.2} />
          <text x={core.x + core.w / 2} y={core.y + core.h / 2} textAnchor="middle" dominantBaseline="middle" style={{ fill: 'rgb(var(--c-text-subtle))' }} fontSize={9} className="font-sans">
            CORE
          </text>
        </g>
      ))}

      {/* zone labels for open bays */}
      {geo.banks.map((b) => (
        <text
          key={b.zone}
          x={b.x - 6}
          y={b.y - 30}
          style={{ fill: 'rgb(var(--c-text-subtle))' }}
          fontSize={11}
          fontWeight={600}
          letterSpacing={0.5}
          className="font-sans uppercase"
        >
          {b.zone}
        </text>
      ))}

      {/* desks under workstation markers */}
      {workstations.map((s) => (
        <Desk key={s.id} cx={s.x * geo.vbw} cy={s.y * geo.vbh} />
      ))}
    </svg>
  )
}
