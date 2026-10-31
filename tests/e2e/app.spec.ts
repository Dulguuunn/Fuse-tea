import { mkdtempSync, writeFileSync } from 'node:fs'
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

/** A new temp data folder with the launch lock off (no lock.json would mean the default lock, code 8848). */
const freshDataDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'notes-e2e-'))
  writeFileSync(join(dir, 'lock.json'), '{"enabled":false}')
  return dir
}

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

test('the sidebar shrinks to icons, still switches pages, and stays shrunk after a restart', async () => {
  const dir = freshDataDir()
  let { app, win } = await launch(dir)
  const notebooks = win.locator('.side-group-head', { hasText: 'Notebooks' })
  await expect(notebooks).toBeVisible()
  await win.getByRole('button', { name: 'Hide sidebar' }).click()
  await expect(notebooks).toBeHidden()
  await win.getByRole('button', { name: 'To-dos', exact: true }).click()
  await expect(win.getByLabel('New to-do')).toBeVisible()
  await win.screenshot({ path: 'test-results/e2e/sidebar-collapsed.png' })
  await app.close()
  ;({ app, win } = await launch(dir))
  await expect(win.getByRole('button', { name: 'Show sidebar' })).toBeVisible()
  await win.keyboard.press('Control+Backslash')
  await expect(win.locator('.side-group-head', { hasText: 'Notebooks' })).toBeVisible()
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

test('the lock screen asks for the code on launch: a wrong code is refused, 8848 opens the app', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'notes-e2e-lock-')) // no lock.json: default lock, code 8848
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NOTES_DATA_DIR: dir } })
  const win = await app.firstWindow()
  await win.setViewportSize({ width: 1280, height: 800 })
  await expect(win.locator('.app')).toHaveCount(0)
  await win.getByLabel('Code').fill('1234')
  await win.getByRole('button', { name: 'Unlock' }).click()
  await expect(win.getByRole('alert')).toContainText('not right')
  await expect(win.locator('.app')).toHaveCount(0)
  await win.screenshot({ path: 'test-results/e2e/lock.png' })
  await win.getByLabel('Code').fill('8848')
  await win.keyboard.press('Enter')
  await win.locator('.app').waitFor()
  // Data requests are refused by the main process until unlocked (checked on a second launch below).
  await app.close()

  const again = await electron.launch({ args: ['.'], env: { ...process.env, NOTES_DATA_DIR: dir } })
  const win2 = await again.firstWindow()
  await win2.getByLabel('Code').waitFor()
  const blocked = await win2.evaluate<string>(
    "window.api.notes.list().then(() => 'allowed', (e) => e.message)"
  )
  expect(blocked).toContain('Locked')
  await again.close()
})

test('the lock code can be changed and then turned off in Settings', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'notes-e2e-lock-'))
  const app = await electron.launch({ args: ['.'], env: { ...process.env, NOTES_DATA_DIR: dir } })
  const win = await app.firstWindow()
  await win.getByLabel('Code').fill('8848')
  await win.keyboard.press('Enter')
  await win.locator('.app').waitFor()
  await win.getByRole('button', { name: 'Settings', exact: true }).click()
  await win.getByRole('button', { name: 'Change code' }).click()
  await win.getByLabel('Current code').fill('8848')
  await win.getByLabel('New code (4 to 8 digits)').fill('2468')
  await win.getByRole('button', { name: 'Save' }).click()
  await expect(win.getByRole('dialog')).toHaveCount(0) // the new code is saved once the dialog closes
  await app.close()

  const again = await electron.launch({ args: ['.'], env: { ...process.env, NOTES_DATA_DIR: dir } })
  const win2 = await again.firstWindow()
  await win2.getByLabel('Code').fill('8848')
  await win2.keyboard.press('Enter')
  await expect(win2.getByRole('alert')).toContainText('not right')
  await win2.getByLabel('Code').fill('2468')
  await win2.keyboard.press('Enter')
  await win2.locator('.app').waitFor()
  await win2.getByRole('button', { name: 'Settings', exact: true }).click()
  await win2.getByRole('button', { name: 'Turn off', exact: true }).click()
  await win2.getByLabel('Current code').fill('2468')
  await win2.getByRole('button', { name: 'Turn off lock' }).click()
  await expect(win2.getByRole('button', { name: 'Turn on', exact: true })).toBeVisible()
  await again.close()

  const third = await electron.launch({ args: ['.'], env: { ...process.env, NOTES_DATA_DIR: dir } })
  const win3 = await third.firstWindow()
  await win3.locator('.app').waitFor() // lock is off: straight in
  await third.close()
})

test('an event that repeats every day shows on every day of the following week', async () => {
  const { app, win } = await launch(freshDataDir())
  await win.getByRole('button', { name: 'Calendar', exact: true }).click()
  await win.getByRole('button', { name: 'New event' }).click()
  await win.getByPlaceholder('e.g. Calculus midterm').fill('Stretch')
  await win.getByLabel('Repeats', { exact: true }).selectOption('day')
  await win.getByRole('button', { name: 'Save event' }).click()
  await win.getByRole('button', { name: 'Next week' }).click()
  const columns = win.locator('.day-col')
  await expect(columns).toHaveCount(7)
  for (let i = 0; i < 7; i++) await expect(columns.nth(i).locator('.cal-block')).toContainText('Stretch')
  await win.screenshot({ path: 'test-results/e2e/repeat.png' })
  // Editing the series changes every day.
  await columns.nth(2).locator('.cal-block').click()
  await win.getByPlaceholder('e.g. Calculus midterm').fill('Stretch more')
  await win.getByRole('button', { name: 'Save event' }).click()
  for (let i = 0; i < 7; i++) await expect(columns.nth(i).locator('.cal-block')).toContainText('Stretch more')
  await app.close()
})
