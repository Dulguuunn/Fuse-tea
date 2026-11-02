// "Export profile as JSON" / "Import JSON": everything in the Applications section in one document.
// The file bytes are not inside the JSON; the export folder holds them next to it (see the main process).
import { answerUsedIn, normalizeApplications, type Application } from './applications'
import { normalizeFileIndex, type FileIndex } from './files'
import { isObj } from './guards'
import { toJsonResume, type JsonResume } from './jsonResume'
import { normalizeProfile, type AnswerItem, type Profile } from './profile'

export const BUNDLE_FORMAT = 'ponder-profile'
export const BUNDLE_VERSION = 1

export interface ProfileBundle {
  format: typeof BUNDLE_FORMAT
  version: typeof BUNDLE_VERSION
  exportedAt: string
  profile: Omit<Profile, 'answerBank'> & { answerBank: Array<AnswerItem & { usedIn: string[] }> }
  applications: Application[]
  files: FileIndex
  /** The same profile in JSON Resume form (English, CV entries only), for CV tools. Ignored on import. */
  jsonResume: JsonResume
}

export function buildBundle(profile: Profile, applications: Application[], files: FileIndex, now: Date): ProfileBundle {
  return {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    exportedAt: now.toISOString(),
    profile: {
      ...profile,
      answerBank: profile.answerBank.map((a) => ({ ...a, usedIn: answerUsedIn(applications, a.id) }))
    },
    applications,
    files,
    jsonResume: toJsonResume(profile, 'en')
  }
}

/** Reads an exported document back. Returns null when it is not one of ours; bad entries inside are cleaned, not fatal. */
export function parseBundle(raw: unknown): { profile: Profile; applications: Application[]; files: FileIndex } | null {
  if (!isObj(raw) || raw.format !== BUNDLE_FORMAT || raw.version !== BUNDLE_VERSION) return null
  return {
    profile: normalizeProfile(raw.profile),
    applications: normalizeApplications(raw.applications),
    files: normalizeFileIndex(raw.files)
  }
}
