import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSaver, type SaveStatus } from '@renderer/state/saver'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('createSaver', () => {
  it('runs only the latest write for a key, once, after the delay', async () => {
    const saver = createSaver(400)
    const calls: string[] = []
    saver.schedule('a', async () => void calls.push('first'))
    await vi.advanceTimersByTimeAsync(200)
    saver.schedule('a', async () => void calls.push('second'))
    await vi.advanceTimersByTimeAsync(399)
    expect(calls).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual(['second'])
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls).toEqual(['second'])
  })

  it('keeps writes for different keys separate', async () => {
    const saver = createSaver(400)
    const calls: string[] = []
    saver.schedule('a', async () => void calls.push('a'))
    saver.schedule('b', async () => void calls.push('b'))
    await vi.advanceTimersByTimeAsync(400)
    expect(calls.sort()).toEqual(['a', 'b'])
  })

  it('flush runs pending writes immediately and waits for them to finish', async () => {
    const saver = createSaver(400)
    let done = false
    saver.schedule('a', async () => {
      await Promise.resolve()
      done = true
    })
    await saver.flush()
    expect(done).toBe(true)
  })

  it('saves at least every maxWait while changes keep coming', async () => {
    const saver = createSaver(400, 2000)
    let writes = 0
    for (let i = 0; i < 10; i++) {
      saver.schedule('a', async () => void writes++)
      await vi.advanceTimersByTimeAsync(300)
    }
    expect(writes).toBeGreaterThanOrEqual(1)
  })

  it('reports an error when a write fails but still runs the other writes', async () => {
    const saver = createSaver(400)
    const statuses: SaveStatus[] = []
    saver.subscribe((s) => statuses.push(s))
    let bRan = false
    saver.schedule('a', async () => {
      throw new Error('disk full')
    })
    saver.schedule('b', async () => void (bRan = true))
    await vi.advanceTimersByTimeAsync(400)
    expect(bRan).toBe(true)
    expect(statuses).toContain('saving')
    expect(statuses.at(-1)).toBe('error')
  })

  it('reports saved after successful writes', async () => {
    const saver = createSaver(400)
    const statuses: SaveStatus[] = []
    saver.subscribe((s) => statuses.push(s))
    saver.schedule('a', async () => {})
    await vi.advanceTimersByTimeAsync(400)
    expect(statuses.at(-1)).toBe('saved')
  })
})
