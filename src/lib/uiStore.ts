import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from './utils'

export interface Toast {
  id: string
  title: string
  body?: string
  tone: 'info' | 'success' | 'warning' | 'danger'
}

interface UIState {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  paletteOpen: boolean
  setPalette: (v: boolean) => void
  notifOpen: boolean
  setNotif: (v: boolean) => void
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        document.documentElement.classList.toggle('dark', next === 'dark')
        set({ theme: next })
      },
      paletteOpen: false,
      setPalette: (v) => set({ paletteOpen: v }),
      notifOpen: false,
      setNotif: (v) => set({ notifOpen: v }),
      toasts: [],
      toast: (t) => {
        const id = uid('toast')
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
        setTimeout(() => get().dismissToast(id), 4200)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
    }),
    { name: 'locus.theme', partialize: (s) => ({ theme: s.theme }) },
  ),
)
