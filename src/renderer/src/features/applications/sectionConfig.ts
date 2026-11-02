// What each profile section looks like in the UI: its title and the fields of an entry. The data shape is in
// shared/profile.ts; this only says how to edit it.
import {
  EMPLOYMENT_TYPES,
  PROJECT_STATUSES,
  SKILL_CATEGORIES,
  entryLabel,
  type EntrySection,
  type ListSection,
  type Profile
} from '@shared/profile'
import { dateRange } from './format'

type Opt = ReadonlyArray<readonly [string, string]>

export type FieldDef =
  | { kind: 'text'; key: string; label: string }
  | { kind: 'long'; key: string; label: string; limitKey?: string }
  | { kind: 'bi'; key: string; label: string }
  | { kind: 'bilong'; key: string; label: string }
  | { kind: 'date'; key: string; label: string; present?: boolean }
  | { kind: 'select'; key: string; label: string; options: Opt }
  | { kind: 'number'; key: string; label: string }
  | { kind: 'tags'; key: string; label: string }

export interface SectionDef {
  title: string
  /** Button text and empty-state wording. */
  addLabel: string
  empty: string
  fields: FieldDef[]
  /** Second line of a collapsed entry. */
  subtitle(entry: Record<string, unknown>): string
}

const options = (values: readonly string[], labels: Record<string, string> = {}): Opt =>
  values.map((v) => [v, labels[v] ?? v.charAt(0).toUpperCase() + v.slice(1).replace('-', ' ')] as const)

const range = (e: Record<string, unknown>): string => dateRange(String(e.startDate ?? ''), String(e.endDate ?? ''))

