import { reconcileTasks, syncStepsFromTasks } from '@shared/appLinks'
import { useApplications } from './applicationsStore'
import { useTasks } from './tasksStore'

/**
 * Keeps applications and to-dos in step (see shared/appLinks.ts). Call once after both stores have loaded.
 * Each side only reacts to changes of the other, and both helpers return the same array when there is
 * nothing to do, so the two never bounce changes back and forth.
 */
export function startAppLinks(): void {
  // If either list failed to load it is empty by mistake, and syncing would delete real data.
  const ready = (): boolean => useApplications.getState().loaded && useTasks.getState().loaded
  const syncTasks = (): void => {
    if (!ready()) return
    const { apps } = useApplications.getState()
    const { tasks } = useTasks.getState()
    const next = reconcileTasks(apps, tasks, Date.now())
    if (next !== tasks) useTasks.getState().replaceAll(next)
  }
  const syncSteps = (): void => {
    if (!ready()) return
    const { apps } = useApplications.getState()
    const next = syncStepsFromTasks(apps, useTasks.getState().tasks)
    if (next !== apps) useApplications.getState().replaceAll(next)
  }
  useApplications.subscribe((s, prev) => {
    if (s.apps !== prev.apps) syncTasks()
  })
  useTasks.subscribe((s, prev) => {
    if (s.tasks !== prev.tasks) syncSteps()
  })
  syncTasks()
}
