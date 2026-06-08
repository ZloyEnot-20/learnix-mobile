import type { HomeworkItem } from "../components/HomeworkSection"

const TTL_MS = 60_000

let snapshot: { studentId: string; items: HomeworkItem[]; at: number } | null = null

export function getHomeworkListSnapshot(studentId: string): HomeworkItem[] | null {
  if (!snapshot || snapshot.studentId !== studentId) return null
  if (Date.now() - snapshot.at > TTL_MS) return null
  return snapshot.items
}

export function setHomeworkListSnapshot(studentId: string, items: HomeworkItem[]): void {
  snapshot = { studentId, items, at: Date.now() }
}

export function clearHomeworkListSnapshot(): void {
  snapshot = null
}
