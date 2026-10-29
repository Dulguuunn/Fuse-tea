import { create } from 'zustand'

export type Page = 'notes' | 'todos' | 'calendar' | 'settings'

export interface ToastData {
  id: number
  message: string
  actionLabel?: string
  onAction?(): void
}

interface UiState {
  page: Page
  setPage(page: Page): void
  /** The one short message shown at the bottom of the window (e.g. "Deleted … Undo"). */
  toast: ToastData | null
  showToast(toast: Omit<ToastData, 'id'>): void
  hideToast(): void
}

let toastSeq = 0

export const useUi = create<UiState>((set) => ({
  page: 'notes',
  setPage: (page) => set({ page }),
  toast: null,
  showToast: (toast) => set({ toast: { ...toast, id: ++toastSeq } }),
  hideToast: () => set({ toast: null })
}))
