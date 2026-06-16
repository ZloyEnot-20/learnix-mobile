import { exercisesApi, homeworkApi } from "./api"
import type { LastActivity } from "./last-activity"
import { getLastActivity, subjectLabel } from "./last-activity"
import { findTopicMeta, topicDisplayTitle } from "./topic-meta"
import { parseVocabHomeworkSlug, type TopicMeta, type VocabDeck } from "../types/vocabulary"
import type { GrammarExercise } from "../types/grammar"
import type { StudentHomeworkEntry } from "../types/domain"

export interface ContinueLearningItem {
  route: string
  title: string
  categoryLabel: string
  subject: LastActivity["subject"]
  progressPct?: number
  minutesLeft?: number
  progressLabel?: string
}

function grammarSubject(ex: GrammarExercise): ContinueLearningItem["subject"] {
  if (ex.category === "vocabulary") return "vocabulary"
  if (ex.category === "speaking") return "speaking"
  return "grammar"
}

function homeworkRoute(
  entry: StudentHomeworkEntry,
  exerciseBySlug: Map<string, GrammarExercise>,
): string | undefined {
  const { homework, submission } = entry
  const failed =
    submission.integrityStatus === "cheating_detected" ||
    submission.attempt?.failedDueToCheating
  if (failed) return undefined

  if (homework.subject === "grammar" && homework.exerciseSlug) {
    const ex = exerciseBySlug.get(homework.exerciseSlug)
    if (ex) return `/homework/exercise/${ex.topic}/${ex.slug}?hw=${homework.id}`
  }
  if (homework.subject === "vocabulary") {
    const deckSlug = parseVocabHomeworkSlug(homework.exerciseSlug)
    if (deckSlug) return `/homework/vocabulary/${deckSlug}?hw=${homework.id}`
  }
  return undefined
}

function homeworkProgress(entry: StudentHomeworkEntry): {
  progressPct?: number
  minutesLeft?: number
  progressLabel?: string
} {
  const { homework, submission } = entry
  const attempt = submission.attempt
  const totalQuestions = attempt?.totalQuestions
  const answered =
    attempt?.answeredCount ??
    (attempt ? attempt.correctCount + attempt.mistakes.length : 0)

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

function exerciseCategoryLabel(
  ex: GrammarExercise,
  topicMetas: TopicMeta[],
): string {
  const subject = grammarSubject(ex)
  const topicTitle = topicDisplayTitle(topicMetas, ex.topic)
  return `${subjectLabel(subject)}: ${ex.subtopic || topicTitle}`
}

function fromHomeworkEntry(
  entry: StudentHomeworkEntry,
  exerciseBySlug: Map<string, GrammarExercise>,
  topicMetas: TopicMeta[],
): ContinueLearningItem | null {
  const route = homeworkRoute(entry, exerciseBySlug)
  if (!route) return null

  const { homework } = entry
  const ex = homework.exerciseSlug ? exerciseBySlug.get(homework.exerciseSlug) : undefined
  const categoryLabel = ex
    ? exerciseCategoryLabel(ex, topicMetas)
    : `${subjectLabel(homework.subject)}: ${homework.title}`

  return {
    route,
    title: ex?.title ?? homework.title,
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

function enrichGameActivity(
  last: LastActivity,
  exerciseBySlug: Map<string, GrammarExercise>,
  topicMetas: TopicMeta[],
  decks: VocabDeck[],
): ContinueLearningItem {
  const base = continueItemFromLastActivity(last)

  const exerciseMatch = last.route.match(/^\/exercise\/([^/]+)\/([^/?]+)/)
  if (exerciseMatch) {
    const slug = exerciseMatch[2]
    const ex = exerciseBySlug.get(slug)
    if (ex) {
      return {
        ...base,
        title: ex.title,
        categoryLabel: exerciseCategoryLabel(ex, topicMetas),
        subject: grammarSubject(ex),
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
  entries: StudentHomeworkEntry[],
  exerciseBySlug: Map<string, GrammarExercise>,
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

  return fromHomeworkEntry(active[0], exerciseBySlug, topicMetas)
}

export async function resolveContinueLearning(
  userId: string,
): Promise<ContinueLearningItem | null> {
  const [last, entries, exList, topicMetas, decks] = await Promise.all([
    getLastActivity(userId),
    homeworkApi.mine().catch(() => [] as StudentHomeworkEntry[]),
    exercisesApi.list().catch(() => [] as GrammarExercise[]),
    exercisesApi.topics().catch(() => [] as TopicMeta[]),
    exercisesApi.vocab().catch(() => [] as VocabDeck[]),
  ])

  const exerciseBySlug = new Map(exList.map((e) => [e.slug, e]))

  if (last?.kind === "homework" && last.homeworkId) {
    const entry = entries.find((e) => e.homework.id === last.homeworkId)
    if (
      entry &&
      (entry.submission.status === "in_progress" || entry.submission.status === "paused")
    ) {
      const item = fromHomeworkEntry(entry, exerciseBySlug, topicMetas)
      if (item) return item
    }
  }

  if (last?.kind === "game") {
    return enrichGameActivity(last, exerciseBySlug, topicMetas, decks)
  }

  const inProgress = pickInProgressHomework(entries, exerciseBySlug, topicMetas)
  if (inProgress) return inProgress

  if (last?.kind === "homework") {
    return null
  }

  return last ? enrichGameActivity(last, exerciseBySlug, topicMetas, decks) : null
}
