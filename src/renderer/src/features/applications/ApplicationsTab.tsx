import { useMemo, useState } from 'react'
import { BookmarkPlus, ExternalLink, ListPlus, ListTodo, Plus, Trash2 } from 'lucide-react'
import {
  APPLICATION_TYPES,
  STATUSES,
  STATUS_LABELS,
  filterSortApplications,
  newStep,
  type AppAnswer,
  type Application,
  type SortKey,
  type StatusFilter
} from '@shared/applications'
import { Dialog } from '../../components/Dialog'
import { useApplications } from '../../state/applicationsStore'
import { useProfile } from '../../state/profileStore'
import { useUi } from '../../state/uiStore'
import { newId } from '@shared/id'
import { useToday } from '../../useToday'
import { FilesField } from './FilesField'
import { Badge, LongField, SelectField, TextField } from './fields'
import { STATUS_COLORS, relativeDay, shortDate } from './format'

const TYPE_OPTIONS = APPLICATION_TYPES.map((t) => [t, t.charAt(0).toUpperCase() + t.slice(1)] as const)
const FILTER_OPTIONS: Array<[StatusFilter, string]> = [
  ['open', 'Open'],
  ['all', 'All'],
  ...STATUSES.map((s): [StatusFilter, string] => [s, STATUS_LABELS[s]])
]
const SORT_OPTIONS: Array<[SortKey, string]> = [
  ['deadline', 'Deadline'],
  ['status', 'Status'],
  ['updated', 'Recently edited']
]

const guessLanguage = (text: string): 'mn' | 'en' => (/[Ѐ-ӿ]/.test(text) ? 'mn' : 'en')

