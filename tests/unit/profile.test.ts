import { describe, expect, it } from 'vitest'
import { blankEntry, emptyProfile, normalizeProfile } from '@shared/profile'
import { countChars, countWords, isOverLimit } from '@shared/text'

describe('text counting', () => {
  it('counts Cyrillic and English characters and words', () => {
    expect(countChars('Сайн уу')).toBe(7)
    expect(countWords('Сайн  уу\nhello')).toBe(3)
    expect(countWords('   ')).toBe(0)
  })
  it('counts an emoji as one character', () => {
    expect(countChars('a😀')).toBe(2)
  })
  it('warns only when a set limit is exceeded', () => {
    expect(isOverLimit('abcd', 3)).toBe(true)
    expect(isOverLimit('abc', 3)).toBe(false)
    expect(isOverLimit('abcd', null)).toBe(false)
  })
})

describe('normalizeProfile', () => {
  it('gives an empty, unseeded profile for missing or garbage input', () => {
    for (const raw of [undefined, null, 5, 'x', []]) {
      const p = normalizeProfile(raw)
      expect(p).toEqual(emptyProfile())
      expect(p.seeded).toBe(false)
      expect(p.education).toEqual([])
    }
  })

  it('keeps valid entries, fills defaults and drops junk', () => {
    const p = normalizeProfile({
      seeded: true,
      personal: { fullName: { mn: 'Дөлгөөн' }, phone: 5 },
      experience: [
        { id: 'e1', organization: { en: 'Acme' }, employmentType: 'bogus', startDate: '2024-06', endDate: 'present' },
        'junk',
        { startDate: 'last week', endDate: '2025-13' }
      ]
    })
    expect(p.seeded).toBe(true)
    expect(p.personal.fullName).toEqual({ mn: 'Дөлгөөн', en: '' })
    expect(p.personal.phone).toBe('')
    expect(p.experience).toHaveLength(2)
    expect(p.experience[0]).toMatchObject({
      id: 'e1',
      employmentType: 'part-time',
      startDate: '2024-06',
      endDate: 'present',
      includeInCv: true,
      fileIds: []
    })
    expect(p.experience[0].organization).toEqual({ mn: '', en: 'Acme' })
    expect(p.experience[1].id).toBeTruthy()
    expect(p.experience[1].startDate).toBe('')
    expect(p.experience[1].endDate).toBe('')
  })

  it('recomputes characterCount for answers and keeps a valid limit', () => {
    const p = normalizeProfile({
      answerBank: [
        { id: 'a', question: 'Why?', answer: 'Учир нь', language: 'mn', characterLimit: 5, characterCount: 999 },
        { id: 'b', question: 'q', answer: 'abc', language: 'xx', characterLimit: -3 }
      ]
    })
    expect(p.answerBank[0].characterCount).toBe(7)
    expect(p.answerBank[0].characterLimit).toBe(5)
    expect(p.answerBank[1].language).toBe('en')
    expect(p.answerBank[1].characterLimit).toBeNull()
  })

  it('is stable: normalizing twice gives the same result', () => {
    const once = normalizeProfile({ education: [{ id: 'x', institution: { mn: 'МУИС' }, gpa: '3.5' }] })
    expect(normalizeProfile(once)).toEqual(once)
  })

  it('blankEntry makes a new entry with an id that survives normalizing', () => {
    const e = blankEntry('volunteer')
    const p = normalizeProfile({ volunteer: [e] })
    expect(p.volunteer[0]).toEqual(e)
    expect(blankEntry('volunteer').id).not.toBe(e.id)
  })
})
