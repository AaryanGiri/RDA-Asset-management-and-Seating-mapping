/** @type {import('tailwindcss').Config} */
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: withAlpha('--c-bg'),
        surface: withAlpha('--c-surface'),
        'surface-2': withAlpha('--c-surface-2'),
        'surface-3': withAlpha('--c-surface-3'),
        border: withAlpha('--c-border'),
        'border-strong': withAlpha('--c-border-strong'),
        content: withAlpha('--c-text'),
        muted: withAlpha('--c-text-muted'),
        subtle: withAlpha('--c-text-subtle'),
        brand: {
          DEFAULT: withAlpha('--c-brand'),
          fg: withAlpha('--c-brand-fg'),
          soft: withAlpha('--c-brand-soft'),
          strong: withAlpha('--c-brand-strong'),
        },
        // status
        vacant: withAlpha('--c-vacant'),
        'vacant-soft': withAlpha('--c-vacant-soft'),
        occupied: withAlpha('--c-occupied'),
        'occupied-soft': withAlpha('--c-occupied-soft'),
        notice: withAlpha('--c-notice'),
        'notice-soft': withAlpha('--c-notice-soft'),
        maint: withAlpha('--c-maint'),
        'maint-soft': withAlpha('--c-maint-soft'),
        blocked: withAlpha('--c-blocked'),
        'blocked-soft': withAlpha('--c-blocked-soft'),
      },
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
        glow: '0 0 0 1px rgb(var(--c-brand) / 0.35), 0 8px 30px -6px rgb(var(--c-brand) / 0.35)',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.85rem' }],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite',
      },
    },
  },
  plugins: [],
}
