import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

async function launch(dataDir: string): Promise<{ app: ElectronApplication; win: Page }> {
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NOTES_DATA_DIR: dataDir } })
  const win = await app.firstWindow()
  await win.setViewportSize({ width: 1280, height: 800 })
  await win.locator('.app').waitFor()
  return { app, win }
}

/** A temp data folder with the lock off and, unless told otherwise, the made-up starting data as seed.json. */
const freshDataDir = (withSeed = true): string => {
  const dir = mkdtempSync(join(tmpdir(), 'notes-e2e-apps-'))
  writeFileSync(join(dir, 'lock.json'), '{"enabled":false}')
  if (withSeed) copyFileSync(join('tests', 'fixtures', 'seed.json'), join(dir, 'seed.json'))
  return dir
}

const todayISO = (): string => {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const openApplications = async (win: Page): Promise<void> => {
  await win.getByRole('button', { name: 'Applications', exact: true }).first().click()
  await win.locator('.apps-tab').waitFor()
}
const tab = (win: Page, name: string) => win.getByRole('radio', { name, exact: true })

test('without a seed.json the app starts with an empty profile and the usual folders', async () => {
  const { app, win } = await launch(freshDataDir(false))
  await openApplications(win)
  await expect(win.locator('.app-row')).toHaveCount(0)
  await tab(win, 'Profile').click()
  await expect(win.getByLabel('Full name (English)', { exact: true })).toHaveValue('')
  await tab(win, 'Files').click()
  await expect(win.locator('.folder-row', { hasText: 'Volunteer' })).toBeVisible()
  await app.close()
})

test('the starting data shows up once and is not added again after a restart', async () => {
  const dir = freshDataDir()
  let { app, win } = await launch(dir)
  await openApplications(win)
  await expect(win.locator('.app-row')).toHaveCount(2)
  await expect(win.locator('.app-row', { hasText: 'Example Bank scholarship' })).toContainText('2/4 steps')
  await tab(win, 'Profile').click()
  await expect(win.getByLabel('Full name (English)', { exact: true })).toHaveValue('Test Person')
  await expect(win.getByRole('button', { name: /^Volunteering/ })).toContainText('5')
  await expect(win.getByRole('button', { name: /^Awards/ })).toContainText('6')

  // Delete one application and edit the profile: neither comes back after a restart.
  await tab(win, 'Applications').click()
  await win.locator('.app-row', { hasText: 'Second scholarship' }).click()
  await win.getByRole('button', { name: 'Delete', exact: true }).click()
  await tab(win, 'Profile').click()
  await win.getByLabel('Phone', { exact: true }).fill('99112233')
  await app.close()
  ;({ app, win } = await launch(dir))
  await openApplications(win)
  await expect(win.locator('.app-row')).toHaveCount(1)
  await tab(win, 'Profile').click()
  await expect(win.getByLabel('Phone', { exact: true })).toHaveValue('99112233')
  await app.close()
})

test('an application deadline shows on the calendar, and a step added to to-dos stays in step with it', async () => {
  const { app, win } = await launch(freshDataDir())
  await openApplications(win)
  await win.getByRole('button', { name: 'New application' }).click()
  await win.getByLabel('Application name', { exact: true }).fill('Test grant')
  await win.getByLabel('Deadline', { exact: true }).fill(todayISO())
  await win.getByRole('radio', { name: 'In progress' }).click()
  await win.getByRole('button', { name: /Add .Fill in the form. to to-dos/ }).click()
  await win.screenshot({ path: 'test-results/e2e/application.png' })

  await win.getByRole('button', { name: 'Calendar', exact: true }).click()
  await expect(win.locator('.task-chip', { hasText: 'Deadline: Test grant' })).toBeVisible()

  // Checking the to-do ticks the step.
  await win.getByRole('button', { name: 'To-dos', exact: true }).click()
  await expect(win.locator('.task-group', { hasText: 'Test grant: Fill in the form' })).toBeVisible()
  await win.getByRole('checkbox', { name: /Mark .Test grant: Fill in the form. as done/ }).click()
  await openApplications(win)
  await win.locator('.app-row', { hasText: 'Test grant' }).click()
  await expect(win.getByLabel('Done: Fill in the form')).toBeChecked()
  await expect(win.getByText('1 of 6 done')).toBeVisible()

  // Unticking the step in the application unticks the to-do.
  await win.getByLabel('Done: Fill in the form').uncheck()
  await win.getByRole('button', { name: 'To-dos', exact: true }).click()
  await expect(win.getByRole('checkbox', { name: /Mark .Test grant: Fill in the form. as done/ })).toBeVisible()

  // Marking the application submitted completes its deadline to-do; deleting it removes both to-dos.
  await openApplications(win)
  await win.locator('.app-row', { hasText: 'Test grant' }).click()
  await win.getByRole('button', { name: 'Delete', exact: true }).click()
  await win.getByRole('button', { name: 'To-dos', exact: true }).click()
  await expect(win.locator('.task-group', { hasText: 'Test grant' })).toHaveCount(0)
  await app.close()
})

test('files can be added by button and by dragging in, previewed, linked and deleted', async () => {
  const dir = freshDataDir()
  const pdf = join(dir, 'volunteer.pdf')
  writeFileSync(pdf, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')
  const { app, win } = await launch(dir)
  await openApplications(win)
  await tab(win, 'Files').click()
  await expect(win.locator('.folder-row', { hasText: 'Volunteer' })).toBeVisible()

  await win.locator('.folder-row', { hasText: 'Volunteer' }).first().click()
  await win.locator('input[type=file]').first().setInputFiles(pdf)
  const row = win.locator('.file-row', { hasText: 'volunteer.pdf' })
  await expect(row).toBeVisible()
  await expect(win.locator('.file-detail iframe')).toBeVisible()
  await expect(win.locator('.file-detail')).toContainText('Proof / Volunteer')

  // Drag a file in from "the computer": a drop event carrying a File.
  const data = await win.evaluateHandle(() => {
    // This runs in the browser; the Node-side type config has no DOM types, so reach them through globalThis.
    const g = globalThis as unknown as { DataTransfer: new () => { items: { add(f: unknown): void } }; File: new (b: unknown[], n: string, o: object) => unknown }
    const dt = new g.DataTransfer()
    dt.items.add(new g.File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' }))
    return dt
  })
  await win.locator('.files-tab').dispatchEvent('dragover', { dataTransfer: data })
  await expect(win.locator('.drop-overlay')).toBeVisible()
  await win.locator('.files-tab').dispatchEvent('drop', { dataTransfer: data })
  await expect(win.locator('.file-row', { hasText: 'photo.png' })).toBeVisible()

  // Link volunteer.pdf to the second seeded application and to a volunteering entry.
  await row.click()
  await win.getByRole('button', { name: 'Link', exact: true }).click()
  await win.getByLabel('Second scholarship (add the name)').check()
  await win.getByLabel('Sample volunteering 5', { exact: false }).first().check()
  await win.getByRole('button', { name: 'Done' }).click()
  await expect(win.locator('.link-list')).toContainText('Second scholarship')
  await expect(win.locator('.link-list')).toContainText('Sample volunteering 5')
  await win.screenshot({ path: 'test-results/e2e/files.png' })

  // Deleting the file removes the links too.
  await win.getByRole('button', { name: 'Delete', exact: true }).click()
  await win.getByRole('button', { name: 'Delete', exact: true }).last().click()
  await expect(win.locator('.file-row', { hasText: 'volunteer.pdf' })).toHaveCount(0)
  await tab(win, 'Applications').click()
  await win.locator('.app-row', { hasText: 'Second scholarship' }).click()
  await expect(win.locator('.file-chip')).toHaveCount(0)
  await app.close()
})

test('a counter warns when an answer is over its character limit', async () => {
  const { app, win } = await launch(freshDataDir())
  await openApplications(win)
  await tab(win, 'Profile').click()
  await win.getByRole('button', { name: /^Answer bank/ }).click()
  await win.locator('.entry-head').first().click()
  await expect(win.locator('.counter[data-over]')).toHaveCount(0)
  await win.getByLabel('Character limit', { exact: true }).fill('50')
  await expect(win.locator('.counter[data-over]')).toContainText('over the limit')
  await app.close()
})

test('export then import brings back deleted data (round trip)', async () => {
  const dir = freshDataDir()
  const exportPath = join(dir, 'export.json')
  const { app, win } = await launch(dir)
  // Pretend the user picked these files in the native dialogs.
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: path })) as typeof dialog.showSaveDialog
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [path] })) as typeof dialog.showOpenDialog
  }, exportPath)

  await openApplications(win)
  await tab(win, 'Profile').click()
  await win.getByRole('button', { name: 'Export and import' }).click()
  await win.getByRole('button', { name: 'Export JSON' }).click()
  await expect(win.getByText(/Exported to/)).toBeVisible()

  const bundle = JSON.parse(readFileSync(exportPath, 'utf8'))
  expect(bundle.format).toBe('ponder-profile')
  expect(bundle.profile.volunteer).toHaveLength(5)
  expect(bundle.applications).toHaveLength(2)
  expect(bundle.jsonResume.basics.name).toBe('Test Person')

  // Wreck the data, then import.
  await tab(win, 'Applications').click()
  await win.locator('.app-row', { hasText: 'Example Bank' }).click()
  await win.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(win.locator('.app-row')).toHaveCount(1)

  await tab(win, 'Profile').click()
  await win.getByRole('button', { name: 'Export and import' }).click()
  await win.getByRole('button', { name: 'Import…' }).click()
  await win.getByRole('button', { name: 'Choose file…' }).click()
  await expect(win.getByText(/Imported/)).toBeVisible()
  await tab(win, 'Applications').click()
  await expect(win.locator('.app-row')).toHaveCount(2)
  await expect(win.locator('.app-row', { hasText: 'Example Bank' })).toContainText('2/4 steps')
  await app.close()
})
