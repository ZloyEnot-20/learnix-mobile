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
import type {
  AttendanceRecord,
  CreateHomeworkInput,
  Group,
  HomeworkCheckResponse,
  HomeworkDetailsResponse,
  LessonSession,
  StaffStudent,
} from "../types/staff"
import type { GrammarExercise, GrammarExerciseSummary, ExerciseMeta } from "../types/grammar"
import type { StudentLevel, LeaderboardEntry } from "../types/gamification"
import type { StudentLanguageProfile } from "../types/language-profile"
import type { StudentContextResponse } from "./lesson-schedule"
import type { VocabDeck, TopicMeta, VocabDeckSummary } from "../types/vocabulary"
import type { PodcastEpisode, PodcastSummary } from "../types/podcast"
import type { IssueReport, IssueReportPayload } from "../types/issue-report"
import type { AdminDashboardStats, AdminTeacherOverview, AdminBroadcastRecord, AdminAlert } from "../types/admin"
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
  languageProfile: 120_000,
  leaderboard: 120_000,
  notifications: 30_000,
  testResults: 60_000,
  submissionActive: 30_000,
  submissionDone: 300_000,
  groups: 60_000,
  studentsList: 60_000,
  lessons: 45_000,
  homeworkStaff: 45_000,
} as const

function invalidateStaffHomeworkCaches(homeworkId?: string): void {
  invalidateKey(cacheKey("GET", "/homework"))
  invalidateKey(cacheKey("GET", "/homework/check"))
  if (homeworkId) {
    invalidateKey(cacheKey("GET", `/homework/${homeworkId}`))
    invalidateKey(cacheKey("GET", `/homework/${homeworkId}/details`))
  } else {
    invalidatePrefix(cacheKey("GET", "/homework/"))
  }
}

