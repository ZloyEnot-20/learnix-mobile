import { exercisesApi, homeworkApi } from "./api"
import type { LastActivity } from "./last-activity"
import { getLastActivity, subjectLabel } from "./last-activity"
import { findTopicMeta, topicDisplayTitle } from "./topic-meta"
import { parseVocabHomeworkSlug, type TopicMeta, type VocabDeckSummary } from "../types/vocabulary"
import { parsePodcastHomeworkSlug } from "../types/podcast"
import { parseReadingHomeworkSlug } from "../types/reading"
import { parseListeningHomeworkSlug } from "../types/listening"
import type { ExerciseMeta } from "../types/grammar"
import type { StudentHomeworkSummaryEntry } from "../types/domain"

export interface ContinueLearningItem {
  route: string
  title: string
  categoryLabel: string
  subject: LastActivity["subject"]
  progressPct?: number
  minutesLeft?: number
  progressLabel?: string
}

function homeworkRoute(entry: StudentHomeworkSummaryEntry): string | undefined {
  const { homework, submission, exerciseTopic } = entry
  const failed =
    submission.integrityStatus === "cheating_detected" ||
    submission.attempt?.failedDueToCheating
  if (failed) return undefined

  if (
    (homework.subject === "grammar" || homework.subject === "speaking") &&
    homework.exerciseSlug &&
    exerciseTopic
  ) {
    return `/homework/exercise/${exerciseTopic}/${homework.exerciseSlug}?hw=${homework.id}`
  }
  if (homework.subject === "vocabulary") {
    const deckSlug = parseVocabHomeworkSlug(homework.exerciseSlug)
    if (deckSlug) return `/homework/vocabulary/${deckSlug}?hw=${homework.id}`
  }
  if (homework.subject === "reading") {
    const readingSlug = parseReadingHomeworkSlug(homework.exerciseSlug)
    if (readingSlug) return `/homework/reading/${readingSlug}?hw=${homework.id}`
  }
  if (homework.subject === "listening") {
    const ieltsSlug = parseListeningHomeworkSlug(homework.exerciseSlug)
    if (ieltsSlug) return `/homework/listening/${ieltsSlug}?hw=${homework.id}`
    const podcastSlug = parsePodcastHomeworkSlug(homework.exerciseSlug)
    if (podcastSlug) return `/homework/podcast/${podcastSlug}?hw=${homework.id}`
  }
  return undefined
}

function homeworkProgress(entry: StudentHomeworkSummaryEntry): {
  progressPct?: number
  minutesLeft?: number
  progressLabel?: string
} {
  const { homework, submission } = entry
  const attempt = submission.attempt
  const totalQuestions = attempt?.totalQuestions
  const answered =
    attempt?.answeredCount ??
    (attempt ? attempt.correctCount + (attempt.mistakes?.length ?? 0) : 0)

  if (totalQuestions && totalQuestions > 0 && answered > 0) {
    const pct = Math.min(99, Math.round((answered / totalQuestions) * 100))
    const left =
      homework.timeLimitMinutes != null && submission.elapsedSeconds != null
        ? Math.max(
            0,
            Math.ceil(
              (homework.timeLimitMinutes * 60 - submission.elapsedSeconds) / 60,
            ),
          )
        : undefined
    return {
      progressPct: pct,
      minutesLeft: left,
      progressLabel:
        left != null ? `${pct}% complete · ${left} min left` : `${pct}% complete`,
    }
  }

  if (homework.timeLimitMinutes && submission.elapsedSeconds != null) {
    const totalSec = homework.timeLimitMinutes * 60
    const pct = Math.min(99, Math.round((submission.elapsedSeconds / totalSec) * 100))
    const left = Math.max(0, Math.ceil((totalSec - submission.elapsedSeconds) / 60))
    return {
      progressPct: Math.max(pct, 5),
      minutesLeft: left,
      progressLabel: `${Math.max(pct, 5)}% complete · ${left} min left`,
    }
  }

  if (submission.status === "paused") {
    return { progressPct: 10, progressLabel: "Paused · tap to continue" }
  }

  return { progressPct: 5, progressLabel: "Started · tap to continue" }
}

function exerciseCategoryLabel(meta: ExerciseMeta, topicMetas: TopicMeta[]): string {
  const subject =
    meta.category === "vocabulary"
      ? "vocabulary"
      : meta.category === "speaking"
        ? "speaking"
        : "grammar"
  const topicTitle = topicDisplayTitle(topicMetas, meta.topic)
  return `${subjectLabel(subject)}: ${meta.subtopic || topicTitle}`
}

function fromHomeworkEntry(
  entry: StudentHomeworkSummaryEntry,
  topicMetas: TopicMeta[],
): ContinueLearningItem | null {
  const route = homeworkRoute(entry)
  if (!route) return null

  const { homework, exerciseTitle } = entry
  const categoryLabel = exerciseTitle
    ? `${subjectLabel(homework.subject)}: ${exerciseTitle}`
    : `${subjectLabel(homework.subject)}: ${homework.title}`

  return {
    route,
    title: exerciseTitle ?? homework.title,
    categoryLabel,
    subject: homework.subject,
    ...homeworkProgress(entry),
  }
}

