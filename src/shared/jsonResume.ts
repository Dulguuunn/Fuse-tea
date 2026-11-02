// Maps the profile to the JSON Resume format (https://jsonresume.org/schema) so CV templates can be plugged in later.
// Only entries with "include in CV" switched on are mapped. A short summary is preferred over the long description.
import type { Bi, Profile, SkillCategory } from './profile'

export type Lang = 'mn' | 'en'

export interface JsonResume {
  basics: {
    name: string
    email?: string
    phone?: string
    url?: string
    summary?: string
    location?: { address: string }
    profiles?: Array<{ network: string; url: string }>
  }
  work?: Array<{ name: string; position: string; startDate?: string; endDate?: string; summary?: string }>
  volunteer?: Array<{
    organization: string
    position: string
    startDate?: string
    endDate?: string
    summary?: string
    highlights?: string[]
  }>
  education?: Array<{ institution: string; area: string; startDate?: string; endDate?: string; score?: string }>
  awards?: Array<{ title: string; date?: string; awarder: string; summary?: string }>
  skills?: Array<{ name: string; keywords: string[] }>
  languages?: Array<{ language: string; fluency: string }>
  projects?: Array<{ name: string; description?: string; keywords: string[]; url?: string; roles?: string[] }>
}

const SKILL_GROUPS: Record<SkillCategory, string> = {
  language: 'Programming languages',
  framework: 'Frameworks',
  tool: 'Tools',
  soft: 'Soft skills'
}

/** Drops empty strings so the output stays tidy. */
function tidy<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined)) as T
}

export function toJsonResume(profile: Profile, lang: Lang = 'en'): JsonResume {
  const other: Lang = lang === 'en' ? 'mn' : 'en'
  const t = (b: Bi): string => b[lang] || b[other]
  const end = (d: string): string => (d === 'present' ? '' : d)
  const p = profile.personal
  const on = <T extends { includeInCv: boolean }>(xs: T[]): T[] => xs.filter((x) => x.includeInCv)

  const profiles = [
    { network: 'GitHub', url: p.links.github },
    { network: 'LinkedIn', url: p.links.linkedin }
  ].filter((x) => x.url)

  const result: JsonResume = {
    basics: tidy({
      name: t(p.fullName),
      email: p.email,
      phone: p.phone,
      url: p.links.portfolio,
      location: p.address ? { address: p.address } : undefined,
      profiles: profiles.length > 0 ? profiles : undefined
    })
  }

  const work = on(profile.experience)
  if (work.length > 0) {
    result.work = work.map((e) =>
      tidy({
        name: t(e.organization),
        position: t(e.role),
        startDate: e.startDate,
        endDate: end(e.endDate),
        summary: t(e.summary) || t(e.description)
      })
    )
  }
  const vol = on(profile.volunteer)
  if (vol.length > 0) {
    result.volunteer = vol.map((v) =>
      tidy({
        organization: t(v.organization) || t(v.activity),
        position: t(v.role),
        startDate: v.startDate,
        endDate: end(v.endDate),
        summary: t(v.summary) || t(v.activity),
        highlights: t(v.impact) ? [t(v.impact)] : undefined
      })
    )
  }
  const edu = on(profile.education)
  if (edu.length > 0) {
    result.education = edu.map((e) =>
      tidy({
        institution: t(e.institution),
        area: t(e.program),
        startDate: e.startDate,
        endDate: end(e.endDate),
        score: e.gpa
      })
    )
  }
  const awards = on(profile.awards)
  if (awards.length > 0) {
    result.awards = awards.map((a) =>
      tidy({ title: t(a.title), date: a.date, awarder: t(a.issuer), summary: t(a.summary) || t(a.description) })
    )
  }
  const skills = on(profile.skills)
  if (skills.length > 0) {
    result.skills = (Object.keys(SKILL_GROUPS) as SkillCategory[])
      .map((c) => ({ name: SKILL_GROUPS[c], keywords: skills.filter((s) => s.category === c).map((s) => s.name) }))
      .filter((g) => g.keywords.length > 0)
  }
  const langs = on(profile.languages)
  if (langs.length > 0) result.languages = langs.map((l) => ({ language: l.language, fluency: l.level }))
  const projects = on(profile.projects)
  if (projects.length > 0) {
    result.projects = projects.map((x) =>
      tidy({
        name: t(x.name),
        description: t(x.summary) || t(x.description),
        keywords: x.techStack,
        url: x.link,
        roles: t(x.role) ? [t(x.role)] : undefined
      })
    )
  }
  return result
}
