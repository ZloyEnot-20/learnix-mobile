import { exercisesApi, homeworkApi } from "./api"
import type { LastActivity } from "./last-activity"
import { getLastActivity, subjectLabel } from "./last-activity"
import { parseVocabHomeworkSlug } from "../types/vocabulary"
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

function fromHomeworkEntry(
  entry: StudentHomeworkEntry,
  exerciseBySlug: Map<string, GrammarExercise>,
): ContinueLearningItem | null {
  const route = homeworkRoute(entry, exerciseBySlug)
  if (!route) return null

  const { homework } = entry
  const ex = homework.exerciseSlug ? exerciseBySlug.get(homework.exerciseSlug) : undefined
  const categoryLabel = ex
    ? `${subjectLabel(homework.subject)}: ${ex.subtopic || ex.topic}`
    : `${subjectLabel(homework.subject)}: ${homework.title}`

  return {
    route,
    title: homework.title,
    categoryLabel,
    subject: homework.subject,
    ...homeworkProgress(entry),
  }
}

function fromLastActivity(last: LastActivity): ContinueLearningItem {
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

function pickInProgressHomework(
  entries: StudentHomeworkEntry[],
  exerciseBySlug: Map<string, GrammarExercise>,
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

  return fromHomeworkEntry(active[0], exerciseBySlug)
}

export async function resolveContinueLearning(
  userId: string,
): Promise<ContinueLearningItem | null> {
  const [last, entries, exList] = await Promise.all([
    getLastActivity(userId),
    homeworkApi.mine().catch(() => [] as StudentHomeworkEntry[]),
    exercisesApi.list().catch(() => [] as GrammarExercise[]),
  ])

  const exerciseBySlug = new Map(exList.map((e) => [e.slug, e]))

  if (last?.kind === "homework" && last.homeworkId) {
    const entry = entries.find((e) => e.homework.id === last.homeworkId)
    if (
      entry &&
      (entry.submission.status === "in_progress" || entry.submission.status === "paused")
    ) {
      const item = fromHomeworkEntry(entry, exerciseBySlug)
      if (item) return item
    }
  }

  if (last?.kind === "game") {
    return fromLastActivity(last)
  }

  const inProgress = pickInProgressHomework(entries, exerciseBySlug)
  if (inProgress) return inProgress

  if (last?.kind === "homework") {
    return null
  }

  return last ? fromLastActivity(last) : null
}
