import { describe, expect, it } from 'vitest'
import {
  answerUsedIn,
  DEFAULT_STEP_TITLES,
  filterSortApplications,
  newApplication,
  normalizeApplications,
  type Application
} from '@shared/applications'

const app = (over: Partial<Application>): Application => ({ ...newApplication(1), id: 'a', ...over })

describe('newApplication', () => {
  it('starts as a draft with the default steps, all unchecked and not in to-dos', () => {
    const a = newApplication(5)
    expect(a.status).toBe('draft')
    expect(a.steps.map((s) => s.title)).toEqual(DEFAULT_STEP_TITLES)
    expect(a.steps.every((s) => !s.done && !s.addToTodos)).toBe(true)
    expect(new Set(a.steps.map((s) => s.id)).size).toBe(a.steps.length)
    expect(a.createdAt).toBe(5)
  })
})

describe('normalizeApplications', () => {
  it('cleans bad values and keeps good ones', () => {
    const [a, b] = normalizeApplications([
      {
        id: 'x',
        name: 'Acme',
        type: 'scholarship',
        status: 'interview',
        deadline: '2026-12-01',
        resultDate: 'soon',
        steps: [{ id: 's', title: 'Fill form', done: true }, 7, { title: '' }],
        answers: [{ id: 'q', question: 'Why?', answer: 'Because', answerId: 'bank1' }, null],
        fileIds: ['f1', 'f1', 3]
      },
      { status: 'nope', type: 'nope' },
      'junk'
    ])
    expect(a).toMatchObject({ id: 'x', status: 'interview', deadline: '2026-12-01', resultDate: '' })
    expect(a.steps).toHaveLength(1) // the number and the untitled step are dropped
    expect(a.steps[0]).toMatchObject({ id: 's', done: true, addToTodos: false })
    expect(a.answers).toEqual([{ id: 'q', question: 'Why?', answer: 'Because', answerId: 'bank1' }])
    expect(a.fileIds).toEqual(['f1'])
    expect(b).toMatchObject({ status: 'draft', type: 'other' })
  })
  it('returns [] for non-lists', () => {
    expect(normalizeApplications(undefined)).toEqual([])
    expect(normalizeApplications({})).toEqual([])
  })
})

describe('filterSortApplications', () => {
  const list = [
    app({ id: '1', name: 'late', deadline: '2026-12-20', status: 'in-progress' }),
    app({ id: '2', name: 'soon', deadline: '2026-11-10', status: 'draft' }),
    app({ id: '3', name: 'none', deadline: '', status: 'submitted' }),
    app({ id: '4', name: 'done', deadline: '2026-11-01', status: 'rejected' })
  ]
  it('sorts by deadline with undated last', () => {
    expect(filterSortApplications(list, 'all', 'deadline').map((a) => a.id)).toEqual(['4', '2', '1', '3'])
  })
  it('sorts by status in pipeline order', () => {
    expect(filterSortApplications(list, 'all', 'status').map((a) => a.id)).toEqual(['2', '1', '3', '4'])
  })
  it('filters by one status or by "open" (not finished)', () => {
    expect(filterSortApplications(list, 'draft', 'deadline').map((a) => a.id)).toEqual(['2'])
    expect(filterSortApplications(list, 'open', 'deadline').map((a) => a.id)).toEqual(['2', '1', '3'])
  })
})

describe('answerUsedIn', () => {
  it('lists the applications that use an answer-bank item', () => {
    const a = app({ id: 'a', answers: [{ id: '1', question: 'q', answer: 'x', answerId: 'bank' }] })
    const b = app({ id: 'b', answers: [{ id: '2', question: 'q', answer: 'x', answerId: null }] })
    expect(answerUsedIn([a, b], 'bank')).toEqual(['a'])
  })
})
