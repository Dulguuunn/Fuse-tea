// Counting for the live counters on long text fields. Works the same for Mongolian (Cyrillic) and English.

/** Characters as a person sees them (an emoji counts once). */
export const countChars = (s: string): number => Array.from(s).length

export function countWords(s: string): number {
  const t = s.trim()
  return t === '' ? 0 : t.split(/\s+/).length
}

/** True when a limit is set and the text is longer than it. */
export const isOverLimit = (s: string, limit: number | null): boolean => limit !== null && countChars(s) > limit
