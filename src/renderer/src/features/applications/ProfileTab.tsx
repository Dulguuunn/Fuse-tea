import { useState } from 'react'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { answerUsedIn } from '@shared/applications'
import type { Bi, ListSection } from '@shared/profile'
import { useApplications } from '../../state/applicationsStore'
import { useProfile } from '../../state/profileStore'
import { useUi } from '../../state/uiStore'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FilesField } from './FilesField'
import {
  BiField,
  BiLongField,
  DateField,
  LongField,
  NumberField,
  SelectField,
  TagsField,
  TextField
} from './fields'
import { SECTIONS, SECTION_ORDER, titleOf, type FieldDef } from './sectionConfig'
import { exportEverything, exportJson, importExport } from './transfer'

type Rec = Record<string, unknown>

function PersonalSection(): React.JSX.Element {
  const personal = useProfile((s) => s.profile.personal)
  const setPersonal = useProfile((s) => s.setPersonal)
  return (
    <div className="entry-form">
      <div className="span-2">
        <BiField label="Full name" value={personal.fullName} onChange={(fullName) => setPersonal((p) => ({ ...p, fullName }))} />
      </div>
      <DateField label="Birth date" value={personal.birthDate} onChange={(birthDate) => setPersonal((p) => ({ ...p, birthDate }))} />
      <TextField label="Phone" type="tel" value={personal.phone} onChange={(phone) => setPersonal((p) => ({ ...p, phone }))} />
      <TextField label="Email" type="email" value={personal.email} onChange={(email) => setPersonal((p) => ({ ...p, email }))} />
      <TextField label="Address" value={personal.address} onChange={(address) => setPersonal((p) => ({ ...p, address }))} />
      <TextField
        label="GitHub"
        value={personal.links.github}
        onChange={(github) => setPersonal((p) => ({ ...p, links: { ...p.links, github } }))}
      />
      <TextField
        label="LinkedIn"
        value={personal.links.linkedin}
        onChange={(linkedin) => setPersonal((p) => ({ ...p, links: { ...p.links, linkedin } }))}
      />
      <TextField
        label="Portfolio"
        value={personal.links.portfolio}
        onChange={(portfolio) => setPersonal((p) => ({ ...p, links: { ...p.links, portfolio } }))}
      />
    </div>
  )
}

function FieldView({ def, entry, set }: { def: FieldDef; entry: Rec; set(key: string, value: unknown): void }): React.JSX.Element {
  const value = entry[def.key]
  switch (def.kind) {
    case 'text':
      return <TextField label={def.label} value={String(value ?? '')} onChange={(v) => set(def.key, v)} />
    case 'long':
      return (
        <div className="span-2">
          <LongField
            label={def.label}
            value={String(value ?? '')}
            limit={def.limitKey ? ((entry[def.limitKey] as number | null) ?? null) : null}
            rows={def.limitKey ? 6 : 2}
            onChange={(v) => set(def.key, v)}
          />
        </div>
      )
    case 'bi':
      return (
        <div className="span-2">
          <BiField label={def.label} value={value as Bi} onChange={(v) => set(def.key, v)} />
        </div>
      )
    case 'bilong':
      return (
        <div className="span-2">
          <BiLongField label={def.label} value={value as Bi} onChange={(v) => set(def.key, v)} />
        </div>
      )
    case 'date':
      return <DateField label={def.label} value={String(value ?? '')} allowPresent={def.present} onChange={(v) => set(def.key, v)} />
    case 'select':
      return <SelectField label={def.label} value={String(value)} options={def.options} onChange={(v) => set(def.key, v)} />
    case 'number':
      return <NumberField label={def.label} value={(value as number | null) ?? null} onChange={(v) => set(def.key, v)} />
    case 'tags':
      return <TagsField label={def.label} value={(value as string[]) ?? []} onChange={(v) => set(def.key, v)} />
  }
}

