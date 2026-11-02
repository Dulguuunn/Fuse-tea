import { create } from 'zustand'
import { blankEntry, emptyProfile, type ListSection, type Personal, type Profile } from '@shared/profile'
import { countChars } from '@shared/text'
import { saver } from './saver'

type Entry<K extends ListSection> = Profile[K][number]

interface ProfileState {
  profile: Profile
  loaded: boolean
  load(): Promise<void>
  /** Replaces everything (used by import). */
  replaceAll(profile: Profile): void
  /** Edits a field of the personal section. */
  setPersonal(recipe: (p: Personal) => Personal): void
  addEntry<K extends ListSection>(section: K, init?: Partial<Entry<K>>): string
  /** Changes one entry; only the fields in `patch` are replaced. */
  updateEntry<K extends ListSection>(section: K, id: string, patch: Partial<Entry<K>>): void
  /** Deletes an entry; returns it with its position so the delete can be undone. */
  removeEntry(section: ListSection, id: string): { entry: { id: string }; index: number } | null
  restoreEntry(section: ListSection, entry: { id: string }, index: number): void
  /** Applies a change to the whole profile (used when deleting a file removes its links). */
  apply(recipe: (p: Profile) => Profile): void
}

/** Answer lengths are always kept in step with the text. */
const withCounts = (p: Profile): Profile => ({
  ...p,
  answerBank: p.answerBank.map((a) => (a.characterCount === countChars(a.answer) ? a : { ...a, characterCount: countChars(a.answer) }))
})

export const useProfile = create<ProfileState>((set, get) => {
  const commit = (next: Profile): void => {
    const profile = withCounts(next)
    set({ profile })
    saver.schedule('profile', () => window.api.profile.save(profile))
  }
  const listOf = (p: Profile, section: ListSection): Array<{ id: string }> => p[section]

  return {
    profile: emptyProfile(),
    loaded: false,
    async load() {
      set({ profile: await window.api.profile.get(), loaded: true })
    },
    replaceAll: (profile) => commit(profile),
    setPersonal: (recipe) => commit({ ...get().profile, personal: recipe(get().profile.personal) }),
    addEntry(section, init) {
      const entry = { ...blankEntry(section), ...init }
      commit({ ...get().profile, [section]: [...listOf(get().profile, section), entry] })
      return entry.id
    },
    updateEntry(section, id, patch) {
      const p = get().profile
      commit({ ...p, [section]: listOf(p, section).map((e) => (e.id === id ? { ...e, ...patch } : e)) })
    },
    removeEntry(section, id) {
      const p = get().profile
      const items = listOf(p, section)
      const index = items.findIndex((e) => e.id === id)
      if (index === -1) return null
      commit({ ...p, [section]: items.filter((e) => e.id !== id) })
      return { entry: items[index], index }
    },
    restoreEntry(section, entry, index) {
      const p = get().profile
      const items = [...listOf(p, section)]
      if (items.some((e) => e.id === entry.id)) return
      items.splice(Math.min(index, items.length), 0, entry)
      commit({ ...p, [section]: items })
    },
    apply: (recipe) => commit(recipe(get().profile))
  }
})
