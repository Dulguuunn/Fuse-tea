import { useState } from 'react'
import { validateSlot } from '@shared/calendarEdit'
import { parseISODate, toTimeInput } from '@shared/time'
import type { CalendarEvent } from '@shared/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Dialog } from '../../components/Dialog'
import { useCalendar } from '../../state/calendarStore'
import { ColorPicker, readTime, TimeRange } from './fields'
import { draftFromRepeat, RepeatField, repeatError, repeatFromDraft } from './RepeatField'

interface EventDialogProps {
  initial: CalendarEvent
  isNew: boolean
  weekStartsOn: 0 | 1
  onClose(): void
}

/** Create or edit an event: one-off on a date (an exam, a deadline) or repeating (a daily routine).
 *  Editing a repeating event changes every repeat. */
export function EventDialog({ initial, isNew, weekStartsOn, onClose }: EventDialogProps): React.JSX.Element {
  const saveEvent = useCalendar((s) => s.saveEvent)
  const deleteEvent = useCalendar((s) => s.deleteEvent)
  const [title, setTitle] = useState(initial.title)
  const [date, setDate] = useState(initial.date)
  const [start, setStart] = useState(toTimeInput(initial.start))
  const [end, setEnd] = useState(toTimeInput(initial.end))
  const [location, setLocation] = useState(initial.location)
  const [color, setColor] = useState(initial.color)
  const [repeat, setRepeat] = useState(() => draftFromRepeat(initial.repeat))
  const [tried, setTried] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const s = readTime(start, start === toTimeInput(initial.start) ? initial.start : undefined)
  const e = readTime(end, end === toTimeInput(initial.end) ? initial.end : undefined)
  const dirty =
    title !== initial.title ||
    date !== initial.date ||
    start !== toTimeInput(initial.start) ||
    end !== toTimeInput(initial.end) ||
    location !== initial.location ||
    color !== initial.color ||
    JSON.stringify(repeatFromDraft(repeat)) !== JSON.stringify(initial.repeat ?? null)
  const timeError = validateSlot(s, e)
  const titleError = title.trim() ? null : 'Give the event a title.'
  const dateError = date ? null : 'Pick a date.'
  const repeatProblem = repeatError(repeat, date)

  const save = (): void => {
    setTried(true)
    if (timeError || titleError || dateError || repeatProblem) return
    const rule = repeatFromDraft(repeat)
    saveEvent({
      id: initial.id,
      title: title.trim(),
      date,
      start: s!,
      end: e!,
      color,
      location: location.trim(),
      ...(rule ? { repeat: rule } : {})
    })
    onClose()
  }

  return (
    <Dialog
      title={isNew ? 'New event' : 'Edit event'}
      onClose={onClose}
      width={480}
      closeOnBackdrop={!dirty}
      footer={
        <>
          {!isNew && (
            <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirmDelete(true)}>
              Delete event
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save event
          </button>
        </>
      }
    >
      <form
        className="dialog-form"
        onSubmit={(ev) => {
          ev.preventDefault()
          save()
        }}
      >
        <label className="field">
          Title
          <input className="input" autoFocus value={title} placeholder="e.g. Calculus midterm" onChange={(ev) => setTitle(ev.target.value)} />
          {tried && titleError && <span className="field-error">{titleError}</span>}
        </label>
        <div className="form-row">
          <label className="field">
            {repeat.kind === 'none' ? 'Date' : 'Starts on'}
            <input className="input" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
            {tried && dateError && <span className="field-error">{dateError}</span>}
          </label>
          <div className="field grow">
            Time
            <TimeRange start={start} end={end} onStart={setStart} onEnd={setEnd} length={s !== null && e !== null ? e - s : null} />
          </div>
        </div>
        {timeError && (tried || (s !== null && e !== null)) && <span className="field-error">{timeError}</span>}
        <label className="field">
          Place
          <input className="input" value={location} placeholder="Optional" onChange={(ev) => setLocation(ev.target.value)} />
        </label>
        <RepeatField
          value={repeat}
          dateWeekday={date ? parseISODate(date).getDay() : 1}
          weekStartsOn={weekStartsOn}
          onChange={setRepeat}
        />
        {tried && repeatProblem && <span className="field-error">{repeatProblem}</span>}
        <ColorPicker value={color} onChange={setColor} />
        <button type="submit" hidden />
      </form>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete “${initial.title || 'this event'}”?`}
          message={repeat.kind === 'none' ? 'It is removed from the calendar.' : 'Every repeat of it is removed from the calendar.'}
          confirmLabel="Delete event"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteEvent(initial.id)
            onClose()
          }}
        />
      )}
    </Dialog>
  )
}
