import type { IeltsReadingTest } from "./ielts"

export const READING_SLUG_PREFIX = "reading:"

export interface IeltsReadingSummary {
  slug: string
  title: string
  subtitle: string
  totalTimeMinutes: number
  questionCount: number
  level?: string
  order?: number
}

export interface IeltsReadingDocument {
  slug: string
  title: string
  totalTimeMinutes: number
  questionCount: number
  data: IeltsReadingTest
}

export function readingHomeworkSlug(slug: string): string {
  return `${READING_SLUG_PREFIX}${slug}`
}

export function parseReadingHomeworkSlug(exerciseSlug: string | undefined): string | null {
  if (!exerciseSlug) return null
  return exerciseSlug.startsWith(READING_SLUG_PREFIX)
    ? exerciseSlug.slice(READING_SLUG_PREFIX.length)
    : null
}

export function isReadingHomework(
  subject: string | undefined,
  exerciseSlug?: string | undefined,
): boolean {
  return subject === "reading" || parseReadingHomeworkSlug(exerciseSlug) != null
}

/** Resolve CEFR band from API field or slug prefix (a1-reading-test-1 → A1). */
export function resolveReadingLevel(
  reading: Pick<IeltsReadingSummary, "slug" | "level"> & { id?: string },
): string {
  const explicit = String(reading.level ?? "").trim()
  if (explicit) return explicit
  const slug = reading.slug ?? reading.id ?? ""
  const match = slug.match(/^(a1|a2|b1|b2|c1|c2)-reading-test-/i)
  return match ? match[1].toUpperCase() : ""
}

export function isIeltsReading(
  reading: Pick<IeltsReadingSummary, "slug" | "level"> & { id?: string },
): boolean {
  return !resolveReadingLevel(reading)
}
