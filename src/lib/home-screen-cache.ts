import AsyncStorage from "@react-native-async-storage/async-storage"
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

const STORAGE_KEY_PREFIX = "learnix_home_screen:"
const TTL_MS = 10 * 60_000

let snapshot: { studentId: string; data: HomeScreenSnapshot; at: number } | null = null

export function getHomeScreenSnapshot(studentId: string): HomeScreenSnapshot | null {
  if (!snapshot || snapshot.studentId !== studentId) return null
  if (Date.now() - snapshot.at > TTL_MS) return null
  return snapshot.data
}

export function setHomeScreenSnapshot(studentId: string, data: HomeScreenSnapshot): void {
  const at = Date.now()
  snapshot = { studentId, data, at }
  void AsyncStorage.setItem(
    `${STORAGE_KEY_PREFIX}${studentId}`,
    JSON.stringify({ data, at }),
  ).catch(() => {})
}

export function patchHomeScreenSnapshot(
  studentId: string,
  patch: Partial<HomeScreenSnapshot>,
): void {
  if (!snapshot || snapshot.studentId !== studentId) return
  const data = { ...snapshot.data, ...patch }
  setHomeScreenSnapshot(studentId, data)
}

export async function loadHomeScreenCache(studentId: string): Promise<HomeScreenSnapshot | null> {
  const memory = getHomeScreenSnapshot(studentId)
  if (memory) return memory

  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${studentId}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { data: HomeScreenSnapshot; at: number }
    if (!parsed.data || Date.now() - parsed.at > TTL_MS) return null

    snapshot = { studentId, data: parsed.data, at: parsed.at }
    return parsed.data
  } catch {
    return null
  }
}

export function clearHomeScreenSnapshot(): void {
  const studentId = snapshot?.studentId
  snapshot = null
  if (studentId) {
    void AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${studentId}`).catch(() => {})
  }
}
