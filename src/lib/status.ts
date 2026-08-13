import type { AssetCondition, AssetStatus, MeetingRoomStatus, RequestStatus, SeatStatus } from './types'

export interface StatusMeta {
  label: string
  // tailwind tokens
  text: string
  bg: string
  ring: string
  dot: string
  fill: string // raw color for svg markers via css var
  cue: string // non-color shape cue: 'solid' | 'ring' | 'diag' | 'wrench' | 'cross'
}

export const SEAT_STATUS: Record<SeatStatus, StatusMeta> = {
  vacant: { label: 'Vacant', text: 'text-vacant', bg: 'bg-vacant-soft', ring: 'ring-vacant/30', dot: 'bg-vacant', fill: 'rgb(var(--c-vacant))', cue: 'ring' },
  occupied: { label: 'Occupied', text: 'text-occupied', bg: 'bg-occupied-soft', ring: 'ring-occupied/30', dot: 'bg-occupied', fill: 'rgb(var(--c-occupied))', cue: 'solid' },
  notice: { label: 'On Notice', text: 'text-notice', bg: 'bg-notice-soft', ring: 'ring-notice/30', dot: 'bg-notice', fill: 'rgb(var(--c-notice))', cue: 'clock' },
  maintenance: { label: 'Maintenance', text: 'text-maint', bg: 'bg-maint-soft', ring: 'ring-maint/30', dot: 'bg-maint', fill: 'rgb(var(--c-maint))', cue: 'wrench' },
  blocked: { label: 'Blocked', text: 'text-blocked', bg: 'bg-blocked-soft', ring: 'ring-blocked/30', dot: 'bg-blocked', fill: 'rgb(var(--c-blocked))', cue: 'cross' },
}

export const SEAT_ORDER: SeatStatus[] = ['occupied', 'vacant', 'notice', 'maintenance', 'blocked']

export const CONDITION_META: Record<AssetCondition, { label: string; text: string; bg: string; dot: string; score: number }> = {
  new: { label: 'New', text: 'text-vacant', bg: 'bg-vacant-soft', dot: 'bg-vacant', score: 100 },
  good: { label: 'Good', text: 'text-notice', bg: 'bg-notice-soft', dot: 'bg-notice', score: 78 },
  fair: { label: 'Fair', text: 'text-maint', bg: 'bg-maint-soft', dot: 'bg-maint', score: 52 },
  damaged: { label: 'Damaged', text: 'text-occupied', bg: 'bg-occupied-soft', dot: 'bg-occupied', score: 26 },
  'beyond-repair': { label: 'Beyond Repair', text: 'text-occupied', bg: 'bg-occupied-soft', dot: 'bg-occupied', score: 8 },
}

export const ASSET_STATUS_META: Record<AssetStatus, { label: string; text: string; bg: string; dot: string }> = {
  'in-use': { label: 'In Use', text: 'text-vacant', bg: 'bg-vacant-soft', dot: 'bg-vacant' },
  'in-transit': { label: 'In Transit', text: 'text-notice', bg: 'bg-notice-soft', dot: 'bg-notice' },
  'under-repair': { label: 'Under Repair', text: 'text-maint', bg: 'bg-maint-soft', dot: 'bg-maint' },
  'in-storage': { label: 'In Storage', text: 'text-blocked', bg: 'bg-blocked-soft', dot: 'bg-blocked' },
  disposed: { label: 'Disposed', text: 'text-occupied', bg: 'bg-occupied-soft', dot: 'bg-occupied' },
}

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; text: string; bg: string; dot: string }> = {
  pending: { label: 'Pending', text: 'text-notice', bg: 'bg-notice-soft', dot: 'bg-notice' },
  approved: { label: 'Approved', text: 'text-vacant', bg: 'bg-vacant-soft', dot: 'bg-vacant' },
  rejected: { label: 'Rejected', text: 'text-occupied', bg: 'bg-occupied-soft', dot: 'bg-occupied' },
}

export const MEETINGROOM_STATUS_META: Record<MeetingRoomStatus, { label: string; text: string; bg: string; dot: string }> = {
  available: { label: 'Available', text: 'text-vacant', bg: 'bg-vacant-soft', dot: 'bg-vacant' },
  booked: { label: 'Booked', text: 'text-notice', bg: 'bg-notice-soft', dot: 'bg-notice' },
  'in-use': { label: 'In Use', text: 'text-occupied', bg: 'bg-occupied-soft', dot: 'bg-occupied' },
}