function invalidateLessonsCaches(groupId?: string): void {
  if (groupId) {
    invalidatePrefix(cacheKey("GET", `/lessons?groupId=${groupId}`))
  } else {
    invalidatePrefix(cacheKey("GET", "/lessons?"))
  }
}

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
  list: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/students")
    return cachedFetch(
      key,
      TTL.studentsList,
      () => api.get<StaffStudent[]>("/students"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
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
  languageProfile: (id: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/students/${id}/language-profile`)
    return cachedFetch(
      key,
      TTL.languageProfile,
      () => api.get<StudentLanguageProfile>(`/students/${id}/language-profile`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  deleteAccount: (id: string) =>
    api.post<{ ok: true; deletedAt: string }>(`/students/${id}/delete-account`),
  update: async (id: string, patch: Partial<StaffStudent>) => {
    const student = await api.patch<StaffStudent>(`/students/${id}`, patch)
    invalidateKey(cacheKey("GET", "/students"))
    return student
  },
  block: async (id: string) => {
    const student = await api.post<StaffStudent>(`/students/${id}/block`)
    invalidateKey(cacheKey("GET", "/students"))
    return student
  },
  unblock: async (id: string) => {
    const student = await api.post<StaffStudent>(`/students/${id}/unblock`)
    invalidateKey(cacheKey("GET", "/students"))
    return student
  },
  resetPassword: (id: string) =>
    api.post<{
      login: string
      password: string
      confirmation: { login: string; code: string; expiresAt: string }
    }>(`/students/${id}/reset-password`),
  notify: (id: string, input: { title: string; message: string }) =>
    api.post(`/students/${id}/notify`, { ...input, type: "system" }),
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
  list: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/homework")
    return cachedFetch(
      key,
      TTL.homeworkStaff,
      () => api.get<HomeworkAssignment[]>("/homework"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  check: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/homework/check")
    return cachedFetch(
      key,
      TTL.homeworkStaff,
      () => api.get<HomeworkCheckResponse>("/homework/check"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  create: async (input: CreateHomeworkInput) => {
    const hw = await api.post<HomeworkAssignment>("/homework", input)
    invalidateStaffHomeworkCaches()
    return hw
  },
  details: (id: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/homework/${id}/details`)
    return cachedFetch(
      key,
      TTL.homeworkStaff,
      () => api.get<HomeworkDetailsResponse>(`/homework/${id}/details`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  submissions: (params?: { homeworkId?: string; studentId?: string }, opts?: { force?: boolean }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v != null && v !== ""),
      ) as Record<string, string>,
    ).toString()
    const path = `/homework/submissions${qs ? `?${qs}` : ""}`
    const key = cacheKey("GET", path)
    return cachedFetch(
      key,
      TTL.homeworkStaff,
      () => api.get<HomeworkSubmission[]>(path),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  grade: async (
    submissionId: string,
    patch: Partial<HomeworkSubmission> & {
      recordingGrades?: Array<{
        questionId: number
        score?: number
        feedback?: string
      }>
    },
  ) => {
    const sub = await api.patch<HomeworkSubmission>(
      `/homework/submissions/${submissionId}`,
      patch,
    )
    invalidateStaffHomeworkCaches(sub.homeworkId)
    return sub
  },
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
  saveProgress: async (homeworkId: string, attempt: HomeworkAttempt) => {
    const sub = await api.post<HomeworkSubmission>("/homework/progress", {
      homeworkId,
      attempt,
    })
    setCached(cacheKey("POST", `/homework/start:${homeworkId}`), sub, submissionCacheTtl(sub))
    invalidateHomeworkCaches(homeworkId)
    return sub
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

export const groupsApi = {
  list: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/groups")
    return cachedFetch(
      key,
      TTL.groups,
      () => api.get<Group[]>("/groups"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  get: (id: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/groups/${id}`)
    return cachedFetch(
      key,
      TTL.groups,
      () => api.get<Group>(`/groups/${id}`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
}

export const lessonsApi = {
  list: (params: { groupId: string; month?: string }, opts?: { force?: boolean }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null && v !== ""),
      ) as Record<string, string>,
    ).toString()
    const path = `/lessons?${qs}`
    const key = cacheKey("GET", path)
    return cachedFetch(
      key,
      TTL.lessons,
      () => api.get<LessonSession[]>(path),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  get: (id: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/lessons/${id}`)
    return cachedFetch(
      key,
      TTL.lessons,
      () => api.get<LessonSession>(`/lessons/${id}`),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  create: async (input: {
    groupId: string
    date: string
    topic?: string
    notes?: string
  }) => {
    const lesson = await api.post<LessonSession>("/lessons", input)
    invalidateLessonsCaches(input.groupId)
    return lesson
  },
  update: async (
    id: string,
    patch: {
      topic?: string
      notes?: string
      canceled?: boolean
      cancelReason?: string
      attendance?: AttendanceRecord[]
    },
  ) => {
    const lesson = await api.patch<LessonSession>(`/lessons/${id}`, patch)
    invalidateLessonsCaches(lesson.groupId)
    invalidateKey(cacheKey("GET", `/lessons/${id}`))
    return lesson
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

const MOBILE_HIDDEN_NOTIFICATION_TYPES = new Set<string>(["attendance"])
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
  summaries: (topic?: string, opts?: { force?: boolean; category?: string }) => {
    const params = new URLSearchParams()
    if (topic) params.set("topic", topic)
    if (opts?.category) params.set("category", opts.category)
    const qs = params.toString()
    const path = `/exercises/summary${qs ? `?${qs}` : ""}`
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
  listeningSummaries: (opts?: { force?: boolean }) => {
    const key = cacheKey("GET", "/exercises/listening/summary")
    return cachedFetch(
      key,
      TTL.exercises,
      () =>
        api.get<import("../types/listening").IeltsListeningSummary[]>("/exercises/listening/summary"),
      { staleWhileRevalidate: true, force: opts?.force },
    )
  },
  listening: (slug: string, opts?: { force?: boolean }) => {
    const key = cacheKey("GET", `/exercises/listening/${slug}`)
    return cachedFetch(
      key,
      TTL.exercises,
      () =>
        api.get<import("../types/listening").IeltsListeningDocument>(`/exercises/listening/${slug}`),
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
  failHomeworkOnAppExit?: boolean
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
      incorrectCount?: number
      masteredAt?: string
      permanentlyMastered?: boolean
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
    api.get<{
      wordsMastered: number
      totalWordsTracked: number
      words: Array<{
        term: string
        deckSlug: string
        correctCount: number
        incorrectCount: number
        totalAttempts: number
        accuracy: number | null
        masteredAt: string | null
        permanentlyMastered: boolean
        wantToLearn: boolean
        lastReviewedAt: string | null
      }>
      decks: Array<{
        deckSlug: string
        deckTitle: string
        quizAttempts: number
        quizCorrectSum: number
        bestAccuracy: number
        wordsMastered: number
        totalWords: number
      }>
    }>(`/analytics/learn/progress${studentId ? `/${studentId}` : ""}`),
  summary: (studentId?: string) =>
    api.get(`/analytics${studentId ? `/students/${studentId}/summary` : "/summary"}`),
}

export const issueReportsApi = {
  create: (payload: IssueReportPayload) =>
    api.post<IssueReport>("/issue-reports", payload),
}

export type {
  AdminDashboardStats,
  AdminTeacherOverview,
  AdminBroadcastRecord,
  AdminAlert,
  AdminAlertType,
} from "../types/admin"

export const adminApi = {
  dashboard: () => api.get<AdminDashboardStats>("/admin/dashboard"),
  teachers: () => api.get<AdminTeacherOverview[]>("/admin/teachers"),
  broadcast: (input: {
    audience: "all" | "group" | "student"
    audienceId?: string
    title: string
    message: string
  }) => api.post<AdminBroadcastRecord>("/admin/notifications/broadcast", input),
  broadcastHistory: () => api.get<AdminBroadcastRecord[]>("/admin/notifications/history"),
  alerts: () => api.get<AdminAlert[]>("/admin/alerts"),
  readAlert: (alertKey: string) =>
    api.patch<{ ok: boolean }>("/admin/alerts/read", { alertKey }),
  readAllAlerts: (alertKeys: string[]) =>
    api.post<{ ok: boolean }>("/admin/alerts/read-all", { alertKeys }),
}

