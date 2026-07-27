import type { Group, LessonSession } from "../types/staff"
import { formatLessonSchedule, normalizeLessonSchedule } from "./lesson-schedule"

export type LessonWithGroup = LessonSession & {
  groupName: string
  groupScheduleLabel: string | null
}

export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function currentMonthKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function nextMonthKey(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function attachGroupMeta(lessons: LessonSession[], groups: Group[]): LessonWithGroup[] {
  const byId = new Map(groups.map((g) => [g.id, g]))
  return lessons.map((lesson) => {
    const group = byId.get(lesson.groupId)
    const schedule = group
      ? normalizeLessonSchedule({
          weekdays: group.lessonWeekdays,
          startTime: group.lessonStartTime,
          endTime: group.lessonEndTime,
        })
      : null
    return {
      ...lesson,
      groupName: group?.name ?? "Group",
      groupScheduleLabel: formatLessonSchedule(schedule),
    }
  })
}

export function filterActiveLessons<T extends LessonSession>(lessons: T[]): T[] {
  return lessons.filter((l) => !l.canceled)
}

export function lessonsOnDate(lessons: LessonWithGroup[], date: string): LessonWithGroup[] {
  return filterActiveLessons(lessons)
    .filter((l) => l.date === date)
    .sort((a, b) => a.groupName.localeCompare(b.groupName))
}

export function upcomingLessons(
  lessons: LessonWithGroup[],
  afterDate: string,
  limit = 5,
): LessonWithGroup[] {
  return filterActiveLessons(lessons)
    .filter((l) => l.date > afterDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.groupName.localeCompare(b.groupName))
    .slice(0, limit)
}

export function formatLessonDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  if (!y || !m || !d) return date
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function formatGroupSchedule(group: Group): string | null {
  const schedule = normalizeLessonSchedule({
    weekdays: group.lessonWeekdays,
    startTime: group.lessonStartTime,
    endTime: group.lessonEndTime,
  })
  return formatLessonSchedule(schedule)
}
