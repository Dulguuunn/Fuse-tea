// Dev helper: drives the BUILT app through the Applications section and saves screenshots into a folder.
// Usage: node scripts/shots-applications.mjs <outDir> [--theme light|dark]   (run `npm run build` first)
// Uses a fresh temp data folder, so your real data is never touched.
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { _electron as electron } from '@playwright/test'

const args = process.argv.slice(2)
const outDir = resolve(args.find((a) => !a.startsWith('--')) ?? 'test-results/applications')
const themeAt = args.indexOf('--theme')
const theme = themeAt >= 0 ? args[themeAt + 1] : 'dark'
mkdirSync(outDir, { recursive: true })

const dataDir = mkdtempSync(join(tmpdir(), 'notes-shots-'))
writeFileSync(join(dataDir, 'lock.json'), '{"enabled":false}')
// Made-up starting data, so the screenshots never show real details.
copyFileSync(join('tests', 'fixtures', 'seed.json'), join(dataDir, 'seed.json'))
// A tiny one-page PDF to upload.
const pdf = join(dataDir, 'volunteer.pdf')
writeFileSync(
  pdf,
  `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 20 Tf 30 100 Td (Volunteer certificate) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF`
)

const app = await electron.launch({ args: ['.'], env: { ...process.env, NOTES_DATA_DIR: dataDir } })
const win = await app.firstWindow()
win.on('pageerror', (err) => console.log(`[renderer exception] ${err.message}`))
win.on('console', (m) => m.type() === 'error' && console.log(`[renderer error] ${m.text()}`))
await win.locator('.app').waitFor()
await win.setViewportSize({ width: 1280, height: 800 })
await win.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
const shot = async (name) => {
  await win.waitForTimeout(400)
  await win.screenshot({ path: join(outDir, `${name}.png`) })
  console.log('saved', name)
}

await win.getByRole('button', { name: 'Applications', exact: true }).first().click()
await win.locator('.app-row').first().click()
await shot('1-applications')

await win.getByRole('radio', { name: 'Profile' }).click()
await win.getByRole('button', { name: /^Experience/ }).click()
await win.locator('.entry-head').first().click()
await shot('2-profile')

await win.getByRole('radio', { name: 'Files' }).click()
await win.locator('input[type=file]').first().setInputFiles([pdf, join(process.cwd(), 'build', 'icon.png')])
await win.waitForTimeout(500)
await win.locator('.file-row', { hasText: 'volunteer.pdf' }).click()
await win.waitForTimeout(1200)
await shot('3-files-pdf')

await app.close()
console.log('data:', dataDir)
