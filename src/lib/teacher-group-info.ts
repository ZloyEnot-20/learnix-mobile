import { GROUP_CARD_PALETTES } from "../components/teacher/TeacherHomeGroupCards"
import type { TeacherGroupInfo } from "../components/teacher/TeacherGroupInfoModal"
import type { HomeworkAssignment, HomeworkSubmission } from "../types/domain"
import type { Group, StaffStudent } from "../types/staff"
import { computeGroupLessonProgress, computeGroupProgress } from "./teacher-homework-matrix"
import { formatGroupSchedule } from "./teacher-lessons"

export function buildTeacherGroupInfoList(
  groups: Group[],
  students: StaffStudent[],
  assignments: HomeworkAssignment[],
  submissions: HomeworkSubmission[],
  groupIds?: string[],
  options?: { includeLessonProgress?: boolean },
): TeacherGroupInfo[] {
  const includeLessonProgress = options?.includeLessonProgress ?? false
  const allowed = groupIds ? new Set(groupIds) : null
  const filtered = allowed ? groups.filter((group) => allowed.has(group.id)) : groups

  return filtered
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group, index) => {
      const progress = computeGroupProgress(group.id, students, assignments, submissions)
      const lessonProgress = includeLessonProgress
        ? computeGroupLessonProgress(group.id, students, assignments, submissions)
        : []
      const palette = GROUP_CARD_PALETTES[index % GROUP_CARD_PALETTES.length]

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        schedule: formatGroupSchedule(group),
        teacherName: group.teacherName ?? null,
        studentCount: progress.studentCount,
        averagePercent: progress.averagePercent,
        incompletePercent: progress.incompletePercent,
        highestTopic: progress.highestTopic,
        lowestTopic: progress.lowestTopic,
        lessonProgress,
        accentBg: palette.bg,
        accentColor: palette.color,
      }
    })
}

export function enrichGroupLessonProgress(
  group: TeacherGroupInfo,
  students: StaffStudent[],
  assignments: HomeworkAssignment[],
  submissions: HomeworkSubmission[],
): TeacherGroupInfo {
  return {
    ...group,
    lessonProgress: computeGroupLessonProgress(group.id, students, assignments, submissions),
  }
}
