import { isPodcastHomework } from "../types/podcast"
import type { HomeworkAssignment, HomeworkSubmission } from "../types/domain"
import type { AssignFolder } from "../theme/teacher-tokens"
import { subjectFolderMeta } from "../theme/teacher-tokens"
import { studentsInGroup, type StaffStudent } from "../types/staff"
import { percentColors, submissionPercent } from "./teacher-homework"

export const MATRIX_STUDENT_COL_WIDTH = 128
export const MATRIX_CELL_WIDTH = 58
export const MATRIX_HEADER_HEIGHT = 36
export const MATRIX_SUBHEADER_HEIGHT = 32
export const MATRIX_ROW_HEIGHT = 52

export type HomeworkMatrixColumn = {
  homework: HomeworkAssignment
  folder: AssignFolder
  dateKey: string
  dateLabel: string
  taskLabel: string
}

export type HomeworkMatrixCell = {
  homework: HomeworkAssignment
  submission: HomeworkSubmission | null
  percent: number | null
}

export type HomeworkMatrixRow = {
  student: StaffStudent
  cells: HomeworkMatrixCell[]
}

export type HomeworkDateGroup = {
  dateKey: string
  dateLabel: string
  columns: HomeworkMatrixColumn[]
}

export function homeworkAssignFolder(hw: HomeworkAssignment): AssignFolder {
  if (isPodcastHomework(hw.subject, hw.exerciseSlug)) return "podcast"
  return hw.subject
}

function dueDateKey(dueAt: string): string {
  const d = new Date(dueAt)
  if (Number.isNaN(d.getTime())) return dueAt.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatColumnDate(dueAt: string): string {
  const d = new Date(dueAt)
  if (Number.isNaN(d.getTime())) return dueAt
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number)
  if (!y || !m) return monthKey
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}

export function monthKeyFromDate(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number)
  const d = new Date(y, (m || 1) - 1 + delta, 1)
  const ny = d.getFullYear()
  const nm = String(d.getMonth() + 1).padStart(2, "0")
  return `${ny}-${nm}`
}

export { formatMonthLabel }

export function shortTaskLabel(title: string, max = 8): string {
  const cleaned = title.trim()
  if (!cleaned) return "—"
  const afterColon = cleaned.split(":").pop()?.trim()
  const candidate = afterColon && afterColon.length < cleaned.length ? afterColon : cleaned
  if (candidate.length <= max) return candidate
  return `${candidate.slice(0, max - 1)}…`
}

export function buildHomeworkColumns(
  assignments: HomeworkAssignment[],
  groupId: string,
  monthKey?: string,
): HomeworkMatrixColumn[] {
  return assignments
    .filter((hw) => hw.groupId === groupId)
    .filter((hw) => !monthKey || monthKeyFromDate(dueDateKey(hw.dueAt)) === monthKey)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title))
    .map((homework) => {
      const dateKey = dueDateKey(homework.dueAt)
      return {
        homework,
        folder: homeworkAssignFolder(homework),
        dateKey,
        dateLabel: formatColumnDate(homework.dueAt),
        taskLabel: shortTaskLabel(homework.title),
      }
    })
}

export function groupColumnsByDate(columns: HomeworkMatrixColumn[]): HomeworkDateGroup[] {
  const groups: HomeworkDateGroup[] = []
  for (const col of columns) {
    const last = groups[groups.length - 1]
    if (last && last.dateKey === col.dateKey) {
      last.columns.push(col)
    } else {
      groups.push({
        dateKey: col.dateKey,
        dateLabel: col.dateLabel,
        columns: [col],
      })
    }
  }
  return groups
}

/** Average score across visible cells; null when nothing was submitted/scored. */
export function homeworkRowAveragePercent(row: HomeworkMatrixRow): number | null {
  let sum = 0
  let count = 0
  for (const cell of row.cells) {
    if (cell.percent != null) {
      sum += cell.percent
      count += 1
    }
  }
  return count > 0 ? sum / count : null
}

