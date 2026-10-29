// Dev helper: launches the BUILT app (run `npm run build` first) and saves a screenshot.
// Usage: node scripts/screenshot.mjs [out.png] [--data <dir>] [--page Notes|To-dos|Calendar|Settings] [--theme light|dark]
// Without --data it uses a fresh temp folder, so your real notes are never touched.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron } from '@playwright/test'

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const out = args.find((a) => a.endsWith('.png')) ?? 'test-results/screenshot.png'
const dataDir = opt('--data') ?? mkdtempSync(join(tmpdir(), 'notes-shot-'))
const page = opt('--page')
const theme = opt('--theme')

const app = await electron.launch({ args: ['.'], env: { ...process.env, NOTES_DATA_DIR: dataDir } })
const win = await app.firstWindow()
win.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') console.log(`[renderer ${msg.type()}] ${msg.text()}`)
})
win.on('pageerror', (err) => console.log(`[renderer exception] ${err.message}`))
await win.waitForLoadState('domcontentloaded')
await win.setViewportSize({ width: 1280, height: 800 })
if (theme) await win.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
if (page) await win.getByRole('button', { name: page, exact: true }).first().click()
await win.waitForTimeout(700)
await win.screenshot({ path: out })
console.log(`saved ${out} (data: ${dataDir})`)
await app.close()
