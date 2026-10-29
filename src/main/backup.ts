import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

const BACKUPS = 'backups'
/** Things in the data folder that are never copied into a backup. */
const SKIP = new Set([BACKUPS, '.electron-profile'])
const DAY_DIR = /^\d{4}-\d{2}-\d{2}$/

/**
 * Copies the data folder into data/backups/<today> once per day and keeps the newest `keep`
 * backups. Returns the new backup folder, or null when today's exists or there is nothing to copy.
 * The copy is written as <today>.partial and renamed at the end, so a half-finished backup never
 * counts as one.
 */
export async function runDailyBackup(dataDir: string, today: string, keep = 7): Promise<string | null> {
  const root = join(dataDir, BACKUPS)
  const target = join(root, today)
  if (existsSync(target)) return null

  const entries = (await readdir(dataDir).catch(() => [] as string[])).filter(
    (e) => !SKIP.has(e) && !e.endsWith('.tmp')
  )
  if (entries.length === 0) return null

  const partial = `${target}.partial`
  await rm(partial, { recursive: true, force: true })
  await mkdir(partial, { recursive: true })
  for (const e of entries) await cp(join(dataDir, e), join(partial, e), { recursive: true })
  await rename(partial, target)

  const days = (await readdir(root)).filter((d) => DAY_DIR.test(d)).sort()
  for (const old of days.slice(0, Math.max(0, days.length - keep))) {
    await rm(join(root, old), { recursive: true, force: true })
  }
  return target
}
