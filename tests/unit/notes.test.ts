import { describe, expect, it } from 'vitest'
import {
  countByNotebook,
  filterNotes,
  formatEdited,
  isEmptyNote,
  previewText,
  restoreNote,
  trashNotebookNotes
} from '@shared/notes'
import type { Note } from '@shared/types'

const note = (id: string, over: Partial<Note> = {}): Note => ({
  id,
  title: id,
  content: null,
  text: '',
  notebookId: null,
  pinned: false,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
  ...over
})

const ids = (notes: Note[]): string[] => notes.map((n) => n.id)

describe('filterNotes', () => {
  const notes = [
    note('old', { updatedAt: 1 }),
    note('new', { updatedAt: 5 }),
    note('pinned', { updatedAt: 0, pinned: true }),
    note('trashedA', { deletedAt: 10 }),
    note('trashedB', { deletedAt: 20 }),
    note('physics', { notebookId: 'b1', updatedAt: 3 })
  ]

  it('all: hides trashed notes, pinned first, then newest edited', () => {
    expect(ids(filterNotes(notes, { kind: 'all' }, ''))).toEqual(['pinned', 'new', 'physics', 'old'])
  })
  it('pinned: only pinned notes', () => {
    expect(ids(filterNotes(notes, { kind: 'pinned' }, ''))).toEqual(['pinned'])
  })
  it('notebook: only that notebook', () => {
    expect(ids(filterNotes(notes, { kind: 'notebook', id: 'b1' }, ''))).toEqual(['physics'])
  })
  it('trash: only trashed notes, most recently deleted first', () => {
    expect(ids(filterNotes(notes, { kind: 'trash' }, ''))).toEqual(['trashedB', 'trashedA'])
  })
  it('search matches title or text, ignoring case and regex characters', () => {
    const list = [note('a', { title: 'Lecture 3', text: 'Intro to C++ pointers' }), note('b', { title: 'Shopping' })]
    expect(ids(filterNotes(list, { kind: 'all' }, 'c++'))).toEqual(['a'])
    expect(ids(filterNotes(list, { kind: 'all' }, 'SHOP'))).toEqual(['b'])
    expect(ids(filterNotes(list, { kind: 'all' }, '   '))).toEqual(['a', 'b'])
  })
  it('search works with Cyrillic text', () => {
    const list = [note('mn', { text: 'Өнөөдрийн хичээл' })]
    expect(ids(filterNotes(list, { kind: 'all' }, 'өнөө'))).toEqual(['mn'])
  })
})

describe('previewText', () => {
  it('collapses whitespace', () => {
    expect(previewText('  hello\n\n   world  ')).toBe('hello world')
  })
  it('truncates long text with an ellipsis', () => {
    const p = previewText('x'.repeat(200), 120)
    expect(p.length).toBe(120)
    expect(p.endsWith('…')).toBe(true)
  })
})

describe('countByNotebook', () => {
  it('counts notes per notebook, ignoring trashed ones', () => {
    const counts = countByNotebook([
      note('a', { notebookId: 'b1' }),
      note('b', { notebookId: 'b1' }),
      note('c', { notebookId: 'b1', deletedAt: 5 }),
      note('d')
    ])
    expect(counts).toEqual({ b1: 2 })
  })
})

describe('trashNotebookNotes', () => {
  it('moves every live note of the notebook to the trash', () => {
    const changed = trashNotebookNotes([note('a', { notebookId: 'b1' }), note('b', { notebookId: 'b2' })], 'b1', 99)
    expect(changed).toEqual([note('a', { notebookId: 'b1', deletedAt: 99 })])
  })
})

describe('restoreNote', () => {
  it('clears deletedAt', () => {
    expect(restoreNote(note('a', { deletedAt: 5, notebookId: 'b1' }), new Set(['b1']))).toEqual(
      note('a', { notebookId: 'b1' })
    )
  })
  it('puts the note in no notebook when its notebook was deleted', () => {
    expect(restoreNote(note('a', { deletedAt: 5, notebookId: 'gone' }), new Set()).notebookId).toBeNull()
  })
})

describe('formatEdited', () => {
  const now = new Date(2026, 9, 29, 15, 0).getTime()
  it('just now', () => {
    expect(formatEdited(now - 20_000, now, '24h')).toBe('Just now')
  })
  it('earlier today shows the time', () => {
    expect(formatEdited(new Date(2026, 9, 29, 9, 5).getTime(), now, '24h')).toBe('09:05')
  })
  it('yesterday', () => {
    expect(formatEdited(new Date(2026, 9, 28, 23, 0).getTime(), now, '24h')).toBe('Yesterday')
  })
  it('this week shows the weekday', () => {
    expect(formatEdited(new Date(2026, 9, 26, 12, 0).getTime(), now, '24h')).toBe('Mon')
  })
  it('older this year shows month and day', () => {
    expect(formatEdited(new Date(2026, 8, 3).getTime(), now, '24h')).toBe('Sep 3')
  })
  it('previous years include the year', () => {
    expect(formatEdited(new Date(2025, 11, 31).getTime(), now, '24h')).toBe('Dec 31, 2025')
  })
})

describe('isEmptyNote', () => {
  const image = { type: 'doc', content: [{ type: 'image', attrs: { src: 'attachment://file/x.png' } }] }
  const blankParagraph = { type: 'doc', content: [{ type: 'paragraph' }] }

  it('is empty with no title, no text and no content', () => {
    expect(isEmptyNote(note('a', { title: '' }))).toBe(true)
  })
  it('treats spaces and blank lines as empty', () => {
    expect(isEmptyNote(note('a', { title: '   ', text: '\n  \n', content: blankParagraph }))).toBe(true)
  })
  it('is not empty with a title', () => {
    expect(isEmptyNote(note('a', { title: 'Lab' }))).toBe(false)
  })
  it('is not empty with text', () => {
    expect(isEmptyNote(note('a', { title: '', text: 'hi' }))).toBe(false)
  })
  it('is not empty when it only holds an image', () => {
    expect(isEmptyNote(note('a', { title: '', text: '', content: image }))).toBe(false)
  })
})
