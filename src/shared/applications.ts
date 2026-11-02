// Scholarship / job applications. Pure data and logic; the UI and storage live elsewhere.
import { bool, id, isDate, isObj, list, num, oneOf, str, strList } from './guards'
import { newId } from './id'

export const STATUSES = ['draft', 'in-progress', 'submitted', 'interview', 'accepted', 'rejected', 'withdrawn'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  draft: 'Draft',
  'in-progress': 'In progress',
  submitted: 'Submitted',
  interview: 'Interview',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn'
}

export const APPLICATION_TYPES = ['scholarship', 'job', 'internship', 'program', 'other'] as const
export type ApplicationType = (typeof APPLICATION_TYPES)[number]

export interface Step {
  id: string
  title: string
  done: boolean
  /** Kept as a linked to-do (checking one checks the other). */
  addToTodos: boolean
}

/** A question this application asked, and the answer given. */
export interface AppAnswer {
  id: string
  question: string
  answer: string
  /** The answer-bank item this was inserted from or saved to, if any. */
  answerId: string | null
}

export interface Application {
  id: string
  name: string
  organization: string
  type: ApplicationType
  url: string
  /** 'YYYY-MM-DD' or ''. */
  deadline: string
  resultDate: string
  /** Amount or benefit, free text ("$2000 / year"). */
  benefit: string
  status: Status
  steps: Step[]
  answers: AppAnswer[]
  fileIds: string[]
  notes: string
  createdAt: number
  updatedAt: number
}

export const DEFAULT_STEP_TITLES = [
  'Read the requirements',
  'Fill in the form',
  'Write the essay',
  'Upload proof documents',
  'Submit',
  'Follow up on the result'
]

export const newStep = (title: string, done = false): Step => ({ id: newId(), title, done, addToTodos: false })

export function newApplication(now: number): Application {
  return {
    id: newId(),
    name: '',
    organization: '',
    type: 'scholarship',
    url: '',
    deadline: '',
    resultDate: '',
    benefit: '',
    status: 'draft',
    steps: DEFAULT_STEP_TITLES.map((t) => newStep(t)),
    answers: [],
    fileIds: [],
    notes: '',
    createdAt: now,
    updatedAt: now
  }
}

/** Submitted or later: nothing left to do before the deadline. */
export const isSubmittedOrLater = (s: Status): boolean => STATUSES.indexOf(s) >= STATUSES.indexOf('submitted')
/** Finished with: no further action expected. */
export const isFinished = (s: Status): boolean => s === 'accepted' || s === 'rejected' || s === 'withdrawn'

export function normalizeApplications(raw: unknown): Application[] {
  return list(raw).flatMap((a): Application[] => {
    if (!isObj(a)) return []
    const createdAt = num(a.createdAt, Date.now())
    return [
      {
        id: id(a.id) ?? newId(),
        name: str(a.name),
        organization: str(a.organization),
        type: oneOf(a.type, APPLICATION_TYPES, 'other'),
        url: str(a.url),
        deadline: isDate(a.deadline) ? a.deadline : '',
        resultDate: isDate(a.resultDate) ? a.resultDate : '',
        benefit: str(a.benefit),
        status: oneOf(a.status, STATUSES, 'draft'),
        steps: list(a.steps).flatMap((s): Step[] =>
          isObj(s) && str(s.title).trim()
            ? [{ id: id(s.id) ?? newId(), title: str(s.title), done: bool(s.done), addToTodos: bool(s.addToTodos) }]
            : []
        ),
        answers: list(a.answers).flatMap((x): AppAnswer[] =>
          isObj(x)
            ? [{ id: id(x.id) ?? newId(), question: str(x.question), answer: str(x.answer), answerId: id(x.answerId) }]
            : []
        ),
        fileIds: strList(a.fileIds),
        notes: str(a.notes),
        createdAt,
        updatedAt: num(a.updatedAt, createdAt)
      }
    ]
  })
}

export type StatusFilter = Status | 'all' | 'open'
export type SortKey = 'deadline' | 'status' | 'updated'

/** Filters ('open' hides accepted/rejected/withdrawn) and sorts without changing the input. */
export function filterSortApplications(apps: Application[], filter: StatusFilter, sort: SortKey): Application[] {
  const shown = apps.filter((a) => (filter === 'all' ? true : filter === 'open' ? !isFinished(a.status) : a.status === filter))
  const byDeadline = (a: Application, b: Application): number => {
    if (a.deadline === b.deadline) return b.updatedAt - a.updatedAt
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return a.deadline.localeCompare(b.deadline)
  }
  const cmp: Record<SortKey, (a: Application, b: Application) => number> = {
    deadline: byDeadline,
    status: (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || byDeadline(a, b),
    updated: (a, b) => b.updatedAt - a.updatedAt
  }
  return [...shown].sort(cmp[sort])
}

/** Ids of the applications whose answers came from this answer-bank item. */
export const answerUsedIn = (apps: Application[], answerId: string): string[] =>
  apps.filter((a) => a.answers.some((x) => x.answerId === answerId)).map((a) => a.id)
