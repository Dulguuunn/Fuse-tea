// The "About me" profile: one typed document that applications, files and (later) the CV builder read.
// No UI code here. Field names follow JSON Resume where there is a match (see jsonResume.ts).
import { bool, id, isObj, list, oneOf, str, strList, type Obj } from './guards'
import { newId } from './id'
import { countChars } from './text'

/** Text in Mongolian and English. Either side may be empty. */
export interface Bi {
  mn: string
  en: string
}

/** 'YYYY', 'YYYY-MM', 'YYYY-MM-DD', 'present' (end dates only) or '' when unknown. */
export type PartialDate = string

/** Every entry in a list section has these. */
export interface EntryBase {
  id: string
  /** Show this entry on the CV. */
  includeInCv: boolean
  /** Proof documents (ids from the file storage). */
  fileIds: string[]
}

export interface Personal {
  fullName: Bi
  birthDate: string
  phone: string
  email: string
  address: string
  links: { github: string; linkedin: string; portfolio: string }
}

export interface Education extends EntryBase {
  institution: Bi
  program: Bi
  startDate: PartialDate
  endDate: PartialDate
  gpa: string
  notes: string
}

export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'volunteer'] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export interface Experience extends EntryBase {
  organization: Bi
  role: Bi
  employmentType: EmploymentType
  startDate: PartialDate
  endDate: PartialDate
  /** Long text, for applications. */
  description: Bi
  /** Short text, for a CV. */
  summary: Bi
  reasonForLeaving: Bi
  tags: string[]
}

export interface Volunteer extends EntryBase {
  activity: Bi
  organization: Bi
  role: Bi
  startDate: PartialDate
  endDate: PartialDate
  hours: number | null
  /** Result or impact. */
  impact: Bi
  summary: Bi
}

export interface Award extends EntryBase {
  title: Bi
  issuer: Bi
  date: PartialDate
  description: Bi
  summary: Bi
}

export const SKILL_CATEGORIES = ['language', 'framework', 'tool', 'soft'] as const
export type SkillCategory = (typeof SKILL_CATEGORIES)[number]

export interface Skill extends EntryBase {
  name: string
  category: SkillCategory
  level: string
}

export interface LanguageSkill extends EntryBase {
  language: string
  level: string
  certificate: string
}

