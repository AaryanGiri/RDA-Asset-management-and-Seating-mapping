import { useUI } from './uiStore'

// Recharts applies colors as SVG attributes, where CSS custom properties do not
// resolve. So we expose concrete color values per theme.
export interface ChartColors {
  brand: string
  vacant: string
  occupied: string
  notice: string
  maint: string
  blocked: string
  grid: string
  axis: string
  surface: string
  tooltipBg: string
  border: string
  series: string[]
}

const DARK: ChartColors = {
  brand: '#818cf8',
  vacant: '#34d399',
  occupied: '#fb7185',
  notice: '#60a5fa',
  maint: '#fbbf24',
  blocked: '#94a3b8',
  grid: 'rgba(148,163,184,0.14)',
  axis: '#6c748a',
  surface: '#13161f',
  tooltipBg: '#1a1e2a',
  border: '#262b3a',
  series: ['#818cf8', '#34d399', '#fb7185', '#60a5fa', '#fbbf24', '#f472b6', '#22d3ee', '#a78bfa', '#facc15', '#2dd4bf'],
}

const LIGHT: ChartColors = {
  brand: '#6366f1',
  vacant: '#059669',
  occupied: '#e12d4a',
  notice: '#2563eb',
  maint: '#d97706',
  blocked: '#64748b',
  grid: 'rgba(100,116,139,0.14)',
  axis: '#8a90a0',
  surface: '#ffffff',
  tooltipBg: '#ffffff',
  border: '#e2e4ea',
  series: ['#6366f1', '#059669', '#e12d4a', '#2563eb', '#d97706', '#db2777', '#0891b2', '#7c3aed', '#ca8a04', '#0d9488'],
}

export function useChart(): ChartColors {
  const theme = useUI((s) => s.theme)
  return theme === 'dark' ? DARK : LIGHT
}
