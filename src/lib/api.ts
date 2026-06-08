import { api } from "./api-client"
import {
  cacheKey,
  cachedFetch,
  invalidateKey,
  invalidatePrefix,
  peekCached,
  peekStale,
  setCached,
  clearApiCache,
} from "./api-cache"
import { clearHomeworkListSnapshot } from "./homework-list-cache"
import type {
  HomeworkAssignment,
  HomeworkAttempt,
  HomeworkSubmission,
  StudentHomeworkEntry,
  TestResult,
  ViolationReason,
  ViolationResponse,
} from "../types/domain"
import type { GrammarExercise } from "../types/grammar"
import type { StudentLevel } from "../types/gamification"
import type { VocabDeck, TopicMeta } from "../types/vocabulary"

export { peekCached, peekStale, clearApiCache }

const TTL = {
  homeworkMine: 45_000,
  homework: 120_000,
  exercises: 300_000,
  exercise: 600_000,
  vocab: 600_000,
  vocabDeck: 600_000,
  topics: 300_000,
  studentLevel: 120_000,
  notifications: 30_000,
  testResults: 60_000,
  submissionActive: 30_000,
  submissionDone: 300_000,
} as const

function submissionCacheTtl(sub: HomeworkSubmission): number {
  return sub.status === "submitted" || sub.status === "graded"
    ? TTL.submissionDone
    : TTL.submissionActive
}

function invalidateHomeworkCaches(homeworkId?: string): void {
  invalidateKey(cacheKey("GET", "/homework/mine"))
  clearHomeworkListSnapshot()
  if (homeworkId) {
    invalidateKey(cacheKey("GET", `/homework/${homeworkId}`))
    invalidateKey(cacheKey("POST", `/homework/start:${homeworkId}`))
  } else {
    invalidatePrefix(cacheKey("POST", "/homework/start:"))
  }
}

export interface AuthUser {
  id: string
  login: string
  email: string
  name: string
  role: "admin" | "teacher" | "student" | "super_admin"
  isPremium: boolean
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export const authApi = {
  login: (login: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { login, password }, false),
  register: (email: string, password: string, name: string) =>
    api.post<AuthResponse>("/auth/register", { email, password, name }, false),
  me: () => api.get<{ user: AuthUser }>("/auth/me"),
}

export const studentsApi = {
  level: (id: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/students/${id}/level`)
    return cachedFetch(
      key,
      TTL.studentLevel,
      () => api.get<StudentLevel>(`/students/${id}/level`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  context: (id: string) =>
    api.get<{ groupName: string | null; teacherName: string | null }>(
      `/students/${id}/context`,
    ),
}

export const homeworkApi = {
  mine: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/homework/mine")
    return cachedFetch(
      key,
      TTL.homeworkMine,
      () => api.get<StudentHomeworkEntry[]>("/homework/mine"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  get: (id: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/homework/${id}`)
    return cachedFetch(
      key,
      TTL.homework,
      () => api.get<HomeworkAssignment>(`/homework/${id}`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  start: async (homeworkId: string, opts?: { force?: boolean }) => {
    const key = cacheKey("POST", `/homework/start:${homeworkId}`)
    if (!opts?.force) {
      const cached = peekCached<HomeworkSubmission>(key)
      if (cached) return cached
    }
    const sub = await api.post<HomeworkSubmission>("/homework/start", { homeworkId })
    setCached(key, sub, submissionCacheTtl(sub))
    invalidateKey(cacheKey("GET", "/homework/mine"))
    clearHomeworkListSnapshot()
    return sub
  },
  pause: async (homeworkId: string) => {
    const res = await api.post<ViolationResponse>("/homework/pause", { homeworkId })
    invalidateHomeworkCaches(homeworkId)
    return res
  },
  recordAttempt: async (homeworkId: string, attempt: HomeworkAttempt) => {
    const sub = await api.post<HomeworkSubmission>("/homework/attempt", {
      homeworkId,
      attempt,
    })
    setCached(cacheKey("POST", `/homework/start:${homeworkId}`), sub, submissionCacheTtl(sub))
    invalidateHomeworkCaches(homeworkId)
    return sub
  },
  reportViolation: async (homeworkId: string, reason: ViolationReason) => {
    const res = await api.post<ViolationResponse>("/homework/violation", {
      homeworkId,
      reason,
    })
    invalidateHomeworkCaches(homeworkId)
    return res
  },
}

export interface NotificationItem {
  id: string
  studentId: string
  type: "homework" | "result" | "reminder" | "achievement" | "system" | "entry_test"
  title: string
  message: string
  read: boolean
  createdAt: string
}

export const notificationsApi = {
  list: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/notifications")
    return cachedFetch(
      key,
      TTL.notifications,
      () => api.get<NotificationItem[]>("/notifications"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  markRead: async (id: string, read = true) => {
    const item = await api.patch<NotificationItem>(`/notifications/${id}/read`, { read })
    invalidateKey(cacheKey("GET", "/notifications"))
    return item
  },
  markAllRead: async () => {
    await api.post("/notifications/read-all")
    invalidateKey(cacheKey("GET", "/notifications"))
  },
}

export const exercisesApi = {
  list: (topic?: string, opts?: { force?: boolean }) => {
    const path = `/exercises${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`
    const key = cacheKey("GET", path)
    return cachedFetch(
      key,
      TTL.exercises,
      () => api.get<GrammarExercise[]>(path),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  topics: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/exercises/topics")
    return cachedFetch(
      key,
      TTL.topics,
      () => api.get<TopicMeta[]>("/exercises/topics"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  get: (slug: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/exercises/${slug}`)
    return cachedFetch(
      key,
      TTL.exercise,
      () => api.get<GrammarExercise>(`/exercises/${slug}`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  vocab: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/exercises/vocab")
    return cachedFetch(
      key,
      TTL.vocab,
      () => api.get<VocabDeck[]>("/exercises/vocab"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  vocabDeck: (slug: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/exercises/vocab/${slug}`)
    return cachedFetch(
      key,
      TTL.vocabDeck,
      () => api.get<VocabDeck>(`/exercises/vocab/${slug}`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
}

export const testResultsApi = {
  list: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/test-results")
    return cachedFetch(
      key,
      TTL.testResults,
      () => api.get<TestResult[]>("/test-results"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
}

export const analyticsApi = {
  record: (event: {
    topic: string
    subtopic: string
    slug: string
    title: string
    type: string
    correctCount: number
    totalQuestions: number
    timedOut?: boolean
    studentId?: string
  }) => api.post("/analytics/events", event),
}
