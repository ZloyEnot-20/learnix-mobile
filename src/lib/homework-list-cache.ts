import AsyncStorage from "@react-native-async-storage/async-storage"
import type { HomeworkItem } from "../components/HomeworkSection"

const STORAGE_KEY_PREFIX = "learnix_homework_list:"
const TTL_MS = 5 * 60_000

let snapshot: { studentId: string; items: HomeworkItem[]; at: number } | null = null

export function getHomeworkListSnapshot(studentId: string): HomeworkItem[] | null {
  if (!snapshot || snapshot.studentId !== studentId) return null
  if (Date.now() - snapshot.at > TTL_MS) return null
  return snapshot.items
}

export async function loadHomeworkListCache(studentId: string): Promise<HomeworkItem[] | null> {
  const memory = getHomeworkListSnapshot(studentId)
  if (memory) return memory

  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${studentId}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { items: HomeworkItem[]; at: number }
    if (!Array.isArray(parsed.items) || Date.now() - parsed.at > TTL_MS) {
      return null
    }

    snapshot = { studentId, items: parsed.items, at: parsed.at }
    return parsed.items
  } catch {
    return null
  }
}

export function setHomeworkListSnapshot(studentId: string, items: HomeworkItem[]): void {
  const at = Date.now()
  snapshot = { studentId, items, at }
  void AsyncStorage.setItem(
    `${STORAGE_KEY_PREFIX}${studentId}`,
    JSON.stringify({ items, at }),
  ).catch(() => {})
}

export function clearHomeworkListSnapshot(): void {
  const studentId = snapshot?.studentId
  snapshot = null
  if (studentId) {
    void AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${studentId}`).catch(() => {})
  }
}
