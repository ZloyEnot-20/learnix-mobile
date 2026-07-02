import { api, apiUpload } from "./api-client"
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
  StudentHomeworkSummaryEntry,
  ControlWork,
  ControlWorkSubmission,
  StudentControlWorkEntry,
  TestResult,
  ViolationReason,
  ViolationResponse,
} from "../types/domain"
import type { GrammarExercise, GrammarExerciseSummary, ExerciseMeta } from "../types/grammar"
import type { StudentLevel, LeaderboardEntry } from "../types/gamification"
import type { StudentContextResponse } from "./lesson-schedule"
import type { VocabDeck, TopicMeta, VocabDeckSummary } from "../types/vocabulary"
import type { PodcastEpisode, PodcastSummary } from "../types/podcast"
import type { IssueReport, IssueReportPayload } from "../types/issue-report"
import { runPerfTrace, type PerfAttributes } from "./perf"

export { peekCached, peekStale, clearApiCache }

function submitHomeworkTraceMeta(attempt: HomeworkAttempt): {
  name: string
  attributes: PerfAttributes
} {
  if (attempt.readingAnswers && attempt.readingAnswers.length > 0) {
    return {
      name: "submit_ielts_test",
      attributes: { testType: "ielts", homeworkType: "reading" },
    }
  }

  const isSpeaking = attempt.mistakes.some(
    (mistake) =>
      mistake.userAnswer.startsWith("http") && mistake.correctAnswer === "",
  )
  if (isSpeaking) {
    return { name: "submit_speaking_homework", attributes: { homeworkType: "speaking" } }
  }

  if (attempt.listeningStats) {
    return { name: "submit_homework", attributes: { homeworkType: "listening" } }
  }

  return { name: "submit_homework", attributes: {} }
}

const TTL = {
  homeworkMine: 45_000,
  homework: 120_000,
  exercises: 300_000,
  exercise: 600_000,
  vocab: 600_000,
  vocabDeck: 600_000,
  podcast: 600_000,
  topics: 300_000,
  studentLevel: 120_000,
  studentContext: 120_000,
  leaderboard: 120_000,
  notifications: 30_000,
  testResults: 60_000,
  submissionActive: 30_000,
  submissionDone: 300_000,
} as const

function submissionCacheTtl(sub: { status: string }): number {
  return sub.status === "submitted" || sub.status === "graded"
    ? TTL.submissionDone
    : TTL.submissionActive
}