/** Pick an answer from the answer bank to reuse in this application. */
function BankDialog({ onPick, onClose }: { onPick(id: string): void; onClose(): void }): React.JSX.Element {
  const bank = useProfile((s) => s.profile.answerBank)
  return (
    <Dialog title="Insert from answer bank" width={560} onClose={onClose}>
      {bank.length === 0 ? (
        <p className="muted">The answer bank is empty. Add answers in the Profile tab, or save one from an application.</p>
      ) : (
        <ul className="pick-list">
          {bank.map((a) => (
            <li key={a.id}>
              <button type="button" className="bank-row" onClick={() => onPick(a.id)}>
                <strong>{a.question || 'Untitled question'}</strong>
                <span className="muted">
                  {a.language === 'mn' ? 'Монгол' : 'English'} · {a.characterCount} characters
                  {a.tags.length > 0 && ` · ${a.tags.join(', ')}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}

function AnswerCard({ app, answer }: { app: Application; answer: AppAnswer }): React.JSX.Element {
  const change = useApplications((s) => s.change)
  const bankItem = useProfile((s) => s.profile.answerBank.find((b) => b.id === answer.answerId))
  const addEntry = useProfile((s) => s.addEntry)
  const updateEntry = useProfile((s) => s.updateEntry)
  const showToast = useUi((s) => s.showToast)
  const setAnswer = (patch: Partial<AppAnswer>): void =>
    change(app.id, (a) => ({ ...a, answers: a.answers.map((x) => (x.id === answer.id ? { ...x, ...patch } : x)) }))
  const differs = bankItem !== undefined && (bankItem.answer !== answer.answer || bankItem.question !== answer.question)

  return (
    <div className="answer-card">
      <TextField label="Question" value={answer.question} onChange={(question) => setAnswer({ question })} />
      <LongField
        label="Answer"
        rows={6}
        limit={bankItem?.characterLimit ?? null}
        value={answer.answer}
        onChange={(v) => setAnswer({ answer: v })}
      />
      <div className="answer-actions">
        {!bankItem && (
          <button
            type="button"
            className="btn btn-sm"
            disabled={!answer.answer.trim()}
            onClick={() => {
              const id = addEntry('answerBank', {
                question: answer.question,
                answer: answer.answer,
                language: guessLanguage(answer.answer)
              })
              setAnswer({ answerId: id })
              showToast({ message: 'Saved to the answer bank' })
            }}
          >
            <BookmarkPlus size={14} /> Save to answer bank
          </button>
        )}
        {differs && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              updateEntry('answerBank', bankItem.id, { question: answer.question, answer: answer.answer })
              showToast({ message: 'Answer bank updated' })
            }}
          >
            <BookmarkPlus size={14} /> Update answer bank
          </button>
        )}
        {bankItem && !differs && <span className="muted">Same as the answer bank</span>}
        <span className="spacer" />
        <button
          type="button"
          className="btn btn-sm btn-ghost danger-text"
          onClick={() => change(app.id, (a) => ({ ...a, answers: a.answers.filter((x) => x.id !== answer.id) }))}
        >
          <Trash2 size={14} /> Remove
        </button>
      </div>
    </div>
  )
}

function Steps({ app }: { app: Application }): React.JSX.Element {
  const change = useApplications((s) => s.change)
  const [title, setTitle] = useState('')
  const done = app.steps.filter((s) => s.done).length
  const setStep = (id: string, patch: Partial<Application['steps'][number]>): void =>
    change(app.id, (a) => ({ ...a, steps: a.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  const unfinished = app.steps.filter((s) => !s.done && !s.addToTodos)

  return (
    <section className="app-section" aria-label="Steps">
      <div className="field-head">
        <h3>Steps</h3>
        <span className="muted">
          {done} of {app.steps.length} done
        </span>
      </div>
      <ul className="steps">
        {app.steps.map((s) => (
          <li key={s.id} className="step" data-done={s.done || undefined}>
            <input type="checkbox" checked={s.done} aria-label={`Done: ${s.title}`} onChange={(e) => setStep(s.id, { done: e.target.checked })} />
            <input className="input step-title" aria-label="Step" value={s.title} onChange={(e) => setStep(s.id, { title: e.target.value })} />
            <button
              type="button"
              className="icon-btn"
              aria-pressed={s.addToTodos}
              aria-label={s.addToTodos ? `Remove “${s.title}” from to-dos` : `Add “${s.title}” to to-dos`}
              title={s.addToTodos ? 'In your to-dos (click to remove)' : 'Add to your to-dos'}
              onClick={() => setStep(s.id, { addToTodos: !s.addToTodos })}
            >
              <ListTodo size={16} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Delete step ${s.title}`}
              onClick={() => change(app.id, (a) => ({ ...a, steps: a.steps.filter((x) => x.id !== s.id) }))}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="step-add"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          change(app.id, (a) => ({ ...a, steps: [...a.steps, newStep(title.trim())] }))
          setTitle('')
        }}
      >
        <input className="input" value={title} placeholder="Add a step and press Enter" aria-label="New step" onChange={(e) => setTitle(e.target.value)} />
        {unfinished.length > 0 && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => change(app.id, (a) => ({ ...a, steps: a.steps.map((s) => (s.done ? s : { ...s, addToTodos: true })) }))}
          >
            <ListPlus size={15} /> Add unfinished to to-dos
          </button>
        )}
      </form>
    </section>
  )
}

function ApplicationEditor({ app, onDeleted }: { app: Application; onDeleted(): void }): React.JSX.Element {
  const patch = useApplications((s) => s.patch)
  const change = useApplications((s) => s.change)
  const remove = useApplications((s) => s.remove)
  const restore = useApplications((s) => s.restore)
  const showToast = useUi((s) => s.showToast)
  const bank = useProfile((s) => s.profile.answerBank)
  const today = useToday()
  const [bankOpen, setBankOpen] = useState(false)
  const set = (p: Partial<Application>): void => patch(app.id, p)

  const insertFromBank = (id: string): void => {
    const item = bank.find((b) => b.id === id)
    if (!item) return
    change(app.id, (a) => ({
      ...a,
      answers: [...a.answers, { id: newId(), question: item.question, answer: item.answer, answerId: item.id }]
    }))
    setBankOpen(false)
  }

  return (
    <div className="app-editor">
      <div className="app-editor-head">
        <input
          className="app-title-input"
          aria-label="Application name"
          placeholder="Application name"
          value={app.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <button
          type="button"
          className="btn btn-ghost danger-text"
          onClick={() => {
            const removed = remove(app.id)
            if (!removed) return
            onDeleted()
            showToast({
              message: `Deleted “${app.name || 'Untitled application'}”`,
              actionLabel: 'Undo',
              onAction: () => restore(removed.app, removed.index)
            })
          }}
        >
          <Trash2 size={15} /> Delete
        </button>
      </div>

      <div className="status-row" role="radiogroup" aria-label="Status">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={app.status === s}
            className="status-pill"
            style={app.status === s ? { background: STATUS_COLORS[s], color: 'var(--block-ink)', borderColor: 'transparent' } : undefined}
            onClick={() => set({ status: s })}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="entry-form">
        <TextField label="Organization" value={app.organization} onChange={(organization) => set({ organization })} />
        <SelectField label="Type" value={app.type} options={TYPE_OPTIONS} onChange={(type) => set({ type })} />
        <div className="field">
          <TextField label="Link" type="url" value={app.url} onChange={(url) => set({ url })} />
          {/^https?:\/\//i.test(app.url) && (
            <a className="link-open" href={app.url} target="_blank" rel="noreferrer">
              <ExternalLink size={13} /> Open in browser
            </a>
          )}
        </div>
        <TextField label="Amount or benefit" value={app.benefit} onChange={(benefit) => set({ benefit })} />
        <div className="field">
          <TextField label="Deadline" type="date" value={app.deadline} onChange={(deadline) => set({ deadline })} />
          <span className="muted hint">
            {app.deadline ? `${relativeDay(app.deadline, today)}. Shows on your calendar and in To-dos.` : 'Set a deadline to see it on your calendar.'}
          </span>
        </div>
        <TextField label="Result date" type="date" value={app.resultDate} onChange={(resultDate) => set({ resultDate })} />
      </div>

      <Steps app={app} />

      <section className="app-section" aria-label="Questions and answers">
        <div className="field-head">
          <h3>Questions and answers</h3>
          <span className="answer-buttons">
            <button type="button" className="btn btn-sm" onClick={() => setBankOpen(true)}>
              Insert from answer bank
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => change(app.id, (a) => ({ ...a, answers: [...a.answers, { id: newId(), question: '', answer: '', answerId: null }] }))}
            >
              <Plus size={14} /> Add question
            </button>
          </span>
        </div>
        {app.answers.length === 0 && <p className="muted">Questions this application asks, and what you answered.</p>}
        {app.answers.map((a) => (
          <AnswerCard key={a.id} app={app} answer={a} />
        ))}
      </section>

      <section className="app-section">
        <FilesField label="Attached files" fileIds={app.fileIds} onChange={(fileIds) => set({ fileIds })} />
      </section>

      <section className="app-section">
        <LongField label="Notes" rows={5} value={app.notes} onChange={(notes) => set({ notes })} />
      </section>
      {bankOpen && <BankDialog onPick={insertFromBank} onClose={() => setBankOpen(false)} />}
    </div>
  )
}

