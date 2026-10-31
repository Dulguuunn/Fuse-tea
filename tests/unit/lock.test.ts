import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Lock } from '../../src/main/lock'
import { Storage } from '../../src/main/storage'

let dir: string
let now: number
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'notes-lock-'))
  now = 1_000_000
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const make = async (): Promise<Lock> => {
  const lock = new Lock(new Storage(dir), () => now)
  await lock.init()
  return lock
}

describe('Lock', () => {
  it('starts locked with the default code 8848 when there is no lock file', async () => {
    const lock = await make()
    expect(lock.status()).toEqual({ enabled: true, unlocked: false })
    expect(() => lock.assertUnlocked()).toThrow('Locked')
  })

  it('unlocks with the right code and rejects a wrong one', async () => {
    const lock = await make()
    expect(await lock.unlock('0000')).toEqual({ ok: false, reason: 'wrong' })
    expect(lock.status().unlocked).toBe(false)
    expect(await lock.unlock('8848')).toEqual({ ok: true })
    expect(lock.status().unlocked).toBe(true)
    expect(() => lock.assertUnlocked()).not.toThrow()
  })

  it('never stores the code in plain text', async () => {
    await make()
    expect(await readFile(join(dir, 'lock.json'), 'utf8')).not.toContain('8848')
  })

  it('makes you wait 30 seconds after 5 wrong codes, even for the right code', async () => {
    const lock = await make()
    for (let i = 0; i < 5; i++) await lock.unlock('1111')
    expect(await lock.unlock('8848')).toEqual({ ok: false, reason: 'wait', waitMs: 30_000 })
    now += 30_000
    expect(await lock.unlock('8848')).toEqual({ ok: true })
  })

  it('remembers the lock between launches', async () => {
    const first = await make()
    await first.unlock('8848')
    expect(await first.change('8848', '1234')).toEqual({ ok: true })
    const second = await make()
    expect(second.status().unlocked).toBe(false)
    expect(await second.unlock('8848')).toEqual({ ok: false, reason: 'wrong' })
    expect(await second.unlock('1234')).toEqual({ ok: true })
  })

  it('changing the code needs the current code and a 4-8 digit new code', async () => {
    const lock = await make()
    await lock.unlock('8848')
    expect(await lock.change('0000', '1234')).toEqual({ ok: false, reason: 'wrong' })
    expect(await lock.change('8848', '12')).toEqual({ ok: false, reason: 'invalid' })
    expect(await lock.change('8848', 'abcd')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('can be turned off and on again', async () => {
    const lock = await make()
    await lock.unlock('8848')
    expect(await lock.change('8848', null)).toEqual({ ok: true })
    expect(lock.status()).toEqual({ enabled: false, unlocked: true })
    const again = await make()
    expect(again.status()).toEqual({ enabled: false, unlocked: true })
    expect(await again.change('', '5678')).toEqual({ ok: true })
    expect((await make()).status().enabled).toBe(true)
  })

  it('treats a corrupt lock file as the default lock, not as unlocked', async () => {
    await writeFile(join(dir, 'lock.json'), '{not json')
    expect((await make()).status()).toEqual({ enabled: true, unlocked: false })
  })
})