export function buildHomeworkMatrix(
  students: StaffStudent[],
  columns: HomeworkMatrixColumn[],
  submissions: HomeworkSubmission[],
): HomeworkMatrixRow[] {
  const subByKey = new Map<string, HomeworkSubmission>()
  for (const sub of submissions) {
    subByKey.set(`${sub.studentId}:${sub.homeworkId}`, sub)
  }

  return students
    .map((student) => ({
      student,
      cells: columns.map((col) => {
        const submission = subByKey.get(`${student.id}:${col.homework.id}`) ?? null
        const percent = submission ? submissionPercent(submission) : null
        return {
          homework: col.homework,
          submission,
          percent,
        }
      }),
    }))
    .sort((a, b) => {
      const avgA = homeworkRowAveragePercent(a)
      const avgB = homeworkRowAveragePercent(b)
      if (avgA == null && avgB == null) {
        return a.student.name.localeCompare(b.student.name)
      }
      if (avgA == null) return 1
      if (avgB == null) return -1
      if (avgB !== avgA) return avgB - avgA
      return a.student.name.localeCompare(b.student.name)
    })
}

export function matrixGroupStats(
  rows: HomeworkMatrixRow[],
  columns: HomeworkMatrixColumn[],
): {
  homeworkDone: number
  homeworkTotal: number
  averagePercent: number | null
} {
  let percentSum = 0
  let percentCount = 0

  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.percent != null) {
        percentSum += cell.percent
        percentCount += 1
      }
    }
  }

  const homeworkDone = columns.filter((col) =>
    rows.some((row) => {
      const cell = row.cells.find((c) => c.homework.id === col.homework.id)
      return cell?.submission?.status === "submitted" || cell?.submission?.status === "graded"
    }),
  ).length

  return {
    homeworkDone,
    homeworkTotal: columns.length,
    averagePercent: percentCount > 0 ? Math.round(percentSum / percentCount) : null,
  }
}

export type GroupTopicProgress = {
  folder: AssignFolder
  label: string
  averagePercent: number
}

export type GroupLessonProgressPoint = {
  dateKey: string
  dateLabel: string
  averagePercent: number | null
  assignmentCount: number
}

