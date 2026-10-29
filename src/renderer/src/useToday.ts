import { useEffect, useState } from 'react'
import { todayISO } from '@shared/time'

/** Today's date ('YYYY-MM-DD'), updated just after midnight and when the window regains focus. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO)

  useEffect(() => {
    const refresh = (): void => setToday(todayISO())
    const now = new Date()
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 1000
    const timer = setTimeout(refresh, msToMidnight)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [today])

  return today
}
