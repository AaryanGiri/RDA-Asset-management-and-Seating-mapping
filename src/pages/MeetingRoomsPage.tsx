import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { CalendarClock, Users2, Plus, Check, DoorOpen, Clock3, Bell } from 'lucide-react'
import { Page } from '@/components/Page'
import { PageHeader, Segmented, Modal, Field, EmptyState } from '@/components/ui'
import { ChartCard, ChartTooltip } from '@/components/charts'
import { useData } from '@/lib/store'
import { useChart } from '@/lib/chart'
import { MEETINGROOM_STATUS_META } from '@/lib/status'
import { useSimulatedLoad } from '@/hooks'
import { cn, formatDate } from '@/lib/utils'
import type { MeetingBooking, MeetingRoom, MeetingRoomStatus } from '@/lib/types'

function isToday(iso: string) {
  const d = new Date(iso), n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

function roomStatus(bookings: MeetingBooking[]): MeetingRoomStatus {
  if (bookings.some((b) => b.status === 'active')) return 'in-use'
  if (bookings.some((b) => b.status === 'upcoming' && isToday(b.date))) return 'booked'
  return 'available'
}

export function MeetingRoomsPage() {
  const rooms = useData((s) => s.meetingRooms)
  const bookings = useData((s) => s.meetingBookings)
  const floors = useData((s) => s.floors)
  const role = useData((s) => s.role)
  const personaId = useData((s) => s.personaId)
  const confirmUse = useData((s) => s.confirmMeetingUse)
  const release = useData((s) => s.releaseMeetingRoom)
  const c = useChart()
  const loading = useSimulatedLoad(360)
  const [floorId, setFloorId] = useState<string>('all')
  const [bookRoom, setBookRoom] = useState<MeetingRoom | null>(null)

  const byRoom = useMemo(() => {
    const m = new Map<string, MeetingBooking[]>()
    for (const b of bookings) { const a = m.get(b.roomId) ?? []; a.push(b); m.set(b.roomId, a) }
    return m
  }, [bookings])

  const visRooms = rooms.filter((r) => floorId === 'all' || r.floorId === floorId)

  // active bookings needing a "still using?" confirmation (booker = current persona, or admin sees all)
  const activePrompts = bookings.filter((b) => b.status === 'active' && (role === 'admin' || b.bookedById === personaId))

  // utilization: total booked hours per room over the seeded period
  const util = visRooms.map((r) => {
    const bs = byRoom.get(r.id) ?? []
    const hours = bs.reduce((s, b) => s + b.durationMins / 60, 0)
    return { name: r.name, hours: Math.round(hours * 10) / 10, status: roomStatus(bs) }
  })
  const statusColor: Record<MeetingRoomStatus, string> = { available: c.vacant, booked: c.notice, 'in-use': c.occupied }

  const counts = {
    available: visRooms.filter((r) => roomStatus(byRoom.get(r.id) ?? []) === 'available').length,
    booked: visRooms.filter((r) => roomStatus(byRoom.get(r.id) ?? []) === 'booked').length,
    inUse: visRooms.filter((r) => roomStatus(byRoom.get(r.id) ?? []) === 'in-use').length,
  }

  return (
    <Page wide>
      <PageHeader
        icon={<CalendarClock className="h-5 w-5" />}
        title="Meeting Rooms"
        subtitle="Availability, bookings and utilization across both floors."
        actions={
          <Segmented
            value={floorId}
            onChange={setFloorId}
            options={[{ value: 'all', label: 'All floors' }, ...floors.map((f) => ({ value: f.id, label: f.name.split('·')[0].trim() }))]}
          />
        }
      />

      {/* active-use confirmation banners */}
      {activePrompts.map((b) => (
        <div key={b.id} className="mb-3 flex flex-col gap-3 rounded-2xl border border-notice/40 bg-notice-soft/50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-notice/20 text-notice"><Bell className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-semibold text-content">You have booked {b.roomName} — {b.title}</p>
              <p className="text-xs text-muted">Your booking is currently active ({b.start}–{b.end}). Are you still using the meeting room?</p>
            </div>
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <button onClick={() => release(b.id)} className="btn-ghost"><DoorOpen className="h-4 w-4" /> No, free it</button>
            <button onClick={() => confirmUse(b.id)} className="btn-primary"><Check className="h-4 w-4" /> Yes, still using</button>
          </div>
        </div>
      ))}

      {/* KPI + utilization */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-3 gap-3 lg:col-span-1">
          <Kpi label="Available" value={counts.available} tone="vacant" />
          <Kpi label="Booked" value={counts.booked} tone="notice" />
          <Kpi label="In use" value={counts.inUse} tone="occupied" />
        </div>
        <ChartCard title="Meeting-room utilization" subtitle="Total booked hours in the period" className="lg:col-span-2">
          {loading ? <div className="skeleton h-[200px] w-full rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={util} margin={{ left: -20, top: 6 }}>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 11 }} />
                <Tooltip cursor={{ fill: c.grid }} content={<ChartTooltip tooltipBg={c.tooltipBg} border={c.border} />} />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                  {util.map((u, i) => <Cell key={i} fill={statusColor[u.status]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* room cards */}
      {visRooms.length === 0 ? (
        <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No meeting rooms" body="No meeting rooms on this floor." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visRooms.map((r) => {
            const bs = (byRoom.get(r.id) ?? []).slice().sort((a, b) => a.start.localeCompare(b.start))
            const status = roomStatus(bs)
            const m = MEETINGROOM_STATUS_META[status]
            const today = bs.filter((b) => isToday(b.date) || b.status === 'active')
            const upcoming = bs.filter((b) => b.status === 'upcoming' && !isToday(b.date)).slice(0, 2)
            return (
              <div key={r.id} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-content">{r.name}</p>
                    <p className="text-2xs text-muted">{r.label} · <Users2 className="inline h-3 w-3" /> {r.capacity} pax</p>
                  </div>
                  <span className={cn('chip', m.bg, m.text)}><span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />{m.label}</span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-subtle">Today</p>
                  {today.length === 0 ? <p className="text-xs text-subtle">No bookings today.</p> : today.map((b) => <BookingRow key={b.id} b={b} />)}
                  {upcoming.length > 0 && <>
                    <p className="mt-2 text-2xs font-semibold uppercase tracking-wide text-subtle">Upcoming</p>
                    {upcoming.map((b) => <BookingRow key={b.id} b={b} showDate />)}
                  </>}
                </div>

                <button onClick={() => setBookRoom(r)} className="btn-secondary mt-3 w-full"><Plus className="h-4 w-4" /> Book this room</button>
              </div>
            )
          })}
        </div>
      )}

      <BookModal room={bookRoom} onClose={() => setBookRoom(null)} />
    </Page>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  const map: Record<string, string> = { vacant: 'text-vacant bg-vacant-soft', notice: 'text-notice bg-notice-soft', occupied: 'text-occupied bg-occupied-soft' }
  return (
    <div className="card flex flex-col justify-between p-3.5">
      <div className={cn('grid h-7 w-7 place-items-center rounded-lg', map[tone])}><CalendarClock className="h-4 w-4" /></div>
      <div className="mt-2"><p className="text-xl font-semibold text-content">{value}</p><p className="text-2xs text-muted">{label}</p></div>
    </div>
  )
}

function BookingRow({ b, showDate }: { b: MeetingBooking; showDate?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-xs">
      <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted" />
      <span className="font-medium text-content">{b.start}–{b.end}</span>
      <span className="truncate text-muted">· {b.title}</span>
      <span className="ml-auto shrink-0 truncate text-2xs text-subtle">{showDate ? formatDate(b.date, { day: 'numeric', month: 'short' }) : b.bookedByName.split(' ')[0]}</span>
    </div>
  )
}

const TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']
function BookModal({ room, onClose }: { room: MeetingRoom | null; onClose: () => void }) {
  const personaId = useData((s) => s.personaId)
  const role = useData((s) => s.role)
  const employees = useData((s) => s.employees)
  const book = useData((s) => s.bookMeetingRoom)
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('11:00')
  const [busy, setBusy] = useState(false)
  const bookedBy = role === 'employee' ? personaId : (employees.find((e) => e.currentSeatId)?.id ?? personaId)

  const submit = async () => {
    if (!room || start >= end) return
    setBusy(true)
    await book({ roomId: room.id, bookedById: bookedBy, title: title.trim() || 'Meeting', date: new Date().toISOString(), start, end })
    setBusy(false); setTitle(''); onClose()
  }
  return (
    <Modal open={!!room} onClose={onClose}>
      <div className="border-b border-border px-5 py-4"><h3 className="text-base font-semibold text-content">Book {room?.name}</h3><p className="text-xs text-muted">{room?.label} · {room?.capacity} pax · today</p></div>
      <div className="space-y-4 p-5">
        <Field label="Meeting title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Project Sync" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start"><select className="input" value={start} onChange={(e) => setStart(e.target.value)}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="End"><select className="input" value={end} onChange={(e) => setEnd(e.target.value)}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
        </div>
        {start >= end && <p className="text-2xs text-occupied">End time must be after start time.</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={start >= end || busy} className="btn-primary"><Check className="h-4 w-4" /> {busy ? 'Booking…' : 'Confirm booking'}</button>
      </div>
    </Modal>
  )
}
