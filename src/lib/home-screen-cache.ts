import type { ContinueLearningItem } from "./continue-learning"
import type { VocabularyReviewPreview } from "./learned-vocabulary"
import type { LessonSchedule } from "./lesson-schedule"
import type { TestResult } from "../types/domain"

export interface HomeScreenSnapshot {
  results: TestResult[]
  continueItem: ContinueLearningItem | null
  vocabPreview: VocabularyReviewPreview | null
  lessonSchedule: LessonSchedule | null
  /** True after `/students/:id/context` was fetched for this snapshot. */
  scheduleChecked?: boolean
}

let snapshot: { studentId: string; data: HomeScreenSnapshot } | null = null

export function getHomeScreenSnapshot(studentId: string): HomeScreenSnapshot | null {
  if (!snapshot || snapshot.studentId !== studentId) return null
  return snapshot.data
}

export function setHomeScreenSnapshot(studentId: string, data: HomeScreenSnapshot): void {
  snapshot = { studentId, data }
}

export function patchHomeScreenSnapshot(
  studentId: string,
  patch: Partial<HomeScreenSnapshot>,
): void {
  if (!snapshot || snapshot.studentId !== studentId) return
  snapshot = { studentId, data: { ...snapshot.data, ...patch } }
}

export function clearHomeScreenSnapshot(): void {
  snapshot = null
}
