import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { validateSlot } from '@shared/calendarEdit'
import { newId } from '@shared/id'
import { toTimeInput } from '@shared/time'
import type { ClassItem } from '@shared/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Dialog } from '../../components/Dialog'
import { useCalendar } from '../../state/calendarStore'
import { ColorPicker, readTime, TimeRange, weekdayName, weekdayOrder } from './fields'

interface Row {
  id: string
  weekday: number
  start: string
  end: string
  origStart?: number
  origEnd?: number
}

interface ClassDialogProps {
  initial: ClassItem
  isNew: boolean
  weekStartsOn: 0 | 1
  onClose(): void
}

/** Create or edit a class: name, room, color and one or more weekly time slots, each with its own length. */
export function ClassDialog({ initial, isNew, weekStartsOn, onClose }: ClassDialogProps): React.JSX.Element {
  const saveClass = useCalendar((s) => s.saveClass)
  const deleteClass = useCalendar((s) => s.deleteClass)
  const [name, setName] = useState(initial.name)
  const [room, setRoom] = useState(initial.room)
  const [color, setColor] = useState(initial.color)
  const [rows, setRows] = useState<Row[]>(() =>
    initial.sessions.map((s) => ({
      id: s.id,
      weekday: s.weekday,
      start: toTimeInput(s.start),
      end: toTimeInput(s.end),
      origStart: s.start,
      origEnd: s.end
    }))
  )
  const [tried, setTried] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const parsed = rows.map((r) => ({ ...r, s: readTime(r.start, r.origStart), e: readTime(r.end, r.origEnd) }))
  const errors = parsed.map((r) => validateSlot(r.s, r.e))
  const nameError = name.trim() ? null : 'Give the class a name.'

  const setRow = (id: string, patch: Partial<Row>): void =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const addRow = (): void => {
    const last = rows[rows.length - 1]
    const order = weekdayOrder(weekStartsOn)
    const nextDay = last ? order[(order.indexOf(last.weekday) + 2) % 7] : order[0]
    setRows([...rows, { id: newId(), weekday: nextDay, start: last?.start ?? '09:00', end: last?.end ?? '10:30' }])
  }

  const save = (): void => {
    setTried(true)
    if (nameError || errors.some(Boolean)) return
    saveClass({
      id: initial.id,
      name: name.trim(),
      room: room.trim(),
      color,
      sessions: parsed.map((r) => ({ id: r.id, weekday: r.weekday, start: r.s!, end: r.e! }))
    })
    onClose()
  }

  return (
    <Dialog
      title={isNew ? 'New class' : 'Edit class'}
      onClose={onClose}
      width={548}
      footer={
        <>
          {!isNew && (
            <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirmDelete(true)}>
              Delete class
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save class
          </button>
        </>
      }
    >
      <form
        className="dialog-form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="form-row">
          <label className="field grow">
            Name
            <input className="input" autoFocus value={name} placeholder="e.g. Physics" onChange={(e) => setName(e.target.value)} />
            {tried && nameError && <span className="field-error">{nameError}</span>}
          </label>
          <label className="field">
            Room
            <input className="input" value={room} placeholder="Optional" onChange={(e) => setRoom(e.target.value)} />
          </label>
        </div>

        <ColorPicker value={color} onChange={setColor} />

        <div className="field">
          Every week
          <ul className="session-list">
            {parsed.map((r, i) => (
              <li key={r.id}>
                <div className="session-row">
                  <select
                    className="select"
                    value={r.weekday}
                    aria-label="Day"
                    onChange={(e) => setRow(r.id, { weekday: Number(e.target.value) })}
                  >
                    {weekdayOrder(weekStartsOn).map((d) => (
                      <option key={d} value={d}>
                        {weekdayName(d)}
                      </option>
                    ))}
                  </select>
                  <TimeRange
                    start={r.start}
                    end={r.end}
                    onStart={(v) => setRow(r.id, { start: v, origStart: undefined })}
                    onEnd={(v) => setRow(r.id, { end: v, origEnd: undefined })}
                    length={r.s !== null && r.e !== null ? r.e - r.s : null}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Remove this time"
                    title="Remove this time"
                    disabled={rows.length === 1}
                    onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
                  >
                    <X size={15} />
                  </button>
                </div>
                {errors[i] && (tried || (r.s !== null && r.e !== null)) && <span className="field-error">{errors[i]}</span>}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost add-session" onClick={addRow}>
            <Plus size={15} /> Add another day
          </button>
        </div>
        <button type="submit" hidden />
      </form>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete “${initial.name || 'this class'}”?`}
          message="All of its weekly times are removed from the calendar."
          confirmLabel="Delete class"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteClass(initial.id)
            onClose()
          }}
        />
      )}
    </Dialog>
  )
}
