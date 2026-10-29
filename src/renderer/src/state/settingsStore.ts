import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Settings } from '@shared/types'
import { saver } from './saver'

interface SettingsState {
  settings: Settings
  loaded: boolean
  load(): Promise<void>
  update(patch: Partial<Settings>): void
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  async load() {
    set({ settings: await window.api.settings.get(), loaded: true })
  },
  update(patch) {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    saver.schedule('settings', () => window.api.settings.save(settings))
  }
}))