export function continueItemFromLastActivity(last: LastActivity): ContinueLearningItem {
  return {
    route: last.route,
    title: last.title,
    categoryLabel: last.categoryLabel,
    subject: last.subject,
    progressPct: last.progressPct,
    minutesLeft: last.minutesLeft,
    progressLabel: last.progressLabel,
  }
}

function slugsFromLastActivity(last: LastActivity): string[] {
  const exerciseMatch = last.route.match(/^\/exercise\/([^/]+)\/([^/?]+)/)
  if (exerciseMatch) return [exerciseMatch[2]]

  const homeworkMatch = last.route.match(/^\/homework\/exercise\/([^/]+)\/([^/?]+)/)
  if (homeworkMatch) return [homeworkMatch[2]]

  return []
}

async function enrichGameActivity(
  last: LastActivity,
  exerciseBySlug: Map<string, ExerciseMeta>,
  topicMetas: TopicMeta[],
  decks: VocabDeckSummary[],
): Promise<ContinueLearningItem> {
  const base = continueItemFromLastActivity(last)

  const exerciseMatch = last.route.match(/^\/exercise\/([^/]+)\/([^/?]+)/)
  if (exerciseMatch) {
    const slug = exerciseMatch[2]
    const meta = exerciseBySlug.get(slug)
    if (meta) {
      const subject =
        meta.category === "vocabulary"
          ? "vocabulary"
          : meta.category === "speaking"
            ? "speaking"
            : "grammar"
      return {
        ...base,
        title: meta.title,
        categoryLabel: exerciseCategoryLabel(meta, topicMetas),
        subject,
      }
    }
  }

  const topicMatch = last.route.match(/^\/exercises\/([^/?]+)/)
  if (topicMatch) {
    const topicKey = topicMatch[1]
    const meta = findTopicMeta(topicMetas, topicKey)
    const title = topicDisplayTitle(topicMetas, topicKey)
    const subject =
      meta?.category === "vocabulary"
        ? "vocabulary"
        : meta?.category === "speaking"
          ? "speaking"
          : "grammar"
    return {
      ...base,
      title,
      categoryLabel: `${subjectLabel(subject)}: ${title}`,
      subject,
    }
  }

  const vocabMatch = last.route.match(/^\/vocabulary\/([^/?]+)/)
  if (vocabMatch) {
    const deckSlug = vocabMatch[1]
    const deck = decks.find((d) => d.slug === deckSlug)
    if (deck) {
      return {
        ...base,
        title: deck.title,
        categoryLabel: `Vocabulary: ${deck.title}`,
        subject: "vocabulary",
      }
    }
  }

  return base
}

function pickInProgressHomework(
  entries: StudentHomeworkSummaryEntry[],
  topicMetas: TopicMeta[],
): ContinueLearningItem | null {
  const active = entries.filter(
    (e) =>
      (e.submission.status === "in_progress" || e.submission.status === "paused") &&
      e.submission.integrityStatus !== "cheating_detected" &&
      !e.submission.attempt?.failedDueToCheating,
  )
  if (active.length === 0) return null

  active.sort((a, b) => {
    const ta = new Date(
      b.submission.sessionStartedAt ?? b.submission.startedAt ?? b.homework.createdAt,
    ).getTime()
    const tb = new Date(
      a.submission.sessionStartedAt ?? a.submission.startedAt ?? a.homework.createdAt,
    ).getTime()
    return ta - tb
  })

  return fromHomeworkEntry(active[0], topicMetas)
}

export async function resolveContinueLearning(
  userId: string,
): Promise<ContinueLearningItem | null> {
  const [last, entries, topicMetas, decks] = await Promise.all([
    getLastActivity(userId),
    homeworkApi.mineSummary().catch(() => [] as StudentHomeworkSummaryEntry[]),
    exercisesApi.topics().catch(() => [] as TopicMeta[]),
    exercisesApi.vocabSummaries().catch(() => [] as VocabDeckSummary[]),
  ])

  const slugList = last ? slugsFromLastActivity(last) : []
  const metaList =
    slugList.length > 0
      ? await exercisesApi.metaBatch(slugList).catch(() => [] as ExerciseMeta[])
      : []
  const exerciseBySlug = new Map(metaList.map((meta) => [meta.slug, meta]))

  if (last?.kind === "homework" && last.homeworkId) {
    const entry = entries.find((e) => e.homework.id === last.homeworkId)
    if (
      entry &&
      (entry.submission.status === "in_progress" || entry.submission.status === "paused")
    ) {
      const item = fromHomeworkEntry(entry, topicMetas)
      if (item) return item
    }
  }

  if (last?.kind === "game") {
    return enrichGameActivity(last, exerciseBySlug, topicMetas, decks)
  }

  const inProgress = pickInProgressHomework(entries, topicMetas)
  if (inProgress) return inProgress

  if (last?.kind === "homework") {
    return null
  }

  return last ? enrichGameActivity(last, exerciseBySlug, topicMetas, decks) : null
}
