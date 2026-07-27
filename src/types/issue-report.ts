export type IssueReportExerciseKind =
  | "grammar"
  | "vocabulary"
  | "podcast"
  | "speaking"
  | "listening"
  | "reading"
  | "book"

export type IssueReportStatus = "open" | "resolved" | "dismissed"

export interface IssueReportPayload {
  homeworkId?: string
  controlWorkId?: string
  liveLessonId?: string
  bookId?: string
  unitNumber?: number
  exerciseId?: string
  stepIndex?: number
  exerciseSlug: string
  exerciseTitle: string
  exerciseKind: IssueReportExerciseKind
  questionIndex?: number
  questionId?: number
  questionPrompt?: string
  message?: string
}

export interface IssueReport {
  id: string
  studentId: string
  studentName: string
  homeworkId: string | null
  controlWorkId: string | null
  liveLessonId: string | null
  bookId: string | null
  unitNumber: number | null
  exerciseId: string | null
  stepIndex: number | null
  exerciseSlug: string
  exerciseTitle: string
  exerciseKind: IssueReportExerciseKind
  questionIndex: number | null
  questionId: number | null
  questionPrompt: string | null
  message: string | null
  status: IssueReportStatus
  resolvedAt: string | null
  resolvedById: string | null
  resolvedByName: string | null
  createdAt: string
  updatedAt: string
}

export function grammarIssueReport(
  exercise: { slug: string; title: string },
  ctx: {
    homeworkId?: string
    controlWorkId?: string
    stepIndex?: number
    questionIndex?: number
    questionId?: number
    questionPrompt?: string
  },
): IssueReportPayload | undefined {
  if (!ctx.homeworkId && !ctx.controlWorkId) return undefined
  return {
    ...ctx,
    exerciseSlug: exercise.slug,
    exerciseTitle: exercise.title,
    exerciseKind: "grammar",
  }
}

/** Cambridge / live-lesson book exercise report. */
export function bookIssueReport(ctx: {
  bookId: string
  unitNumber: number
  exerciseId: string
  exerciseTitle?: string
  questionPrompt?: string
  liveLessonId?: string
}): IssueReportPayload {
  const title =
    ctx.exerciseTitle?.trim() ||
    `Unit ${ctx.unitNumber} · Exercise ${ctx.exerciseId}`
  return {
    bookId: ctx.bookId,
    liveLessonId: ctx.liveLessonId,
    unitNumber: ctx.unitNumber,
    exerciseId: ctx.exerciseId,
    exerciseSlug: `${ctx.bookId}:u${ctx.unitNumber}:${ctx.exerciseId}`,
    exerciseTitle: title,
    exerciseKind: "book",
    questionPrompt: ctx.questionPrompt,
  }
}