export const PROJECT_STATUSES = ['planned', 'in-progress', 'done', 'paused'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface Project extends EntryBase {
  name: Bi
  description: Bi
  summary: Bi
  techStack: string[]
  role: Bi
  link: string
  status: ProjectStatus
}

/** A reusable answer to a common application question. */
export interface AnswerItem {
  id: string
  question: string
  answer: string
  language: 'mn' | 'en'
  /** Longest allowed answer in characters, or null for no limit. */
  characterLimit: number | null
  /** Always recomputed from `answer` when saved. */
  characterCount: number
  tags: string[]
}

export interface Profile {
  version: 1
  /** True once the starting data was loaded, so it is never loaded twice. */
  seeded: boolean
  personal: Personal
  education: Education[]
  experience: Experience[]
  volunteer: Volunteer[]
  awards: Award[]
  skills: Skill[]
  languages: LanguageSkill[]
  projects: Project[]
  answerBank: AnswerItem[]
}

/** The sections that are lists of entries. */
export type ListSection = 'education' | 'experience' | 'volunteer' | 'awards' | 'skills' | 'languages' | 'projects' | 'answerBank'
/** The list sections whose entries can carry proof files. */
export type EntrySection = Exclude<ListSection, 'answerBank'>
export const ENTRY_SECTIONS: readonly EntrySection[] = [
  'education',
  'experience',
  'volunteer',
  'awards',
  'skills',
  'languages',
  'projects'
]

export const emptyBi = (): Bi => ({ mn: '', en: '' })

export function emptyProfile(): Profile {
  return {
    version: 1,
    seeded: false,
    personal: {
      fullName: emptyBi(),
      birthDate: '',
      phone: '',
      email: '',
      address: '',
      links: { github: '', linkedin: '', portfolio: '' }
    },
    education: [],
    experience: [],
    volunteer: [],
    awards: [],
    skills: [],
    languages: [],
    projects: [],
    answerBank: []
  }
}

// ---------- normalizing ----------

const bi = (v: unknown): Bi => (isObj(v) ? { mn: str(v.mn), en: str(v.en) } : emptyBi())
const partialDate = (v: unknown): PartialDate =>
  typeof v === 'string' && /^(\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?|present)$/.test(v) ? v : ''
/** True for '' and anything the profile accepts as a date. */
export const isPartialDate = (s: string): boolean => s === '' || partialDate(s) === s
const endDate = partialDate
const startDate = (v: unknown): PartialDate => (v === 'present' ? '' : partialDate(v))
const base = (r: Obj): EntryBase => ({
  id: id(r.id) ?? newId(),
  includeInCv: r.includeInCv === undefined ? true : bool(r.includeInCv),
  fileIds: strList(r.fileIds)
})

const normalizers = {
  education: (r: Obj): Education => ({
    ...base(r),
    institution: bi(r.institution),
    program: bi(r.program),
    startDate: startDate(r.startDate),
    endDate: endDate(r.endDate),
    gpa: str(r.gpa),
    notes: str(r.notes)
  }),
  experience: (r: Obj): Experience => ({
    ...base(r),
    organization: bi(r.organization),
    role: bi(r.role),
    employmentType: oneOf(r.employmentType, EMPLOYMENT_TYPES, 'part-time'),
    startDate: startDate(r.startDate),
    endDate: endDate(r.endDate),
    description: bi(r.description),
    summary: bi(r.summary),
    reasonForLeaving: bi(r.reasonForLeaving),
    tags: strList(r.tags)
  }),
  volunteer: (r: Obj): Volunteer => ({
    ...base(r),
    activity: bi(r.activity),
    organization: bi(r.organization),
    role: bi(r.role),
    startDate: startDate(r.startDate),
    endDate: endDate(r.endDate),
    hours: typeof r.hours === 'number' && Number.isFinite(r.hours) && r.hours >= 0 ? r.hours : null,
    impact: bi(r.impact),
    summary: bi(r.summary)
  }),
  awards: (r: Obj): Award => ({
    ...base(r),
    title: bi(r.title),
    issuer: bi(r.issuer),
    date: startDate(r.date),
    description: bi(r.description),
    summary: bi(r.summary)
  }),
  skills: (r: Obj): Skill => ({
    ...base(r),
    name: str(r.name),
    category: oneOf(r.category, SKILL_CATEGORIES, 'tool'),
    level: str(r.level)
  }),
  languages: (r: Obj): LanguageSkill => ({
    ...base(r),
    language: str(r.language),
    level: str(r.level),
    certificate: str(r.certificate)
  }),
  projects: (r: Obj): Project => ({
    ...base(r),
    name: bi(r.name),
    description: bi(r.description),
    summary: bi(r.summary),
    techStack: strList(r.techStack),
    role: bi(r.role),
    link: str(r.link),
    status: oneOf(r.status, PROJECT_STATUSES, 'in-progress')
  }),
  answerBank: (r: Obj): AnswerItem => {
    const answer = str(r.answer)
    const limit = typeof r.characterLimit === 'number' && Number.isInteger(r.characterLimit) && r.characterLimit > 0
    return {
      id: id(r.id) ?? newId(),
      question: str(r.question),
      answer,
      language: oneOf(r.language, ['mn', 'en'] as const, 'en'),
      characterLimit: limit ? (r.characterLimit as number) : null,
      characterCount: countChars(answer),
      tags: strList(r.tags)
    }
  }
}

function section<K extends ListSection>(raw: unknown, key: K): Array<ReturnType<(typeof normalizers)[K]>> {
  const fn = normalizers[key] as (r: Obj) => ReturnType<(typeof normalizers)[K]>
  return list(raw).flatMap((e) => (isObj(e) ? [fn(e)] : []))
}

export function normalizeProfile(raw: unknown): Profile {
  const r = isObj(raw) ? raw : {}
  const p = isObj(r.personal) ? r.personal : {}
  const links = isObj(p.links) ? p.links : {}
  return {
    version: 1,
    seeded: bool(r.seeded),
    personal: {
      fullName: bi(p.fullName),
      birthDate: str(p.birthDate),
      phone: str(p.phone),
      email: str(p.email),
      address: str(p.address),
      links: { github: str(links.github), linkedin: str(links.linkedin), portfolio: str(links.portfolio) }
    },
    education: section(r.education, 'education'),
    experience: section(r.experience, 'experience'),
    volunteer: section(r.volunteer, 'volunteer'),
    awards: section(r.awards, 'awards'),
    skills: section(r.skills, 'skills'),
    languages: section(r.languages, 'languages'),
    projects: section(r.projects, 'projects'),
    answerBank: section(r.answerBank, 'answerBank')
  }
}

const pick = (b: Bi): string => b.en || b.mn

/** A short name for an entry, for lists and for "this file proves …" links. */
export function entryLabel(section: EntrySection, e: Profile[EntrySection][number]): string {
  const x = e as unknown as Record<string, unknown>
  const text = (k: string): string => (typeof x[k] === 'string' ? (x[k] as string) : isObj(x[k]) ? pick(bi(x[k])) : '')
  switch (section) {
    case 'education':
      return text('institution') || text('program') || 'Education'
    case 'experience':
      return [text('role'), text('organization')].filter(Boolean).join(', ') || 'Experience'
    case 'volunteer':
      return text('activity') || text('organization') || 'Volunteering'
    case 'awards':
      return text('title') || 'Award'
    case 'skills':
      return text('name') || 'Skill'
    case 'languages':
      return text('language') || 'Language'
    case 'projects':
      return text('name') || 'Project'
  }
}

/** A new, empty entry for a list section (normalizing an empty object gives exactly this). */
export function blankEntry<K extends ListSection>(key: K): Profile[K][number] {
  return normalizers[key]({}) as Profile[K][number]
}
