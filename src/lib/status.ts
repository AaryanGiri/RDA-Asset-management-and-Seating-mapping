import type { AssetPrimaryCategory, AssetStatus, MeetingRoomStatus, RequestStatus, SeatStatus } from './types'

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

export const ASSET_STATUS_META: Record<AssetStatus, { label: string; text: string; bg: string; dot: string }> = {
  'in-use': { label: 'In Use', text: 'text-vacant', bg: 'bg-vacant-soft', dot: 'bg-vacant' },
  'in-storage': { label: 'In Storage', text: 'text-notice', bg: 'bg-notice-soft', dot: 'bg-notice' },
  defective: { label: 'Defective', text: 'text-maint', bg: 'bg-maint-soft', dot: 'bg-maint' },
  discarded: { label: 'Discarded', text: 'text-blocked', bg: 'bg-blocked-soft', dot: 'bg-blocked' },
}

export const ASSET_CATEGORY_META: Record<AssetPrimaryCategory, { label: string; short: string; accent: string }> = {
  tangible: { label: 'Tangible Assets', short: 'Tangible', accent: 'brand' },
  intangible: { label: 'Intangible Assets', short: 'Intangible', accent: 'notice' },
  'land-building': { label: 'Land & Building', short: 'Land & Building', accent: 'vacant' },
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
