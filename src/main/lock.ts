// The launch lock. The code is kept as a salted scrypt hash in data/lock.json, and the main process
// refuses every data request until the right code is entered (see ipc.ts), so the lock is more than a
// cover over the UI. It keeps casual snoopers out; it does not encrypt the files in the data folder.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { LockResult, LockStatus } from '@shared/ipc'
import type { Storage } from './storage'

export const DEFAULT_CODE = '8848'
export const VALID_CODE = /^\d{4,8}$/
const FILE = 'lock.json'
const MAX_WRONG = 5
const WAIT_MS = 30_000

interface LockFile {
  enabled: boolean
  salt: string
  hash: string
}

const OFF: LockFile = { enabled: false, salt: '', hash: '' }

const hashOf = (code: string, salt: string): string =>
  scryptSync(code, Buffer.from(salt, 'hex'), 32).toString('hex')

function lockFor(code: string): LockFile {
  const salt = randomBytes(16).toString('hex')
  return { enabled: true, salt, hash: hashOf(code, salt) }
}

function matches(file: LockFile, code: string): boolean {
  const a = Buffer.from(hashOf(code, file.salt), 'hex')
  const b = Buffer.from(file.hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Reads lock.json; anything missing or damaged gives null, which becomes the default lock (never "unlocked"). */
function normalizeLock(raw: unknown): LockFile | null {
  const r = raw as Partial<LockFile> | null | undefined
  if (r && r.enabled === false) return OFF
  if (
    r &&
    r.enabled === true &&
    typeof r.salt === 'string' &&
    /^[0-9a-f]+$/.test(r.salt) &&
    typeof r.hash === 'string' &&
    /^[0-9a-f]{64}$/.test(r.hash)
  ) {
    return { enabled: true, salt: r.salt, hash: r.hash }
  }
  return null
}

export class Lock {
  private file: LockFile = OFF
  private unlocked = false
  private wrong = 0
  private waitUntil = 0

  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now
  ) {}

  /** Must finish before any window opens. Until then the lock counts as on. */
  async init(): Promise<void> {
    this.file = lockFor(DEFAULT_CODE) // placeholder so nothing is open if reading fails
    const stored = await this.storage.readJson(FILE, normalizeLock)
    if (stored) {
      this.file = stored
      return
    }
    await this.storage.writeJson(FILE, this.file)
  }

  status(): LockStatus {
    return { enabled: this.file.enabled, unlocked: !this.file.enabled || this.unlocked }
  }

  assertUnlocked(): void {
    if (!this.status().unlocked) throw new Error('Locked')
  }

  async unlock(code: string): Promise<LockResult> {
    if (!this.file.enabled) return { ok: true }
    const result = this.check(code)
    if (result.ok) this.unlocked = true
    return result
  }

  /** Sets a new code (or turns the lock off with `next = null`). Needs the current code when the lock is on. */
  async change(current: string, next: string | null): Promise<LockResult> {
    if (this.file.enabled) {
      const result = this.check(current)
      if (!result.ok) return result
    }
    if (next !== null && !VALID_CODE.test(next)) return { ok: false, reason: 'invalid' }
    this.file = next === null ? OFF : lockFor(next)
    await this.storage.writeJson(FILE, this.file)
    this.unlocked = true // the person just proved they know the code (or the lock was off)
    return { ok: true }
  }

  private check(code: string): LockResult {
    const t = this.now()
    if (t < this.waitUntil) return { ok: false, reason: 'wait', waitMs: this.waitUntil - t }
    if (typeof code === 'string' && matches(this.file, code)) {
      this.wrong = 0
      return { ok: true }
    }
    if (++this.wrong >= MAX_WRONG) {
      this.wrong = 0
      this.waitUntil = t + WAIT_MS
    }
    return { ok: false, reason: 'wrong' }
  }
}
