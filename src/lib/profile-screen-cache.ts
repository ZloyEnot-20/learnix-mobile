import type { StudentLevel, LeaderboardEntry } from "../types/gamification"
import type { TestResult } from "../types/domain"
import { cacheKey, peekStale } from "./api-cache"
import { getHomeScreenSnapshot } from "./home-screen-cache"
import { peekWordsLearned } from "./learned-vocabulary"
import {
  normalizeLessonSchedule,
  type LessonSchedule,
  type StudentContextResponse,
} from "./lesson-schedule"

export interface ProfileScreenSnapshot {
  studentLevel: StudentLevel | null
  groupName: string | null
  teacherName: string | null
  lessonSchedule: LessonSchedule | null
  wordsLearned: number
  rank: number | null
  testsCount: number
}

let snapshot: { studentId: string; data: ProfileScreenSnapshot } | null = null

export function getProfileScreenSnapshot(studentId: string): ProfileScreenSnapshot | null {
  if (!snapshot || snapshot.studentId !== studentId) return null
  return snapshot.data
}

export function setProfileScreenSnapshot(studentId: string, data: ProfileScreenSnapshot): void {
  snapshot = { studentId, data }
}

export function clearProfileScreenSnapshot(): void {
  snapshot = null
}

function rankFromLeaderboard(
  entries: LeaderboardEntry[] | null | undefined,
  studentId: string,
): number | null {
  if (!entries) return null
  return entries.find((entry) => entry.studentId === studentId)?.rank ?? null
}

function fieldsFromContext(ctx: StudentContextResponse | null | undefined) {
  if (!ctx) {
    return { groupName: null, teacherName: null, lessonSchedule: null as LessonSchedule | null }
  }
  return {
    groupName: ctx.groupName,
    teacherName: ctx.teacherName,
    lessonSchedule: normalizeLessonSchedule(ctx.lessonSchedule),
  }
}

/** Session snapshot, or a merge of home snapshot + in-memory API / vocab caches. */
export function resolveProfileBootstrap(studentId: string): ProfileScreenSnapshot | null {
  const existing = getProfileScreenSnapshot(studentId)
  if (existing) return existing

  const home = getHomeScreenSnapshot(studentId)
  const level = peekStale<StudentLevel>(cacheKey("GET", `/students/${studentId}/level`))
  const ctx = peekStale<StudentContextResponse>(cacheKey("GET", `/students/${studentId}/context`))
  const leaderboard = peekStale<LeaderboardEntry[]>(cacheKey("GET", "/org/leaderboard"))
  const testResults = peekStale<TestResult[]>(cacheKey("GET", "/test-results"))
  const wordsLearned = peekWordsLearned(studentId)

  const hasAny =
    home != null ||
    level != null ||
    ctx != null ||
    leaderboard != null ||
    testResults != null ||
    wordsLearned != null

  if (!hasAny) return null

  const fromCtx = fieldsFromContext(ctx)

  return {
    studentLevel: level ?? null,
    groupName: fromCtx.groupName,
    teacherName: fromCtx.teacherName,
    lessonSchedule: fromCtx.lessonSchedule ?? home?.lessonSchedule ?? null,
    wordsLearned: wordsLearned ?? 0,
    rank: rankFromLeaderboard(leaderboard, studentId),
    testsCount: home?.results.length ?? testResults?.length ?? 0,
  }
}
