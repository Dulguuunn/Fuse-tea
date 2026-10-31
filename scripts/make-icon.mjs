// Builds the app icon from build/icon-source.jpg: crops a square (centered on the cloud) and writes
// build/icon.png (256 px) and build/icon.ico (16–256 px, PNG-compressed).
// Run: npx electron scripts/make-icon.mjs   (uses Electron's image decoder, no extra packages)
import { app, nativeImage } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'

const SIZES = [16, 24, 32, 48, 64, 128, 256]
const CENTER_X = 0.6 // horizontal center of the crop, as a fraction of the photo width

function squareCrop(img) {
  const { width, height } = img.getSize()
  const side = Math.min(width, height)
  const x = Math.round(Math.min(Math.max(width * CENTER_X - side / 2, 0), width - side))
  const y = Math.round((height - side) / 2)
  return img.crop({ x, y, width: side, height: side })
}

function ico(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + 16 * pngs.length
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4) // planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

app.whenReady().then(() => {
  const source = nativeImage.createFromPath('build/icon-source.jpg')
  if (source.isEmpty()) throw new Error('Could not read build/icon-source.jpg')
  const square = squareCrop(source)
  const pngs = SIZES.map((size) => ({
    size,
    data: square.resize({ width: size, height: size, quality: 'best' }).toPNG()
  }))
  mkdirSync('build', { recursive: true })
  writeFileSync('build/icon.png', pngs.find((p) => p.size === 256).data)
  writeFileSync('build/icon.ico', ico(pngs))
  console.log('wrote build/icon.png and build/icon.ico')
  app.quit()
})
