import { useState, type ReactNode } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2
} from 'lucide-react'
import { Dialog } from '../../components/Dialog'

interface ToolProps {
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick(): void
  children: ReactNode
}

function Tool({ label, shortcut, active, disabled, onClick, children }: ToolProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="icon-btn tool"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      // Keep the text selection in the editor when clicking a tool.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function LinkDialog({ editor, onClose }: { editor: Editor; onClose(): void }): React.JSX.Element {
  const existing = (editor.getAttributes('link').href as string | undefined) ?? ''
  const [url, setUrl] = useState(existing)

  const apply = (): void => {
    const href = url.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (!href) {
      chain.unsetLink().run()
    } else {
      const full = /^[a-z]+:/i.test(href) ? href : `https://${href}`
      if (editor.state.selection.empty && !editor.isActive('link')) {
        chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href: full } }] }).run()
      } else {
        chain.setLink({ href: full }).run()
      }
    }
    onClose()
  }

  return (
    <Dialog
      title={existing ? 'Edit link' : 'Add link'}
      onClose={onClose}
      width={420}
      footer={
        <>
          {existing && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run()
                onClose()
              }}
            >
              Remove link
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={apply}>
            Save link
          </button>
        </>
      }
    >
      <label className="field">
        Web address
        <input
          className="input"
          autoFocus
          value={url}
          placeholder="example.com"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
        />
      </label>
      <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
        Ctrl+click a link in a note to open it in your browser.
      </p>
    </Dialog>
  )
}

export function EditorToolbar({ editor }: { editor: Editor }): React.JSX.Element {
  const [linkOpen, setLinkOpen] = useState(false)
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      highlight: e.isActive('highlight'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      task: e.isActive('taskList'),
      quote: e.isActive('blockquote'),
      code: e.isActive('codeBlock'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo()
    })
  })
  const run = (): ReturnType<Editor['chain']> => editor.chain().focus()

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
      <Tool label="Undo" shortcut="Ctrl+Z" disabled={!s.canUndo} onClick={() => run().undo().run()}>
        <Undo2 size={16} />
      </Tool>
      <Tool label="Redo" shortcut="Ctrl+Y" disabled={!s.canRedo} onClick={() => run().redo().run()}>
        <Redo2 size={16} />
      </Tool>
      <span className="tool-sep" />
      <Tool label="Heading 1" shortcut="# " active={s.h1} onClick={() => run().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={17} />
      </Tool>
      <Tool label="Heading 2" shortcut="## " active={s.h2} onClick={() => run().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={17} />
      </Tool>
      <Tool label="Heading 3" shortcut="### " active={s.h3} onClick={() => run().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={17} />
      </Tool>
      <span className="tool-sep" />
      <Tool label="Bold" shortcut="Ctrl+B" active={s.bold} onClick={() => run().toggleBold().run()}>
        <Bold size={16} />
      </Tool>
      <Tool label="Italic" shortcut="Ctrl+I" active={s.italic} onClick={() => run().toggleItalic().run()}>
        <Italic size={16} />
      </Tool>
      <Tool label="Underline" shortcut="Ctrl+U" active={s.underline} onClick={() => run().toggleUnderline().run()}>
        <Underline size={16} />
      </Tool>
      <Tool label="Strikethrough" shortcut="Ctrl+Shift+S" active={s.strike} onClick={() => run().toggleStrike().run()}>
        <Strikethrough size={16} />
      </Tool>
      <Tool label="Highlight" shortcut="Ctrl+Shift+H" active={s.highlight} onClick={() => run().toggleHighlight().run()}>
        <Highlighter size={16} />
      </Tool>
      <span className="tool-sep" />
      <Tool label="Bullet list" shortcut="- " active={s.bullet} onClick={() => run().toggleBulletList().run()}>
        <List size={17} />
      </Tool>
      <Tool label="Numbered list" shortcut="1. " active={s.ordered} onClick={() => run().toggleOrderedList().run()}>
        <ListOrdered size={17} />
      </Tool>
      <Tool label="Checklist" shortcut="[] " active={s.task} onClick={() => run().toggleTaskList().run()}>
        <ListChecks size={17} />
      </Tool>
      <span className="tool-sep" />
      <Tool label="Quote" shortcut="> " active={s.quote} onClick={() => run().toggleBlockquote().run()}>
        <Quote size={16} />
      </Tool>
      <Tool label="Code block" shortcut="```" active={s.code} onClick={() => run().toggleCodeBlock().run()}>
        <Code2 size={16} />
      </Tool>
      <Tool label="Link" active={s.link} onClick={() => setLinkOpen(true)}>
        <Link2 size={16} />
      </Tool>
      <Tool label="Divider line" shortcut="---" onClick={() => run().setHorizontalRule().run()}>
        <Minus size={16} />
      </Tool>
      {linkOpen && <LinkDialog editor={editor} onClose={() => setLinkOpen(false)} />}
    </div>
  )
}