export const SECTIONS: Record<ListSection, SectionDef> = {
  education: {
    title: 'Education',
    addLabel: 'Add education',
    empty: 'Add your schools and programs.',
    fields: [
      { kind: 'bi', key: 'institution', label: 'Institution' },
      { kind: 'bi', key: 'program', label: 'Degree or program' },
      { kind: 'date', key: 'startDate', label: 'Start' },
      { kind: 'date', key: 'endDate', label: 'End', present: true },
      { kind: 'text', key: 'gpa', label: 'GPA' },
      { kind: 'long', key: 'notes', label: 'Notes' }
    ],
    subtitle: range
  },
  experience: {
    title: 'Experience',
    addLabel: 'Add experience',
    empty: 'Add jobs, clubs and other work.',
    fields: [
      { kind: 'bi', key: 'organization', label: 'Organization' },
      { kind: 'bi', key: 'role', label: 'Role' },
      { kind: 'select', key: 'employmentType', label: 'Type', options: options(EMPLOYMENT_TYPES) },
      { kind: 'date', key: 'startDate', label: 'Start' },
      { kind: 'date', key: 'endDate', label: 'End', present: true },
      { kind: 'bilong', key: 'description', label: 'Description (long, for applications)' },
      { kind: 'bilong', key: 'summary', label: 'Summary (short, for the CV)' },
      { kind: 'bilong', key: 'reasonForLeaving', label: 'Reason for leaving' },
      { kind: 'tags', key: 'tags', label: 'Tags' }
    ],
    subtitle: (e) => [range(e), String(e.employmentType ?? '')].filter(Boolean).join(' · ')
  },
  volunteer: {
    title: 'Volunteering',
    addLabel: 'Add volunteering',
    empty: 'Add volunteer work, with the hours and proof.',
    fields: [
      { kind: 'bi', key: 'activity', label: 'Activity' },
      { kind: 'bi', key: 'organization', label: 'Organization' },
      { kind: 'bi', key: 'role', label: 'Role' },
      { kind: 'date', key: 'startDate', label: 'Start' },
      { kind: 'date', key: 'endDate', label: 'End', present: true },
      { kind: 'number', key: 'hours', label: 'Hours' },
      { kind: 'bilong', key: 'impact', label: 'Result or impact' },
      { kind: 'bilong', key: 'summary', label: 'Summary (short, for the CV)' }
    ],
    subtitle: (e) => [range(e), typeof e.hours === 'number' ? `${e.hours} h` : ''].filter(Boolean).join(' · ')
  },
  awards: {
    title: 'Awards',
    addLabel: 'Add award',
    empty: 'Add awards, medals and certificates.',
    fields: [
      { kind: 'bi', key: 'title', label: 'Title' },
      { kind: 'bi', key: 'issuer', label: 'Issued by' },
      { kind: 'date', key: 'date', label: 'Date' },
      { kind: 'bilong', key: 'description', label: 'Description (long, for applications)' },
      { kind: 'bilong', key: 'summary', label: 'Summary (short, for the CV)' }
    ],
    subtitle: (e) => dateRange(String(e.date ?? ''), '')
  },
  skills: {
    title: 'Skills',
    addLabel: 'Add skill',
    empty: 'Add languages, frameworks and tools you use.',
    fields: [
      { kind: 'text', key: 'name', label: 'Skill' },
      {
        kind: 'select',
        key: 'category',
        label: 'Category',
        options: options(SKILL_CATEGORIES, { language: 'Programming language', framework: 'Framework', tool: 'Tool', soft: 'Soft skill' })
      },
      { kind: 'text', key: 'level', label: 'Level' }
    ],
    subtitle: (e) => [String(e.category ?? ''), String(e.level ?? '')].filter(Boolean).join(' · ')
  },
  languages: {
    title: 'Languages',
    addLabel: 'Add language',
    empty: 'Add the languages you speak.',
    fields: [
      { kind: 'text', key: 'language', label: 'Language' },
      { kind: 'text', key: 'level', label: 'Level' },
      { kind: 'text', key: 'certificate', label: 'Certificate' }
    ],
    subtitle: (e) => [String(e.level ?? ''), String(e.certificate ?? '')].filter(Boolean).join(' · ')
  },
  projects: {
    title: 'Projects',
    addLabel: 'Add project',
    empty: 'Add projects for your portfolio.',
    fields: [
      { kind: 'bi', key: 'name', label: 'Name' },
      { kind: 'select', key: 'status', label: 'Status', options: options(PROJECT_STATUSES) },
      { kind: 'bi', key: 'role', label: 'Your role' },
      { kind: 'tags', key: 'techStack', label: 'Tech stack' },
      { kind: 'text', key: 'link', label: 'Link' },
      { kind: 'bilong', key: 'description', label: 'Description (long, for applications)' },
      { kind: 'bilong', key: 'summary', label: 'Summary (short, for the CV)' }
    ],
    subtitle: (e) => String(e.status ?? '').replace('-', ' ')
  },
  answerBank: {
    title: 'Answer bank',
    addLabel: 'Add answer',
    empty: 'Save answers you reuse in applications.',
    fields: [
      { kind: 'long', key: 'question', label: 'Question' },
      { kind: 'long', key: 'answer', label: 'Answer', limitKey: 'characterLimit' },
      { kind: 'select', key: 'language', label: 'Language', options: [['mn', 'Монгол'], ['en', 'English']] },
      { kind: 'number', key: 'characterLimit', label: 'Character limit' },
      { kind: 'tags', key: 'tags', label: 'Tags' }
    ],
    subtitle: (e) => `${e.characterCount ?? 0} characters${e.characterLimit ? ` of ${e.characterLimit}` : ''}`
  }
}

export const SECTION_ORDER: ListSection[] = ['education', 'experience', 'volunteer', 'awards', 'skills', 'languages', 'projects', 'answerBank']

/** The collapsed title of an entry. */
export function titleOf(section: ListSection, entry: Profile[ListSection][number]): string {
  if (section === 'answerBank') return (entry as Profile['answerBank'][number]).question || 'New answer'
  return entryLabel(section as EntrySection, entry as Profile[EntrySection][number])
}
