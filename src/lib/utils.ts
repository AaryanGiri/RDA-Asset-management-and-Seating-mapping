import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Simulated network latency so the mock API feels live. */
export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
export function latency(min = 260, max = 620) {
  return sleep(min + Math.random() * (max - min))
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
}

export function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)
}

export function formatNumber(v: number) {
  return new Intl.NumberFormat('en-US').format(v)
}

/** e.g. "3 days ago", "in 12 days" */
export function relativeTime(iso: string) {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = then - now
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60000)
  const hours = Math.round(abs / 3600000)
  const days = Math.round(abs / 86400000)
  const fmt = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  let label: string
  if (mins < 1) label = 'just now'
  else if (mins < 60) label = fmt(mins, 'min')
  else if (hours < 24) label = fmt(hours, 'hour')
  else label = fmt(days, 'day')
  if (label === 'just now') return label
  return diff < 0 ? `${label} ago` : `in ${label}`
}

export function daysBetween(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('en-US', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

export function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString()
}
export function daysFromNowISO(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString()
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
