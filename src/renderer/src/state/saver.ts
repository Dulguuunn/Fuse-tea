// Debounced saving. Every change schedules a write under a key ('note:<id>', 'tasks', …); only the
// latest write per key runs, 400 ms after typing pauses (or at most every 2 s while it continues).
// flush() is called before the window closes so nothing typed is lost.

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type Write = () => Promise<void>

export interface Saver {
  schedule(key: string, write: Write): void
  flush(): Promise<void>
  subscribe(cb: (status: SaveStatus) => void): () => void
  status(): SaveStatus
}

interface Pending {
  write: Write
  timer: ReturnType<typeof setTimeout>
  firstAt: number
}

export function createSaver(delay = 400, maxWait = 2000): Saver {
  const pending = new Map<string, Pending>()
  const inFlight = new Set<Promise<void>>()
  const listeners = new Set<(s: SaveStatus) => void>()
  let status: SaveStatus = 'idle'
  let failed = false

  const emit = (s: SaveStatus): void => {
    status = s
    listeners.forEach((l) => l(s))
  }
  const startBatch = (): void => {
    if (status === 'saving') return
    failed = false
    emit('saving')
  }

  function run(key: string): void {
    const p = pending.get(key)
    if (!p) return
    clearTimeout(p.timer)
    pending.delete(key)
    startBatch()
    const job: Promise<void> = p
      .write()
      .catch((e: unknown) => {
        failed = true
        console.error(`[saver] could not save ${key}`, e)
      })
      .finally(() => {
        inFlight.delete(job)
        if (inFlight.size === 0 && pending.size === 0) emit(failed ? 'error' : 'saved')
      })
    inFlight.add(job)
  }

  return {
    schedule(key, write) {
      const now = Date.now()
      const existing = pending.get(key)
      if (existing) clearTimeout(existing.timer)
      const firstAt = existing?.firstAt ?? now
      const wait = Math.max(0, Math.min(delay, firstAt + maxWait - now))
      pending.set(key, { write, firstAt, timer: setTimeout(() => run(key), wait) })
      startBatch()
    },
    async flush() {
      for (const key of [...pending.keys()]) run(key)
      await Promise.all([...inFlight])
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    status: () => status
  }
}

/** The app-wide saver used by every store. */
export const saver = createSaver()
