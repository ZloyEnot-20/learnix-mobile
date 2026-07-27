import { groupsApi, lessonsApi } from "./api"
import type { Group, LessonSession } from "../types/staff"
import {
  attachGroupMeta,
  currentMonthKey,
  nextMonthKey,
  type LessonWithGroup,
} from "./teacher-lessons"

export async function fetchTeacherLessons(
  groups?: Group[],
  opts?: { force?: boolean },
): Promise<{ groups: Group[]; lessons: LessonWithGroup[] }> {
  const groupList = groups ?? (await groupsApi.list(opts))
  const month = currentMonthKey()
  const next = nextMonthKey()

  const lessonBatches = await Promise.all(
    groupList.flatMap((group) => [
      lessonsApi.list({ groupId: group.id, month }, opts),
      lessonsApi.list({ groupId: group.id, month: next }, opts),
    ]),
  )

  const byId = new Map<string, LessonSession>()
  for (const batch of lessonBatches) {
    for (const lesson of batch) {
      byId.set(lesson.id, lesson)
    }
  }

  return {
    groups: groupList,
    lessons: attachGroupMeta([...byId.values()], groupList),
  }
}
