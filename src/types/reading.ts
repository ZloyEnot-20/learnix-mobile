import type { IeltsReadingTest } from "./ielts"

export const READING_SLUG_PREFIX = "reading:"

export interface IeltsReadingSummary {
  slug: string
  title: string
  subtitle: string
  totalTimeMinutes: number
  questionCount: number
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
