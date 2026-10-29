import { mkdtempSync } from 'node:fs'
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

const freshDataDir = (): string => mkdtempSync(join(tmpdir(), 'notes-e2e-'))

test('a note typed right before closing the window is still there after reopening', async () => {
  const dir = freshDataDir()
  let { app, win } = await launch(dir)
  await win.keyboard.press('Control+n')
  await win.keyboard.type('Physics')
  await win.keyboard.press('Enter')
  await win.keyboard.type('Forces and motion')
  await app.close() // immediately, well inside the 400 ms save delay
  ;({ app, win } = await launch(dir))
  await win.locator('.note-row', { hasText: 'Physics' }).click()
  await expect(win.locator('.prose')).toContainText('Forces and motion')
  await win.screenshot({ path: 'test-results/e2e/note.png' })
  await app.close()
})

test('an empty note disappears when you open another note', async () => {
  const dir = freshDataDir()
  let { app, win } = await launch(dir)
  await win.keyboard.press('Control+n')
  await win.keyboard.type('Kept')
  await win.keyboard.press('Control+n') // a second, empty note…
  await expect(win.locator('.note-row', { hasText: 'Untitled' })).toHaveCount(1)
  await win.locator('.note-row', { hasText: 'Kept' }).click() // …is gone once you leave it
  await expect(win.locator('.note-row', { hasText: 'Untitled' })).toHaveCount(0)
  await expect(win.locator('.note-row')).toHaveCount(1)
  await app.close()
  ;({ app, win } = await launch(dir))
  await expect(win.locator('.note-row')).toHaveCount(1)
  await app.close()
})

test('pressing Ctrl+N twice leaves just one new note', async () => {
  const { app, win } = await launch(freshDataDir())
  await win.keyboard.press('Control+n')
  await win.keyboard.press('Control+n')
  await expect(win.locator('.note-row', { hasText: 'Untitled' })).toHaveCount(1)
  await app.close()
})

test('an empty note left open when the app closed is gone next time', async () => {
  const dir = freshDataDir()
  let { app, win } = await launch(dir)
  await win.keyboard.press('Control+n')
  await expect(win.locator('.note-row', { hasText: 'Untitled' })).toHaveCount(1)
  await app.close()
  ;({ app, win } = await launch(dir))
  await expect(win.locator('.note-row')).toHaveCount(0)
  await app.close()
})

test('a to-do due today is listed under Today and shown on the calendar', async () => {
  const { app, win } = await launch(freshDataDir())
  await win.getByRole('button', { name: 'To-dos', exact: true }).click()
  await win.getByLabel('New to-do').fill('Essay')
  await win.getByRole('button', { name: 'Today', exact: true }).click()
  await win.getByLabel('New to-do').press('Enter')
  await expect(win.locator('.task-group', { hasText: 'Today' })).toContainText('Essay')
  await win.screenshot({ path: 'test-results/e2e/todos.png' })
  await win.getByRole('button', { name: 'Calendar', exact: true }).click()
  await expect(win.locator('.task-chip', { hasText: 'Essay' })).toBeVisible()
  await app.close()
})

test('a deleted to-do can be brought back with Undo', async () => {
  const { app, win } = await launch(freshDataDir())
  await win.getByRole('button', { name: 'To-dos', exact: true }).click()
  await win.getByLabel('New to-do').fill('Essay')
  await win.getByRole('button', { name: 'Today', exact: true }).click()
  await win.getByLabel('New to-do').press('Enter')
  await win.locator('.task-row', { hasText: 'Essay' }).hover()
  await win.getByRole('button', { name: 'Delete “Essay”' }).click()
  await expect(win.locator('.task-row', { hasText: 'Essay' })).toHaveCount(0)
  await expect(win.getByRole('status').filter({ hasText: 'Deleted “Essay”' })).toBeVisible()
  await win.screenshot({ path: 'test-results/e2e/undo-toast.png' })
  await win.getByRole('button', { name: 'Undo' }).click()
  await expect(win.locator('.task-group', { hasText: 'Today' })).toContainText('Essay')
  await app.close()
})

test('a class editor with unsaved typing stays open when you click outside it', async () => {
  const { app, win } = await launch(freshDataDir())
  await win.getByRole('button', { name: 'Calendar', exact: true }).click()
  await win.getByRole('button', { name: 'New class' }).click()
  await win.getByPlaceholder('e.g. Physics').fill('Biology')
  await win.mouse.click(8, 790) // the dimmed area outside the dialog
  await expect(win.getByRole('dialog', { name: 'New class' })).toBeVisible()
  await expect(win.getByPlaceholder('e.g. Physics')).toHaveValue('Biology')
  await app.close()
})

test('an untouched editor still closes when you click outside it', async () => {
  const { app, win } = await launch(freshDataDir())
  await win.getByRole('button', { name: 'Calendar', exact: true }).click()
  await win.getByRole('button', { name: 'New event' }).click()
  await expect(win.getByRole('dialog', { name: 'New event' })).toBeVisible()
  await win.mouse.click(8, 790)
  await expect(win.getByRole('dialog', { name: 'New event' })).toHaveCount(0)
  await app.close()
})

test('pressing Escape on "Delete class?" keeps the class dialog and its unsaved edits open', async () => {
  const { app, win } = await launch(freshDataDir())
  await win.getByRole('button', { name: 'Calendar', exact: true }).click()
  await win.getByRole('button', { name: 'New class' }).click()
  await win.getByPlaceholder('e.g. Physics').fill('Math')
  await win.getByRole('button', { name: 'Save class' }).click()
  await win.locator('.cal-block', { hasText: 'Math' }).click()
  await win.getByPlaceholder('e.g. Physics').fill('Math 2 (unsaved)')
  await win.getByRole('button', { name: 'Delete class' }).click()
  await expect(win.getByRole('dialog', { name: /Delete/ })).toBeVisible()
  await win.keyboard.press('Escape')
  await expect(win.getByRole('dialog', { name: /Delete/ })).toHaveCount(0)
  await expect(win.getByPlaceholder('e.g. Physics')).toHaveValue('Math 2 (unsaved)')
  await app.close()
})

test('a class from 09:00 to 10:30 on Monday appears on the calendar', async () => {
  const { app, win } = await launch(freshDataDir())
  await win.getByRole('button', { name: 'Calendar', exact: true }).click()
  await win.getByRole('button', { name: 'New class' }).click()
  await win.getByPlaceholder('e.g. Physics').fill('Math')
  await win.getByLabel('Day').selectOption('1')
  await win.getByLabel('Time start').fill('09:00')
  await win.getByLabel('Time end').fill('10:30')
  await expect(win.locator('.duration')).toHaveText('1h 30m')
  await win.getByRole('button', { name: 'Save class' }).click()
  const monday = win.locator('.day-col').first()
  await expect(monday.locator('.cal-block')).toContainText('Math')
  await expect(monday.locator('.cal-block')).toContainText('09:00 – 10:30')
  await win.screenshot({ path: 'test-results/e2e/calendar.png' })
  await app.close()
})
