import { useState } from 'react'
import { validateSlot } from '@shared/calendarEdit'
import { toTimeInput } from '@shared/time'
import type { CalendarEvent } from '@shared/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Dialog } from '../../components/Dialog'
import { useCalendar } from '../../state/calendarStore'
import { ColorPicker, readTime, TimeRange } from './fields'

interface EventDialogProps {
  initial: CalendarEvent
  isNew: boolean
  onClose(): void
}

/** Create or edit a one-off event on a specific date (an exam, a deadline, a meeting). */
export function EventDialog({ initial, isNew, onClose }: EventDialogProps): React.JSX.Element {
  const saveEvent = useCalendar((s) => s.saveEvent)
  const deleteEvent = useCalendar((s) => s.deleteEvent)
  const [title, setTitle] = useState(initial.title)
  const [date, setDate] = useState(initial.date)
  const [start, setStart] = useState(toTimeInput(initial.start))
  const [end, setEnd] = useState(toTimeInput(initial.end))
  const [location, setLocation] = useState(initial.location)
  const [color, setColor] = useState(initial.color)
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
    color !== initial.color
  const timeError = validateSlot(s, e)
  const titleError = title.trim() ? null : 'Give the event a title.'
  const dateError = date ? null : 'Pick a date.'

  const save = (): void => {
    setTried(true)
    if (timeError || titleError || dateError) return
    saveEvent({ id: initial.id, title: title.trim(), date, start: s!, end: e!, color, location: location.trim() })
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
            Date
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
        <ColorPicker value={color} onChange={setColor} />
        <button type="submit" hidden />
      </form>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete “${initial.title || 'this event'}”?`}
          message="It is removed from the calendar."
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
