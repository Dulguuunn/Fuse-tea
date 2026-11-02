// Small helpers shared by every normalize function. They never throw.
export type Obj = Record<string, unknown>

export const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
export const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
export const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
export const bool = (v: unknown): boolean => v === true
export const id = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
export const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
export const isMinute = (v: unknown, max = 1440): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max
export const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
export const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** A list of non-empty strings with duplicates removed. */
export const strList = (v: unknown): string[] => [
  ...new Set(list(v).filter((s): s is string => typeof s === 'string' && s.trim().length > 0))
]

/** One of the allowed values, or the fallback. */
export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}