function roundAverage(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

function collectPercentsForColumns(
  rows: HomeworkMatrixRow[],
  homeworkIds: Set<string>,
): number[] {
  const percents: number[] = []
  for (const row of rows) {
    for (const cell of row.cells) {
      if (!homeworkIds.has(cell.homework.id)) continue
      if (cell.percent != null) percents.push(cell.percent)
    }
  }
  return percents
}

/** Share of student-assignment slots without a scored result. */
function computeIncompletePercent(rows: HomeworkMatrixRow[]): number | null {
  let total = 0
  let incomplete = 0
  for (const row of rows) {
    for (const cell of row.cells) {
      total += 1
      if (cell.percent == null) incomplete += 1
    }
  }
  if (total === 0) return null
  return Math.round((incomplete / total) * 100)
}

/** Mean of completed student scores per lesson day, then averaged across days. */
function computeLessonDayAveragePercent(
  rows: HomeworkMatrixRow[],
  dateGroups: HomeworkDateGroup[],
): number | null {
  const dayAverages: number[] = []
  for (const day of dateGroups) {
    const ids = new Set(day.columns.map((col) => col.homework.id))
    const avg = roundAverage(collectPercentsForColumns(rows, ids))
    if (avg != null) dayAverages.push(avg)
  }
  return roundAverage(dayAverages)
}

function computeTopicProgress(
  rows: HomeworkMatrixRow[],
  columns: HomeworkMatrixColumn[],
): GroupTopicProgress[] {
  const byFolder = new Map<AssignFolder, HomeworkMatrixColumn[]>()
  for (const col of columns) {
    const list = byFolder.get(col.folder) ?? []
    list.push(col)
    byFolder.set(col.folder, list)
  }

  const topics: GroupTopicProgress[] = []
  for (const [folder, cols] of byFolder) {
    const ids = new Set(cols.map((col) => col.homework.id))
    const avg = roundAverage(collectPercentsForColumns(rows, ids))
    if (avg == null) continue
    topics.push({
      folder,
      label: subjectFolderMeta[folder]?.label ?? folder,
      averagePercent: avg,
    })
  }
  return topics.sort((a, b) => b.averagePercent - a.averagePercent)
}

function pickTopicExtremes(topics: GroupTopicProgress[]): {
  highestTopic: GroupTopicProgress | null
  lowestTopic: GroupTopicProgress | null
} {
  if (topics.length === 0) {
    return { highestTopic: null, lowestTopic: null }
  }
  const topicsForBest = topics.filter((topic) => topic.folder !== "podcast")
  const highestTopic =
    topicsForBest.length > 0
      ? topicsForBest.reduce((best, topic) =>
          topic.averagePercent >= best.averagePercent ? topic : best,
        )
      : null
  const lowestTopic = topics.reduce((worst, topic) =>
    topic.averagePercent <= worst.averagePercent ? topic : worst,
  )
  return { highestTopic, lowestTopic }
}

/** Average score per lesson day that had homework assigned. */
export function computeGroupLessonProgress(
  groupId: string,
  students: StaffStudent[],
  assignments: HomeworkAssignment[],
  submissions: HomeworkSubmission[],
): GroupLessonProgressPoint[] {
  const members = studentsInGroup(students, groupId)
  const columns = buildHomeworkColumns(assignments, groupId)
  if (columns.length === 0) return []

  const rows = buildHomeworkMatrix(members, columns, submissions)
  const dateGroups = groupColumnsByDate(columns)

  return dateGroups.map((day) => {
    const ids = new Set(day.columns.map((col) => col.homework.id))
    return {
      dateKey: day.dateKey,
      dateLabel: day.dateLabel,
      averagePercent: roundAverage(collectPercentsForColumns(rows, ids)),
      assignmentCount: day.columns.length,
    }
  })
}

/** Per-student homework success % (lesson-day average, same method as group Overall). */
export function computeStudentHomeworkProgressMap(
  groupId: string,
  students: StaffStudent[],
  assignments: HomeworkAssignment[],
  submissions: HomeworkSubmission[],
): Map<string, number | null> {
  const members = studentsInGroup(students, groupId)
  const columns = buildHomeworkColumns(assignments, groupId)
  const rows = buildHomeworkMatrix(members, columns, submissions)
  const dateGroups = groupColumnsByDate(columns)

  const map = new Map<string, number | null>()
  for (const row of rows) {
    const dayAverages: number[] = []
    for (const day of dateGroups) {
      const ids = new Set(day.columns.map((col) => col.homework.id))
      const percents: number[] = []
      for (const cell of row.cells) {
        if (!ids.has(cell.homework.id)) continue
        if (cell.percent != null) percents.push(cell.percent)
      }
      const avg = roundAverage(percents)
      if (avg != null) dayAverages.push(avg)
    }
    map.set(row.student.id, roundAverage(dayAverages))
  }
  return map
}

/** Overall homework progress for a group (all assignments, not month-filtered). */
export function computeGroupProgress(
  groupId: string,
  students: StaffStudent[],
  assignments: HomeworkAssignment[],
  submissions: HomeworkSubmission[],
): {
  studentCount: number
  homeworkDone: number
  homeworkTotal: number
  averagePercent: number | null
  incompletePercent: number | null
  highestTopic: GroupTopicProgress | null
  lowestTopic: GroupTopicProgress | null
} {
  const members = studentsInGroup(students, groupId)
  const columns = buildHomeworkColumns(assignments, groupId)
  const rows = buildHomeworkMatrix(members, columns, submissions)
  const stats = matrixGroupStats(rows, columns)
  const dateGroups = groupColumnsByDate(columns)
  const topics = computeTopicProgress(rows, columns)
  const { highestTopic, lowestTopic } = pickTopicExtremes(topics)

  return {
    studentCount: members.length,
    homeworkDone: stats.homeworkDone,
    homeworkTotal: stats.homeworkTotal,
    averagePercent: computeLessonDayAveragePercent(rows, dateGroups),
    incompletePercent: computeIncompletePercent(rows),
    highestTopic,
    lowestTopic,
  }
}

export function cellPalette(percent: number | null, status?: HomeworkSubmission["status"]) {
  if (percent != null) {
    const c = percentColors(percent)
    return { ...c, border: c.bg }
  }
  if (status === "in_progress" || status === "paused") {
    return { bg: "#FFCC00", text: "#4A3800", border: "#E6B800" }
  }
  return { bg: "#E8ECF0", text: "#8E99A8", border: "#D1D9E0" }
}
