import { api } from "./api-client"
import type {
  HomeworkAssignment,
  HomeworkAttempt,
  HomeworkSubmission,
  StudentHomeworkEntry,
  TestResult,
} from "../types/domain"
import type { GrammarExercise } from "../types/grammar"
import type { StudentLevel } from "../types/gamification"
import type { VocabDeck, TopicMeta } from "../types/vocabulary"

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
  level: (id: string) => api.get<StudentLevel>(`/students/${id}/level`),
  context: (id: string) =>
    api.get<{ groupName: string | null; teacherName: string | null }>(
      `/students/${id}/context`,
    ),
}

export const homeworkApi = {
  mine: () => api.get<StudentHomeworkEntry[]>("/homework/mine"),
  get: (id: string) => api.get<HomeworkAssignment>(`/homework/${id}`),
  start: (homeworkId: string) =>
    api.post<HomeworkSubmission>("/homework/start", { homeworkId }),
  recordAttempt: (homeworkId: string, attempt: HomeworkAttempt) =>
    api.post<HomeworkSubmission>("/homework/attempt", { homeworkId, attempt }),
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
  list: () => api.get<NotificationItem[]>("/notifications"),
  markRead: (id: string, read = true) =>
    api.patch<NotificationItem>(`/notifications/${id}/read`, { read }),
  markAllRead: () => api.post("/notifications/read-all"),
}

export const exercisesApi = {
  list: (topic?: string) =>
    api.get<GrammarExercise[]>(
      `/exercises${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`,
    ),
  topics: () => api.get<TopicMeta[]>("/exercises/topics"),
  get: (slug: string) => api.get<GrammarExercise>(`/exercises/${slug}`),
  vocab: () => api.get<VocabDeck[]>("/exercises/vocab"),
  vocabDeck: (slug: string) => api.get<VocabDeck>(`/exercises/vocab/${slug}`),
}

export const testResultsApi = {
  list: () => api.get<TestResult[]>("/test-results"),
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
