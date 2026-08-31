import { SEAT_STATUS } from '@/lib/status'
import type { NType, NZone, NStatus, NDesk, NPerson } from './data'

// Reuse the app's seat-status palette (keys line up 1:1 with NStatus).
export { SEAT_STATUS }

export type ColorMode = 'status' | 'type' | 'zone'

export const TYPE_META: Record<NType, { label: string; fill: string; soft: string; text: string }> = {
  employee: { label: 'Employee', fill: 'rgb(var(--c-brand))', soft: 'bg-brand-soft', text: 'text-brand' },
  partner: { label: 'Silver Touch (Partner)', fill: 'rgb(var(--c-maint))', soft: 'bg-maint-soft', text: 'text-maint' },
  intern: { label: 'Intern', fill: 'rgb(var(--c-notice))', soft: 'bg-notice-soft', text: 'text-notice' },
}

export const ZONE_META: Record<NZone, { label: string; fill: string }> = {
  workstation: { label: 'Workstation', fill: 'rgb(var(--c-brand))' },
  cabin: { label: 'Cabin', fill: 'rgb(var(--c-occupied))' },
  vr: { label: 'VR Room', fill: 'rgb(var(--c-notice))' },
  flex: { label: 'Flex / Overhead', fill: 'rgb(var(--c-maint))' },
}

// Resolve the accent colour a desk should paint for the active colour mode.
export function deskFill(desk: NDesk, person: NPerson | undefined, mode: ColorMode): string {
  if (desk.status !== 'occupied' && desk.status !== 'notice') return SEAT_STATUS[desk.status].fill
  if (mode === 'status') return SEAT_STATUS[desk.status].fill
  if (mode === 'zone') return ZONE_META[desk.zone].fill
  return person ? TYPE_META[person.type].fill : SEAT_STATUS[desk.status].fill
}

export const STATUS_ORDER: NStatus[] = ['occupied', 'vacant', 'notice', 'maintenance', 'blocked']
