import { create } from 'zustand'

export type Page = 'notes' | 'todos' | 'calendar' | 'settings'

interface UiState {
  page: Page
  setPage(page: Page): void
}

export const useUi = create<UiState>((set) => ({
  page: 'notes',
  setPage: (page) => set({ page })
}))
