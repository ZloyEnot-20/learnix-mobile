import type { IeltsListeningTest } from "./ielts"

export const LISTENING_SLUG_PREFIX = "ielts-listening:"

export interface IeltsListeningSummary {
  slug: string
  title: string
  subtitle: string
  book?: number
  test?: number
  totalTimeMinutes: number
  questionCount: number
  order?: number
}

export interface IeltsListeningDocument {
  slug: string
  title: string
  book?: number
  test?: number
  totalTimeMinutes: number
  questionCount: number
  fullAudioUrl: string
  data: IeltsListeningTest
}

export function listeningHomeworkSlug(slug: string): string {
  return `${LISTENING_SLUG_PREFIX}${slug}`
}

export function parseListeningHomeworkSlug(exerciseSlug: string | undefined): string | null {
  if (!exerciseSlug) return null
  return exerciseSlug.startsWith(LISTENING_SLUG_PREFIX)
    ? exerciseSlug.slice(LISTENING_SLUG_PREFIX.length)
    : null
}

export function isIeltsListeningHomework(
  subject: string | undefined,
  exerciseSlug?: string | undefined,
): boolean {
  return parseListeningHomeworkSlug(exerciseSlug) != null
}
