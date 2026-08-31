import { SEAT_STATUS } from '@/lib/status'
import type { NType, NStatus, NDesk, NPerson } from './data'

export { SEAT_STATUS }

export type ColorMode = 'status' | 'department' | 'type'

export const TYPE_META: Record<NType, { label: string; fill: string; soft: string; text: string }> = {
  employee: { label: 'Employee', fill: 'rgb(var(--c-brand))', soft: 'bg-brand-soft', text: 'text-brand' },
  partner: { label: 'Silver Touch (Partner)', fill: 'rgb(var(--c-maint))', soft: 'bg-maint-soft', text: 'text-maint' },
  intern: { label: 'Intern', fill: 'rgb(var(--c-notice))', soft: 'bg-notice-soft', text: 'text-notice' },
}

// Resolve the accent colour a desk paints for the active colour mode.
export function deskFill(desk: NDesk, person: NPerson | undefined, mode: ColorMode): string {
  const occupied = desk.status === 'occupied' || desk.status === 'notice'
  if (!occupied) return SEAT_STATUS[desk.status].fill
  if (mode === 'status') return SEAT_STATUS[desk.status].fill
  if (mode === 'department') return desk.deptColor
  return person ? TYPE_META[person.type].fill : SEAT_STATUS[desk.status].fill
}

export const STATUS_ORDER: NStatus[] = ['occupied', 'vacant', 'notice', 'maintenance', 'blocked']
