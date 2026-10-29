// Draws the app icon (navy tile, notebook page, yellow highlighter stroke) without any image
// library, and writes build/icon.png (256 px) and build/icon.ico (16–256 px, PNG-compressed).
// Run: node scripts/make-icon.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const NAVY = [31, 42, 68]
const PAPER = [247, 248, 251]
const YELLOW = [255, 216, 77]
const SS = 4 // supersampling for smooth edges

/** Is (x, y) inside a rounded rectangle? Coordinates are fractions of the icon size. */
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

/** Color of one point, painting shapes back to front; null = transparent. */
function paint(x, y) {
  let c = null
  if (inRoundRect(x, y, 0.04, 0.04, 0.96, 0.96, 0.2)) c = NAVY
  if (inRoundRect(x, y, 0.23, 0.15, 0.77, 0.85, 0.06)) c = PAPER
  // Highlighter stroke, slightly tilted, across the middle line.
  const tilt = (x - 0.5) * -0.06
  if (inRoundRect(x, y + tilt, 0.28, 0.445, 0.72, 0.565, 0.03)) c = YELLOW
  // Ink lines on the page.
  const lines = [
    [0.31, 0.69, 0.32],
    [0.31, 0.69, 0.505],
    [0.31, 0.58, 0.69]
  ]
  for (const [lx0, lx1, ly] of lines) if (inRoundRect(x, y, lx0, ly - 0.022, lx1, ly + 0.022, 0.022)) c = NAVY
  return c
}

function render(size) {
  const px = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = paint((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size)
          if (c) {
            r += c[0]
            g += c[1]
            b += c[2]
            a++
          }
        }
      }
      const i = (y * size + x) * 4
      if (a) {
        px[i] = Math.round(r / a)
        px[i + 1] = Math.round(g / a)
        px[i + 2] = Math.round(b / a)
        px[i + 3] = Math.round((a / (SS * SS)) * 255)
      }
    }
  }
  return px
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(size) {
  const px = render(size)
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}
function ico(sizes) {
  const images = sizes.map(png)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(sizes.length, 4)
  let offset = 6 + 16 * sizes.length
  const entries = sizes.map((s, i) => {
    const e = Buffer.alloc(16)
    e[0] = s >= 256 ? 0 : s
    e[1] = s >= 256 ? 0 : s
    e.writeUInt16LE(1, 4) // planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(images[i].length, 8)
    e.writeUInt32LE(offset, 12)
    offset += images[i].length
    return e
  })
  return Buffer.concat([header, ...entries, ...images])
}

mkdirSync('build', { recursive: true })
writeFileSync('build/icon.png', png(256))
writeFileSync('build/icon.ico', ico([16, 24, 32, 48, 64, 128, 256]))
console.log('wrote build/icon.png and build/icon.ico')