export function ApplicationsTab(): React.JSX.Element {
  const apps = useApplications((s) => s.apps)
  const add = useApplications((s) => s.add)
  const today = useToday()
  const [filter, setFilter] = useState<StatusFilter>('open')
  const [sort, setSort] = useState<SortKey>('deadline')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const shown = useMemo(() => filterSortApplications(apps, filter, sort), [apps, filter, sort])
  const selected = apps.find((a) => a.id === selectedId) ?? null

  return (
    <div className="apps-tab">
      <section className="app-list-pane" aria-label="Applications">
        <div className="app-toolbar">
          <button type="button" className="btn btn-primary" onClick={() => setSelectedId(add())}>
            <Plus size={15} /> New application
          </button>
          <div className="app-filters">
            <select className="select" aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value as StatusFilter)}>
              {FILTER_OPTIONS.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
            <select className="select" aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORT_OPTIONS.map(([v, t]) => (
                <option key={v} value={v}>
                  Sort: {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        {shown.length === 0 ? (
          <div className="empty-state">
            <strong>{apps.length === 0 ? 'No applications yet' : 'Nothing matches'}</strong>
            <span>{apps.length === 0 ? 'Add each scholarship or job you apply for and tick off the steps.' : 'Change the filter to see the others.'}</span>
          </div>
        ) : (
          <ul className="app-list">
            {shown.map((a) => {
              const done = a.steps.filter((s) => s.done).length
              const overdue = a.deadline !== '' && a.deadline < today && !['submitted', 'interview', 'accepted', 'rejected', 'withdrawn'].includes(a.status)
              return (
                <li key={a.id}>
                  <button type="button" className="app-row" aria-pressed={selectedId === a.id} onClick={() => setSelectedId(a.id)}>
                    <span className="app-row-top">
                      <span className="app-row-name">{a.name || 'Untitled application'}</span>
                      <Badge color={STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </span>
                    <span className="muted app-row-sub">
                      {[a.organization, a.type].filter(Boolean).join(' · ')}
                    </span>
                    <span className="app-row-meta">
                      <span className={overdue ? 'danger-text' : 'muted'}>
                        {a.deadline ? `Due ${shortDate(a.deadline)} (${relativeDay(a.deadline, today)})` : 'No deadline'}
                      </span>
                      <span className="muted">
                        {done}/{a.steps.length} steps
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <section className="app-detail-pane">
        {selected ? (
          <ApplicationEditor key={selected.id} app={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <div className="empty-state">
            <strong>Pick an application</strong>
            <span>Or add a new one. Deadlines show on your calendar.</span>
          </div>
        )}
      </section>
    </div>
  )
}
