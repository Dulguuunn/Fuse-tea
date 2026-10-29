import { describe, expect, it } from 'vitest'
import { applyDrag, MIN_DURATION, slotAt, validateSlot } from '@shared/calendarEdit'

describe('applyDrag — move', () => {
  it('moves and snaps to 5 minutes, keeping the length', () => {
    expect(applyDrag({ start: 540, end: 630 }, 'move', 7)).toEqual({ start: 545, end: 635 })
  })
  it('stops at midnight without shrinking the class', () => {
    expect(applyDrag({ start: 1400, end: 1440 }, 'move', 30)).toEqual({ start: 1400, end: 1440 })
  })
  it('stops at the start of the day', () => {
    expect(applyDrag({ start: 30, end: 120 }, 'move', -200)).toEqual({ start: 0, end: 90 })
  })
})

describe('applyDrag — resize', () => {
  it('never gets shorter than the minimum length', () => {
    expect(applyDrag({ start: 540, end: 630 }, 'resize', -100)).toEqual({ start: 540, end: 540 + MIN_DURATION })
  })
  it('stops at midnight', () => {
    expect(applyDrag({ start: 1300, end: 1400 }, 'resize', 100)).toEqual({ start: 1300, end: 1440 })
  })
  it('turns a 1:30 class into a 2 hour class', () => {
    expect(applyDrag({ start: 540, end: 630 }, 'resize', 31)).toEqual({ start: 540, end: 660 })
  })
})

describe('validateSlot', () => {
  it('accepts a normal slot', () => {
    expect(validateSlot(600, 690)).toBeNull()
  })
  it('rejects missing times', () => {
    expect(validateSlot(null, 690)).toMatch(/start/i)
  })
  it('rejects an end that is not after the start', () => {
    expect(validateSlot(600, 600)).toMatch(/after/i)
    expect(validateSlot(700, 600)).toMatch(/after/i)
  })
  it('rejects slots shorter than 15 minutes', () => {
    expect(validateSlot(600, 610)).toMatch(/15 minutes/)
  })
})

describe('slotAt', () => {
  it('starts on the quarter hour that was clicked and lasts 1:30', () => {
    expect(slotAt(13 * 60 + 41)).toEqual({ start: 13 * 60 + 30, end: 15 * 60 })
  })
  it('does not run past midnight', () => {
    expect(slotAt(23 * 60 + 50)).toEqual({ start: 23 * 60 + 45, end: 1440 })
  })
})
