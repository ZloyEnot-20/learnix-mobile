export type PodcastWordKind = "word" | "expression"

export interface PodcastWord {
  /** Primary field from API */
  word: string
  definition: string
  /** Legacy / extended imports */
  id?: string
  term?: string
  kind?: PodcastWordKind
  example?: string
  translation?: string
  translationUz?: string
}

export type PodcastDifficulty = "easy" | "medium" | "hard"

export interface PodcastEpisode {
  slug: string
  title: string
  topic: string
  description: string
  level: string
  difficulty: PodcastDifficulty
  audioUrl: string
  durationMinutes: number
  words: PodcastWord[]
}

/** Lightweight podcast row for catalogue screens (audio loaded on open). */
export interface PodcastSummary {
  slug: string
  title: string
  topic: string
  description: string
  level: string
  difficulty: PodcastDifficulty
  durationMinutes: number
  wordCount: number
}

export function podcastWordLabel(word: PodcastWord): string {
  return (word.word ?? word.term ?? "").trim()
}

export function podcastHasWords(episode: PodcastEpisode): boolean {
  return episode.words.length > 0
}

export const PODCAST_SLUG_PREFIX = "podcast:"

export function podcastHomeworkSlug(slug: string): string {
  return `${PODCAST_SLUG_PREFIX}${slug}`
}

export function parsePodcastHomeworkSlug(exerciseSlug: string | undefined): string | null {
  if (!exerciseSlug) return null
  return exerciseSlug.startsWith(PODCAST_SLUG_PREFIX)
    ? exerciseSlug.slice(PODCAST_SLUG_PREFIX.length)
    : null
}

export function isPodcastHomework(
  _subject: string | undefined,
  exerciseSlug?: string | undefined,
): boolean {
  // Both podcast and IELTS listening use subject "listening"; distinguish by slug prefix.
  return parsePodcastHomeworkSlug(exerciseSlug) != null
}

/** Accent for podcast homework (matches mobile `colors.success`). */
export const PODCAST_SUBJECT_COLOR = "#10B981"
