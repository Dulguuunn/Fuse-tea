import { buildBundle, parseBundle } from '@shared/bundle'
import { useApplications } from '../../state/applicationsStore'
import { useFiles } from '../../state/filesStore'
import { useProfile } from '../../state/profileStore'
import { useUi } from '../../state/uiStore'

const say = (message: string): void => useUi.getState().showToast({ message })

/** Electron wraps errors thrown in the main process; show only the part meant for the user. */
const plain = (e: unknown): string =>
  (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

function currentJson(): string {
  const bundle = buildBundle(
    useProfile.getState().profile,
    useApplications.getState().apps,
    useFiles.getState().index,
    new Date()
  )
  return JSON.stringify(bundle, null, 2)
}

/** One JSON file with the profile, applications and file list (not the file contents). */
export async function exportJson(): Promise<void> {
  try {
    const path = await window.api.transfer.exportJson(currentJson())
    if (path) say(`Exported to ${path}`)
  } catch (e) {
    say(`Could not export: ${plain(e)}`)
  }
}

/** A folder with the JSON and a copy of every stored file: a complete backup. */
export async function exportEverything(): Promise<void> {
  try {
    const stored = useFiles.getState().index.files.map((f) => f.stored)
    const path = await window.api.transfer.exportAll(currentJson(), stored)
    if (path) say(`Exported to ${path}`)
  } catch (e) {
    say(`Could not export: ${plain(e)}`)
  }
}

/** Replaces the profile, applications and file list with an export. The main process backs up the old data first. */
export async function importExport(): Promise<void> {
  try {
    const text = await window.api.transfer.importJson()
    if (text === null) return
    const bundle = parseBundle(JSON.parse(text))
    if (!bundle) {
      say('That file is not a Ponder profile export.')
      return
    }
    useProfile.getState().replaceAll(bundle.profile)
    useApplications.getState().replaceAll(bundle.applications)
    useFiles.getState().replaceAll(bundle.files)
    say('Imported. Your previous data was backed up in the backups folder.')
  } catch (e) {
    say(`Could not import: ${plain(e)}`)
  }
}
