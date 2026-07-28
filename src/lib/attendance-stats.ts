import type { AttendanceStatus, LessonSession } from "../types/staff"

const ATTENDED: AttendanceStatus[] = ["present", "late", "excused"]

function todayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export interface StudentAttendanceStat {
  attended: number
  total: number
  /** 0–100, or null when there are no lessons yet. */
  rate: number | null
}

export interface StudentAttendanceInput {
  id: string
  /** ISO date — first day the student counts toward this group's attendance. */
  groupJoinedAt: string
}

export interface StudentAttendanceStatusCounts {
  present: number
  late: number
  absent: number
  excused: number
  unmarked: number
}

export interface StudentRecentAttendance {
  date: string
  status: AttendanceStatus | null
}

function toLocalDateString(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function computeStudentAttendanceRates(
  lessons: LessonSession[],
  students: StudentAttendanceInput[],
  options?: { asOfDate?: string },
): Map<string, StudentAttendanceStat> {
  const asOf = options?.asOfDate ?? todayDateString()
  const completedLessons = lessons.filter((lesson) => lesson.date <= asOf)

  const joinDateByStudent = new Map(
    students.map((s) => [s.id, toLocalDateString(s.groupJoinedAt)]),
  )

  const totals = new Map<string, { attended: number; total: number }>()
  for (const s of students) {
    totals.set(s.id, { attended: 0, total: 0 })
  }

  for (const lesson of completedLessons) {
    if (lesson.canceled) continue
    const byStudent = new Map(lesson.attendance.map((row) => [row.studentId, row.status]))
    for (const s of students) {
      const joinDate = joinDateByStudent.get(s.id)!
      if (lesson.date < joinDate) continue

      const entry = totals.get(s.id)!
      entry.total += 1
      const status = byStudent.get(s.id)
      if (status && ATTENDED.includes(status)) entry.attended += 1
    }
  }

  const result = new Map<string, StudentAttendanceStat>()
  for (const [id, { attended, total }] of totals) {
    result.set(id, {
      attended,
      total,
      rate: total === 0 ? null : Math.round((attended / total) * 100),
    })
  }
  return result
}

export function computeStudentAttendanceStatusCounts(
  lessons: LessonSession[],
  student: StudentAttendanceInput,
  options?: { asOfDate?: string },
): StudentAttendanceStatusCounts {
  const asOf = options?.asOfDate ?? todayDateString()
  const joinDate = toLocalDateString(student.groupJoinedAt)
  const counts: StudentAttendanceStatusCounts = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    unmarked: 0,
  }

  for (const lesson of lessons) {
    if (lesson.canceled || lesson.date > asOf || lesson.date < joinDate) continue
    const status = lesson.attendance.find((row) => row.studentId === student.id)?.status
    if (!status) {
      counts.unmarked += 1
      continue
    }
    counts[status] += 1
  }

  return counts
}

export function getRecentStudentAttendance(
  lessons: LessonSession[],
  student: StudentAttendanceInput,
  limit = 5,
  options?: { asOfDate?: string },
): StudentRecentAttendance[] {
  const asOf = options?.asOfDate ?? todayDateString()
  const joinDate = toLocalDateString(student.groupJoinedAt)

  return lessons
    .filter(
      (lesson) =>
        !lesson.canceled && lesson.date <= asOf && lesson.date >= joinDate,
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((lesson) => ({
      date: lesson.date,
      status: lesson.attendance.find((row) => row.studentId === student.id)?.status ?? null,
    }))
}

export function attendanceRateColors(rate: number | null): { text: string; bg: string } {
  if (rate == null) return { text: "#64748B", bg: "#F1F5F9" }
  if (rate >= 80) return { text: "#15803D", bg: "#DCFCE7" }
  if (rate >= 60) return { text: "#B45309", bg: "#FEF3C7" }
  return { text: "#B91C1C", bg: "#FEE2E2" }
}