function EntryEditor({ section, entry, onDelete }: { section: ListSection; entry: Rec; onDelete(): void }): React.JSX.Element {
  const updateEntry = useProfile((s) => s.updateEntry)
  const apps = useApplications((s) => s.apps)
  const id = String(entry.id)
  const set = (key: string, value: unknown): void => updateEntry(section, id, { [key]: value } as never)
  const hasFiles = section !== 'answerBank'
  const usedIn = section === 'answerBank' ? answerUsedIn(apps, id).map((a) => apps.find((x) => x.id === a)?.name || 'Untitled application') : []

  return (
    <div className="entry-body">
      <div className="entry-form">
        {SECTIONS[section].fields.map((def) => (
          <FieldView key={def.key} def={def} entry={entry} set={set} />
        ))}
        {hasFiles && (
          <div className="span-2">
            <FilesField label="Proof files" fileIds={(entry.fileIds as string[]) ?? []} onChange={(ids) => set('fileIds', ids)} />
          </div>
        )}
        {section === 'answerBank' && (
          <p className="muted span-2">{usedIn.length > 0 ? `Used in: ${usedIn.join(', ')}` : 'Not used in any application yet.'}</p>
        )}
      </div>
      <div className="entry-foot">
        {hasFiles && (
          <label className="check">
            <input type="checkbox" checked={entry.includeInCv !== false} onChange={(e) => set('includeInCv', e.target.checked)} />
            Include in CV
          </label>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn-ghost danger-text" onClick={onDelete}>
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </div>
  )
}

function Section({ section }: { section: ListSection }): React.JSX.Element {
  const def = SECTIONS[section]
  const entries = useProfile((s) => s.profile[section]) as unknown as unknown as Array<Rec & { id: string }>
  const addEntry = useProfile((s) => s.addEntry)
  const removeEntry = useProfile((s) => s.removeEntry)
  const restoreEntry = useProfile((s) => s.restoreEntry)
  const showToast = useUi((s) => s.showToast)
  const [open, setOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const remove = (id: string): void => {
    const title = titleOf(section, entries.find((e) => e.id === id) as never)
    const removed = removeEntry(section, id)
    if (!removed) return
    setOpenId(null)
    showToast({ message: `Deleted “${title}”`, actionLabel: 'Undo', onAction: () => restoreEntry(section, removed.entry, removed.index) })
  }

  return (
    <section className="p-section" data-open={open || undefined}>
      <button type="button" className="p-section-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ChevronRight size={16} />
        <h2>{def.title}</h2>
        <span className="muted">{entries.length}</span>
      </button>
      {open && (
        <div className="p-section-body">
          {entries.length === 0 && <p className="muted">{def.empty}</p>}
          {entries.map((e) => {
            const isOpen = openId === e.id
            const sub = def.subtitle(e)
            return (
              <article className="entry" key={e.id} data-open={isOpen || undefined}>
                <button type="button" className="entry-head" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : e.id)}>
                  <span className="entry-title">{titleOf(section, e as never) || 'Untitled'}</span>
                  {sub && <span className="muted entry-sub">{sub}</span>}
                  {e.includeInCv === false && <span className="muted entry-sub">Not on CV</span>}
                </button>
                {isOpen && <EntryEditor section={section} entry={e} onDelete={() => remove(e.id)} />}
              </article>
            )
          })}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setOpenId(addEntry(section))}
          >
            <Plus size={15} /> {def.addLabel}
          </button>
        </div>
      )}
    </section>
  )
}

/** Export and import everything in the Applications section (profile, applications, file list). */
function TransferSection(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [confirmImport, setConfirmImport] = useState(false)
  return (
    <section className="p-section" data-open={open || undefined}>
      <button type="button" className="p-section-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ChevronRight size={16} />
        <h2>Export and import</h2>
      </button>
      {open && (
        <div className="p-section-body">
          <p className="muted">
            A backup of your profile, applications and file list as one JSON file. The JSON also holds your profile in JSON Resume form,
            ready for CV tools. “Export with files” also copies the files themselves.
          </p>
          <div className="transfer-buttons">
            <button type="button" className="btn" onClick={() => void exportJson()}>
              Export JSON
            </button>
            <button type="button" className="btn" onClick={() => void exportEverything()}>
              Export with files
            </button>
            <button type="button" className="btn" onClick={() => setConfirmImport(true)}>
              Import…
            </button>
          </div>
        </div>
      )}
      {confirmImport && (
        <ConfirmDialog
          title="Import an export?"
          message="This replaces your profile, applications and file list with the ones in the export. Your current data is copied to the backups folder first."
          confirmLabel="Choose file…"
          onCancel={() => setConfirmImport(false)}
          onConfirm={() => {
            setConfirmImport(false)
            void importExport()
          }}
        />
      )}
    </section>
  )
}

export function ProfileTab(): React.JSX.Element {
  const [personalOpen, setPersonalOpen] = useState(true)
  return (
    <div className="profile">
      <p className="muted profile-intro">
        Write this once. Applications, the CV and the portfolio all read from it. Use the copy buttons to paste into online forms.
      </p>
      <section className="p-section" data-open={personalOpen || undefined}>
        <button type="button" className="p-section-head" aria-expanded={personalOpen} onClick={() => setPersonalOpen(!personalOpen)}>
          <ChevronRight size={16} />
          <h2>Personal</h2>
        </button>
        {personalOpen && (
          <div className="p-section-body">
            <PersonalSection />
          </div>
        )}
      </section>
      {SECTION_ORDER.map((s) => (
        <Section key={s} section={s} />
      ))}
      <TransferSection />
    </div>
  )
}
