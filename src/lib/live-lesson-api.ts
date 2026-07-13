import Constants from "expo-constants"
import { api } from "./api-client"
import { PRODUCTION_API_URL } from "./config"
import type { BookUnitRaw, LiveLessonState } from "./books/types"

function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "")
  if (!trimmed) return PRODUCTION_API_URL
  if (!/^https?:\/\//i.test(trimmed)) return PRODUCTION_API_URL
  if (trimmed.endsWith("/api")) return trimmed
  return `${trimmed}/api`
}

const API_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL ??
    Constants.expoConfig?.extra?.apiUrl ??
    PRODUCTION_API_URL,
)

/** Socket.IO origin (no `/api` suffix). */
export function getBackendOrigin(): string {
  return API_URL.replace(/\/api\/?$/, "")
}

export type { LiveLessonState }

export const liveLessonsApi = {
  /** Active lesson for the signed-in student's group, or null. */
  getActive: () => api.get<LiveLessonState | null>("/live-lessons/active"),
  /** Join that active lesson (membership via groupId). */
  joinActive: () => api.post<LiveLessonState>("/live-lessons/active/join"),
  join: (id: string) => api.post<LiveLessonState>(`/live-lessons/${id}/join`),
  progress: (
    id: string,
    body: { progress: number; score?: number | null; status?: string; answers?: unknown },
  ) => api.post<LiveLessonState>(`/live-lessons/${id}/progress`, body),
  heartbeat: (id: string) => api.post(`/live-lessons/${id}/heartbeat`),
  listBooks: () =>
    api.get<
      Array<{
        id: string
        bookId?: string
        title: string
        author?: string | null
        year?: number | null
        unitCount: number
        readyUnitCount?: number
      }>
    >("/live-lessons/books"),
  getBook: (bookId: string) =>
    api.get<{
      bookId: string
      book: { title: string; author?: string; year?: number }
      pages?: Array<{
        page: number
        unit: number
        title: string
        label: string
        exercise_ids: string[]
      }>
      units: Array<{
        unit_number: number
        title: string
        subtitle?: string | null
        ready?: boolean
        exerciseIds: string[]
        pages?: Array<{
          page: number
          unit: number
          title: string
          label: string
          exercise_ids: string[]
        }>
      }>
      answer_key?: Record<string, unknown>
    }>(`/live-lessons/books/${bookId}`),
  getUnit: (bookId: string, unitNumber: number) =>
    api.get<{
      bookId: string
      unit: BookUnitRaw
      exerciseIds: string[]
      answer_key?: Record<string, unknown> | null
    }>(`/live-lessons/books/${bookId}/units/${unitNumber}`),
}
