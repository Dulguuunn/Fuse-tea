import { dirname, join, resolve } from 'node:path'

export interface DataDirInput {
  env: Record<string, string | undefined>
  isPackaged: boolean
  execPath: string
  appPath: string
}

/**
 * Where the user's notes live:
 * 1. NOTES_DATA_DIR (tests and screenshots use a temp folder)
 * 2. packaged app: <exe folder>\..\..\data   (C:\Note\release\win-unpacked\Notes.exe → C:\Note\data)
 * 3. dev (npm run dev): <project root>\data
 * Paths are relative, so moving the whole C:\Note folder keeps everything working.
 */
export function resolveDataDir({ env, isPackaged, execPath, appPath }: DataDirInput): string {
  const override = env.NOTES_DATA_DIR
  if (override) return resolve(override)
  if (isPackaged) return resolve(dirname(execPath), '..', '..', 'data')
  return join(appPath, 'data')
}
