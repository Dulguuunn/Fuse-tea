import { useEffect } from 'react'
import type { Theme } from '@shared/types'

/** Puts data-theme="light|dark" on <html>; "system" follows Windows and updates live. */
export function useApplyTheme(theme: Theme): void {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      document.documentElement.dataset.theme = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme
    }
    apply()
    if (theme !== 'system') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