function invalidateHomeworkCaches(homeworkId?: string): void {
  invalidateKey(cacheKey("GET", "/homework/mine"))
  invalidateKey(cacheKey("GET", "/homework/mine/summary"))
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
  type: "admin" | "teacher" | "student" | "super_admin" | "guest"
  isPremium: boolean
  avatarUrl?: string | null
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
  guest: () => api.post<AuthResponse>("/auth/guest", undefined, false),
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
  context: (id: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/students/${id}/context`)
    return cachedFetch(
      key,
      TTL.studentContext,
      () => api.get<StudentContextResponse>(`/students/${id}/context`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  deleteAccount: (id: string) =>
    api.post<{ ok: true; deletedAt: string }>(`/students/${id}/delete-account`),
}

export const pushTokenApi = {
  register: (studentId: string, token: string, platform: "ios" | "android") =>
    api.post<{ ok: true }>(`/students/${studentId}/push-token`, { token, platform }),
  unregister: (studentId: string, token: string) =>
    api.del<{ ok: true }>(`/students/${studentId}/push-token`, { token }),
}

export const debugApi = {
  pushTokens: (body: { apnsToken: string | null; fcmToken: string | null }) =>
    api.post<void>("/debug/push-token", body),
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
  mineSummary: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/homework/mine/summary")
    return cachedFetch(
      key,
      TTL.homeworkMine,
      () => api.get<StudentHomeworkSummaryEntry[]>("/homework/mine/summary"),
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
  recordEntry: async (homeworkId: string) => {
    const sub = await api.post<HomeworkSubmission>("/homework/entry", { homeworkId })
    setCached(cacheKey("POST", `/homework/start:${homeworkId}`), sub, submissionCacheTtl(sub))
    invalidateHomeworkCaches(homeworkId)
    return sub
  },
  start: async (homeworkId: string, opts?: { force?: boolean; skipEntryCount?: boolean }) => {
    const key = cacheKey("POST", `/homework/start:${homeworkId}`)
    if (!opts?.force) {
      const cached = peekCached<HomeworkSubmission>(key)
      if (cached) return cached
    }
    const sub = await api.post<HomeworkSubmission>("/homework/start", {
      homeworkId,
      skipEntryCount: opts?.skipEntryCount ?? false,
    })
    setCached(key, sub, submissionCacheTtl(sub))
    invalidateHomeworkCaches(homeworkId)
    return sub
  },
  pause: async (homeworkId: string) => {
    const res = await api.post<ViolationResponse>("/homework/pause", { homeworkId })
    invalidateHomeworkCaches(homeworkId)
    return res
  },
  recordAttempt: async (homeworkId: string, attempt: HomeworkAttempt) => {
    const { name, attributes } = submitHomeworkTraceMeta(attempt)
    return runPerfTrace(
      name,
      async () => {
        const sub = await api.post<HomeworkSubmission>("/homework/attempt", {
          homeworkId,
          attempt,
        })
        setCached(cacheKey("POST", `/homework/start:${homeworkId}`), sub, submissionCacheTtl(sub))
        invalidateHomeworkCaches(homeworkId)
        return sub
      },
      attributes,
    )
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

function invalidateControlWorkCaches(controlWorkId?: string): void {
  invalidateKey(cacheKey("GET", "/control-works/mine"))
  invalidateKey(cacheKey("GET", "/control-works/mine/summary"))
  clearHomeworkListSnapshot()
  if (controlWorkId) {
    invalidateKey(cacheKey("GET", `/control-works/${controlWorkId}`))
    invalidateKey(cacheKey("POST", `/control-works/start:${controlWorkId}`))
  }
}

export const controlWorkApi = {
  mine: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/control-works/mine")
    return cachedFetch(
      key,
      TTL.homeworkMine,
      () => api.get<StudentControlWorkEntry[]>("/control-works/mine"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  mineSummary: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/control-works/mine/summary")
    return cachedFetch(
      key,
      TTL.homeworkMine,
      () => api.get<StudentControlWorkEntry[]>("/control-works/mine/summary"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  get: (id: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/control-works/${id}`)
    return cachedFetch(
      key,
      TTL.homework,
      () => api.get<ControlWork>(`/control-works/${id}`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  start: async (controlWorkId: string, opts?: { force?: boolean }) => {
    const key = cacheKey("POST", `/control-works/start:${controlWorkId}`)
    if (!opts?.force) {
      const cached = peekCached<ControlWorkSubmission>(key)
      if (cached) return cached
    }
    const sub = await api.post<ControlWorkSubmission>("/control-works/start", { controlWorkId })
    setCached(key, sub, submissionCacheTtl(sub))
    invalidateControlWorkCaches(controlWorkId)
    return sub
  },
  completeStep: async (
    controlWorkId: string,
    stepIndex: number,
    attempt: HomeworkAttempt,
  ) => {
    const sub = await api.post<ControlWorkSubmission>("/control-works/step", {
      controlWorkId,
      stepIndex,
      attempt,
    })
    setCached(
      cacheKey("POST", `/control-works/start:${controlWorkId}`),
      sub,
      submissionCacheTtl(sub),
    )
    invalidateControlWorkCaches(controlWorkId)
    return sub
  },
  pause: async (controlWorkId: string) => {
    const res = await api.post<ViolationResponse>("/control-works/pause", { controlWorkId })
    invalidateControlWorkCaches(controlWorkId)
    return res
  },
  reportViolation: async (controlWorkId: string, reason: ViolationReason) => {
    const res = await api.post<ViolationResponse>("/control-works/violation", {
      controlWorkId,
      reason,
    })
    invalidateControlWorkCaches(controlWorkId)
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

const MOBILE_HIDDEN_NOTIFICATION_TYPES = new Set<string>([])
export function filterMobileNotifications<T extends { type: string }>(items: T[]): T[] {
  return items.filter((item) => !MOBILE_HIDDEN_NOTIFICATION_TYPES.has(item.type))
}

export const notificationsApi = {
  list: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/notifications")
    return cachedFetch(
      key,
      TTL.notifications,
      () =>
        api
          .get<NotificationItem[]>("/notifications")
          .then((items) => filterMobileNotifications(items)),
      { staleWhileRevalidate: true, force: opts?.force },
    ).then(filterMobileNotifications)
  },
  markRead: async (id: string, read = true) => {
    return runPerfTrace("mark_notification_read", async () => {
      const item = await api.patch<NotificationItem>(`/notifications/${id}/read`, { read })
      invalidateKey(cacheKey("GET", "/notifications"))
      return item
    })
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
  summaries: (topic?: string, opts?: { force?: boolean }) => {
    const path = `/exercises/summary${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`
    const key = cacheKey("GET", path)
    return cachedFetch(
      key,
      TTL.exercises,
      () => api.get<GrammarExerciseSummary[]>(path),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  metaBatch: async (slugs: string[], opts?: { force?: boolean }) => {
    const normalized = [...new Set(slugs.filter(Boolean))].sort()
    const key = cacheKey("POST", `/exercises/meta:${normalized.join(",")}`)
    return cachedFetch(
      key,
      TTL.exercises,
      () => api.post<ExerciseMeta[]>("/exercises/meta", { slugs: normalized }),
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
  vocabSummaries: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/exercises/vocab/summary")
    return cachedFetch(
      key,
      TTL.vocab,
      () => api.get<VocabDeckSummary[]>("/exercises/vocab/summary"),
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
  podcasts: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/exercises/podcasts")
    return cachedFetch(
      key,
      TTL.podcast,
      () => api.get<PodcastEpisode[]>("/exercises/podcasts"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  podcastSummaries: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/exercises/podcasts/summary")
    return cachedFetch(
      key,
      TTL.podcast,
      () => api.get<PodcastSummary[]>("/exercises/podcasts/summary"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  podcast: (slug: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/exercises/podcasts/${slug}`)
    return cachedFetch(
      key,
      TTL.podcast,
      () => api.get<PodcastEpisode>(`/exercises/podcasts/${slug}`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  readingSummaries: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/exercises/reading/summary")
    return cachedFetch(
      key,
      TTL.exercises,
      () => api.get<import("../types/reading").IeltsReadingSummary[]>("/exercises/reading/summary"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  reading: (slug: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/exercises/reading/${slug}`)
    return cachedFetch(
      key,
      TTL.exercises,
      () => api.get<import("../types/reading").IeltsReadingDocument>(`/exercises/reading/${slug}`),
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

export interface OrgSettings {
  allowScreenshots: boolean
  entryTestAutocomplete?: boolean
}

export const orgApi = {
  settings: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/org/settings")
    return cachedFetch(
      key,
      120_000,
      () => api.get<OrgSettings>("/org/settings"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  leaderboard: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/org/leaderboard")
    return cachedFetch(
      key,
      TTL.leaderboard,
      () => api.get<LeaderboardEntry[]>("/org/leaderboard"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
}

export const uploadsApi = {
  speakingAudio: (uri: string) =>
    runPerfTrace("upload_audio", async () => {
      const form = new FormData()
      form.append("audio", {
        uri,
        type: "audio/m4a",
        name: `speaking-${Date.now()}.m4a`,
      } as unknown as Blob)
      return apiUpload<{ url: string; key: string }>("/uploads/speaking-audio", form)
    }),
  avatar: (uri: string, mimeType = "image/jpeg") =>
    runPerfTrace("upload_avatar", async () => {
      const ext = mimeType.includes("png") ? "png" : "jpg"
      const form = new FormData()
      form.append("photo", {
        uri,
        type: mimeType,
        name: `avatar-${Date.now()}.${ext}`,
      } as unknown as Blob)
      return apiUpload<{ url: string; user: AuthUser }>("/uploads/avatar", form)
    }),
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
    source?: "game" | "homework" | "control_work"
    homeworkId?: string
    controlWorkId?: string
    durationSeconds?: number
  }) => api.post("/analytics/events", event),
  recordVocab: (input: {
    deckSlug: string
    deckTitle: string
    correct: number
    total: number
    source?: "game" | "homework"
    totalWords?: number
    wordAnswers?: Array<{
      term: string
      correct: boolean
      interactionType?: string
      deckSlug?: string
    }>
    words?: Array<{ term: string; partOfSpeech?: string; definition?: string; deckSlug?: string; deckTitle?: string }>
  }) => api.post("/analytics/vocab", input),
  recordVocabWord: (input: {
    term: string
    deckSlug: string
    correct: boolean
    interactionType?: string
  }) => api.post("/analytics/vocab/word", input),
  syncLearn: (input: {
    studyWords?: Array<{
      term: string
      deckSlug: string
      correctCount?: number
      totalAttempts?: number
      masteredAt?: string
      wantToLearn?: boolean
      lastReviewedAt?: string
    }>
    vocabResults?: Array<{
      deckSlug: string
      deckTitle?: string
      correct: number
      total: number
      completedAt?: string
    }>
  }) => api.post("/analytics/learn/sync", input),
  learnProgress: (studentId?: string) =>
    api.get(`/analytics/learn/progress${studentId ? `/${studentId}` : ""}`),
  summary: (studentId?: string) =>
    api.get(`/analytics${studentId ? `/students/${studentId}/summary` : "/summary"}`),
}

export const issueReportsApi = {
  create: (payload: IssueReportPayload) =>
    api.post<IssueReport>("/issue-reports", payload),
}

