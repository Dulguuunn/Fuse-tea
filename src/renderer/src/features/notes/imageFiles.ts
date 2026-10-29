import type { EditorView } from '@tiptap/pm/view'

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp'
}

export const IMAGE_ACCEPT = Object.keys(EXT).join(',')

export function imageFiles(list: FileList | null | undefined): File[] {
  return [...(list ?? [])].filter((f) => f.type in EXT)
}

/** Saves each image into the data folder and inserts it at `pos` (or at the cursor). */
export async function insertImages(view: EditorView, files: File[], pos?: number): Promise<void> {
  let at = pos
  for (const file of files) {
    try {
      const src = await window.api.attachments.saveImage(new Uint8Array(await file.arrayBuffer()), EXT[file.type])
      if (view.isDestroyed) return
      const node = view.state.schema.nodes.image.create({ src, alt: file.name })
      const tr =
        at === undefined
          ? view.state.tr.replaceSelectionWith(node)
          : view.state.tr.insert(Math.min(at, view.state.doc.content.size), node)
      view.dispatch(tr)
      if (at !== undefined) at += node.nodeSize
    } catch (e) {
      console.error('Could not add image', e)
      window.alert(`Couldn’t add “${file.name}”. Images must be PNG, JPG, GIF, WebP or BMP and under 25 MB.`)
    }
  }
}
