import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { filterSortApplications } from '@shared/applications'
import { buildBundle, parseBundle } from '@shared/bundle'
import { toJsonResume } from '@shared/jsonResume'
import { normalizeProfile } from '@shared/profile'
import { seedData, startingData } from '@shared/seed'
import { isOverLimit } from '@shared/text'

// A made-up person (tests/fixtures/seed.json). Real details never go in the repo: they live in data/seed.json.
const fixture: unknown = JSON.parse(readFileSync('tests/fixtures/seed.json', 'utf8'))
const loaded = startingData(fixture)

describe('generic seed (what the code ships)', () => {
  const seed = seedData()
  it('is an empty, seeded profile with no applications and the usual folders', () => {
    expect(seed.profile.seeded).toBe(true)
    expect(seed.profile.personal.fullName).toEqual({ mn: '', en: '' })
    expect(seed.profile.education).toEqual([])
    expect(seed.applications).toEqual([])
    expect(seed.files.folders.map((f) => [f.name, f.parentId === null])).toEqual([
      ['Proof', true],
      ['Volunteer', false],
      ['Awards', false],
      ['Diplomas', true],
      ['CV', true],
      ['ID', true]
    ])
    expect(seed.files.files).toEqual([])
  })
  it('is stable and survives normalizing unchanged', () => {
    expect(seedData()).toEqual(seed)
    expect(normalizeProfile(seed.profile)).toEqual(seed.profile)
  })
  it('contains no personal details', () => {
    expect(JSON.stringify(seed)).not.toMatch(/@|\d{6,}/)
  })
})

describe('startingData (data/seed.json)', () => {
  it('falls back to the generic seed when there is no seed file or it is not an export', () => {
    for (const raw of [undefined, null, {}, { format: 'other' }, 'text']) expect(startingData(raw)).toEqual(seedData())
  })
  it('uses a valid export and marks the profile as seeded', () => {
    expect(loaded.profile.seeded).toBe(true)
    expect(loaded.profile.personal.fullName).toEqual({ mn: 'Тест Хүн', en: 'Test Person' })
    expect(loaded.applications).toHaveLength(2)
  })
  it('keeps the profile seeded even if the file said otherwise', () => {
    const raw = JSON.parse(JSON.stringify(fixture)) as { profile: { seeded: boolean } }
    raw.profile.seeded = false
    expect(startingData(raw).profile.seeded).toBe(true)
  })
})

describe('the fixture has every kind of data', () => {
  const p = loaded.profile
  it('sections', () => {
    expect(p.education).toHaveLength(2)
    expect(p.experience).toHaveLength(4)
    expect(p.volunteer).toHaveLength(5)
    expect(p.awards).toHaveLength(6)
    expect(p.projects).toHaveLength(2)
    expect(p.answerBank).toHaveLength(1)
    expect(p.volunteer[4].hours).toBe(20)
    expect(p.experience[3].endDate).toBe('present')
    expect(p.personal.phone + p.personal.email + p.personal.birthDate).toBe('')
  })
  it('has unique ids and survives normalizing unchanged', () => {
    const ids = Object.values(p).flatMap((v) => (Array.isArray(v) ? v.map((e) => e.id) : []))
    expect(new Set(ids).size).toBe(ids.length)
    expect(normalizeProfile(p)).toEqual(p)
  })
  it('applications and folders', () => {
    const [first, second] = loaded.applications
    expect(first.status).toBe('in-progress')
    expect(first.steps.map((s) => s.done)).toEqual([true, true, false, false])
    expect(first.answers[0].answerId).toBe(p.answerBank[0].id)
    expect(second.steps.map((s) => s.done)).toEqual([false, true, false, false])
    expect(second.steps[2].title).toContain('volunteer.pdf')
    expect(loaded.files.folders).toHaveLength(6)
  })
  it('the answer fits its character limit', () => {
    const a = p.answerBank[0]
    expect(a.characterLimit).toBe(400)
    expect(isOverLimit(a.answer, a.characterLimit)).toBe(false)
  })
})

describe('export / import bundle', () => {
  it('round-trips with no data loss', () => {
    const json = JSON.stringify(buildBundle(loaded.profile, loaded.applications, loaded.files, new Date(0)))
    const back = parseBundle(JSON.parse(json))!
    expect(back.profile).toEqual(loaded.profile)
    expect(back.applications).toEqual(loaded.applications)
    expect(back.files).toEqual(loaded.files)
  })
  it('adds the derived "used in" list to answers', () => {
    const b = buildBundle(loaded.profile, loaded.applications, loaded.files, new Date(0))
    expect(b.profile.answerBank[0].usedIn).toEqual([loaded.applications[0].id])
  })
  it('refuses files that are not a Ponder export', () => {
    expect(parseBundle({ hello: 1 })).toBeNull()
    expect(parseBundle(null)).toBeNull()
    expect(parseBundle({ format: 'ponder-profile', version: 99 })).toBeNull()
  })
  it('cleans up a hand-edited bundle instead of crashing', () => {
    const b = parseBundle({ format: 'ponder-profile', version: 1, profile: { education: ['x'] } })!
    expect(b.profile.education).toHaveLength(0)
    expect(b.applications).toEqual([])
  })
})

describe('JSON Resume mapper', () => {
  const { profile } = loaded
  const r = toJsonResume(profile, 'en')

  it('maps basics', () => {
    expect(r.basics.name).toBe('Test Person')
    expect(toJsonResume(profile, 'mn').basics.name).toBe('Тест Хүн')
  })
  it('maps the sections JSON Resume knows', () => {
    expect(r.education?.[0]).toMatchObject({ institution: 'Example University', startDate: '2024' })
    expect(r.work?.some((w) => w.name === 'Example Software Co' && w.endDate === undefined)).toBe(true)
    expect(r.volunteer).toHaveLength(5)
    expect(r.awards).toHaveLength(6)
    expect(r.projects?.length).toBe(2)
  })
  it('falls back to the other language when one is empty', () => {
    const w = r.work?.find((x) => x.name === 'Example Software Co')
    expect(w?.summary).toContain('frontend')
  })
  it('leaves out entries switched off for the CV', () => {
    const p = { ...profile, awards: profile.awards.map((a, i) => (i === 0 ? { ...a, includeInCv: false } : a)) }
    expect(toJsonResume(p, 'en').awards).toHaveLength(5)
  })
  it('lists applications sorted without crashing', () => {
    expect(filterSortApplications(loaded.applications, 'all', 'deadline')).toHaveLength(2)
  })
})
