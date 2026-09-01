// Adapter that exposes the Seat Map (neighborhood / Tech Innovation) data in a
// shape the shared pages (Employee Locator, Seat Requests, Seating Analytics,
// dashboards) can consume — so they show the SAME real people as the Seat Map
// instead of the legacy generated seed.
import { useMemo } from 'react'
import { PEOPLE, NEIGHBORHOOD, type NPerson, type NDesk, type NStatus } from './data'
import { useNeighborhood } from './store'
import { TYPE_META } from './meta'

export { PEOPLE, NEIGHBORHOOD }
export const nPersonById = new Map<string, NPerson>(PEOPLE.map((p) => [p.id, p]))

export interface SeatRow { person: NPerson; desk?: NDesk }

export function useSeatSource() {
  const desks = useNeighborhood((s) => s.desks)
  const requests = useNeighborhood((s) => s.requests)

  return useMemo(() => {
    const deskByPerson = new Map<string, NDesk>()
    desks.forEach((d) => { if (d.personId) deskByPerson.set(d.personId, d) })
    const rows: SeatRow[] = PEOPLE.map((p) => ({ person: p, desk: deskByPerson.get(p.id) }))

    const counts = { occupied: 0, vacant: 0, notice: 0, maintenance: 0, blocked: 0 } as Record<NStatus, number>
    desks.forEach((d) => (counts[d.status] += 1))
    const total = desks.length
    const occupied = counts.occupied + counts.notice
    const occRate = total ? Math.round((occupied / total) * 100) : 0

    // breakdown by workforce type (Employee / Intern / Partner) — the meaningful
    // "department"-style split within this single Tech Innovation neighbourhood
    const typeCount: Record<string, number> = {}
    rows.forEach((r) => { if (r.desk && (r.desk.status === 'occupied' || r.desk.status === 'notice')) typeCount[r.person.type] = (typeCount[r.person.type] ?? 0) + 1 })
    const byType = (['employee', 'intern', 'partner'] as const)
      .filter((t) => typeCount[t])
      .map((t) => ({ key: t, name: TYPE_META[t].label, value: typeCount[t] }))

    // breakdown by pod / bench area
    const podCount: Record<string, number> = {}
    desks.forEach((d) => { if (d.status === 'occupied' || d.status === 'notice') podCount[d.pod] = (podCount[d.pod] ?? 0) + 1 })
    const byPod = Object.entries(podCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

    const noticeRows = rows.filter((r) => r.desk?.status === 'notice')
    const seated = rows.filter((r) => r.desk).length

    return {
      desks, requests, rows, counts, total, occupied, occRate,
      byType, byPod, noticeRows,
      seated, unseated: rows.length - seated, headcount: rows.length,
    }
  }, [desks, requests])
}
