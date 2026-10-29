import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import type { Extensions } from '@tiptap/react'

/** Everything the note editor understands. Typing shortcuts come with these: "# " heading,
 *  "- " bullet list, "1. " numbered list, "[] " checkbox, "> " quote, "```" code block. */
export function editorExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' }
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight,
    Placeholder.configure({ placeholder: 'Start writing…' })
  ]
}
