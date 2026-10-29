import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runDailyBackup } from '../../src/main/backup'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'notes-backup-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function seed(): Promise<void> {
  await writeFile(join(dir, 'tasks.json'), '[]')
  await mkdir(join(dir, 'notes'))
  await writeFile(join(dir, 'notes', 'a.json'), '{"id":"a"}')
  await mkdir(join(dir, 'attachments'))
  await writeFile(join(dir, 'attachments', 'x.png'), 'png')
}

describe('runDailyBackup', () => {
  it('copies the data files into backups/<today>, but not the backups themselves', async () => {
    await seed()
    await mkdir(join(dir, 'backups', '2026-10-28'), { recursive: true })
    const out = await runDailyBackup(dir, '2026-10-29')
    const target = join(dir, 'backups', '2026-10-29')
    expect(out).toBe(target)
    expect(await readFile(join(target, 'tasks.json'), 'utf8')).toBe('[]')
    expect(await readFile(join(target, 'notes', 'a.json'), 'utf8')).toBe('{"id":"a"}')
    expect(existsSync(join(target, 'attachments', 'x.png'))).toBe(true)
    expect(existsSync(join(target, 'backups'))).toBe(false)
  })

  it('makes only one backup per day', async () => {
    await seed()
    await runDailyBackup(dir, '2026-10-29')
    expect(await runDailyBackup(dir, '2026-10-29')).toBeNull()
  })

  it('keeps only the newest 7 backups', async () => {
    await seed()
    for (let d = 20; d <= 27; d++) await mkdir(join(dir, 'backups', `2026-10-${d}`), { recursive: true })
    await runDailyBackup(dir, '2026-10-29')
    expect((await readdir(join(dir, 'backups'))).sort()).toEqual([
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-29'
    ])
  })

  it('does nothing when there is no data yet', async () => {
    expect(await runDailyBackup(dir, '2026-10-29')).toBeNull()
    expect(existsSync(join(dir, 'backups'))).toBe(false)
  })
})
