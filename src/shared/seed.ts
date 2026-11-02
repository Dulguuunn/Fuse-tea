// What the Applications section starts with the first time Ponder runs without a profile.json.
// The code only carries generic data (an empty profile and the usual folders). Your own details go in
// `data/seed.json`, an export file (Profile → Export and import → Export JSON); the data folder is
// git-ignored, so personal information never ends up in the source code.
import { type Application } from './applications'
import { parseBundle } from './bundle'
import { normalizeFileIndex, type FileIndex } from './files'
import { normalizeProfile, type Profile } from './profile'

export interface StartingData {
  profile: Profile
  applications: Application[]
  files: FileIndex
}

export const seedProfile = (): Profile => normalizeProfile({ seeded: true })

export const seedApplications = (): Application[] => []

export function seedFiles(): FileIndex {
  return normalizeFileIndex({
    folders: [
      { id: 'seed-folder-proof', name: 'Proof', parentId: null },
      { id: 'seed-folder-proof-volunteer', name: 'Volunteer', parentId: 'seed-folder-proof' },
      { id: 'seed-folder-proof-awards', name: 'Awards', parentId: 'seed-folder-proof' },
      { id: 'seed-folder-diplomas', name: 'Diplomas', parentId: null },
      { id: 'seed-folder-cv', name: 'CV', parentId: null },
      { id: 'seed-folder-id', name: 'ID', parentId: null }
    ],
    files: []
  })
}

/** The generic starting data. */
export function seedData(): StartingData {
  return { profile: seedProfile(), applications: seedApplications(), files: seedFiles() }
}

/**
 * The starting data to use: the contents of data/seed.json when it is a valid Ponder export, otherwise
 * the generic seed. The profile is always marked as seeded, so this runs once.
 */
export function startingData(rawSeedFile: unknown): StartingData {
  const custom = parseBundle(rawSeedFile)
  if (!custom) return seedData()
  return { ...custom, profile: { ...custom.profile, seeded: true } }
}
