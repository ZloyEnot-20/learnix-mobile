import { useCallback, useMemo, useState } from "react"
import { groupsApi, homeworkApi, studentsApi } from "../lib/api"
import {
  buildTeacherGroupInfoList,
  enrichGroupLessonProgress,
} from "../lib/teacher-group-info"
import type { TeacherGroupInfo } from "../components/teacher/TeacherGroupInfoModal"
import type { HomeworkAssignment, HomeworkSubmission } from "../types/domain"
import type { Group, StaffStudent } from "../types/staff"

type ProgressCache = {
  groups: Group[]
  students: StaffStudent[]
  assignments: HomeworkAssignment[]
  submissions: HomeworkSubmission[]
  loadedAt: number
}

const CACHE_TTL_MS = 60_000
let progressCache: ProgressCache | null = null

function isCacheFresh() {
  return progressCache != null && Date.now() - progressCache.loadedAt < CACHE_TTL_MS
}

export function useAdminGroupProgress(groupIds?: string[]) {
  const [loading, setLoading] = useState(!isCacheFresh())
  const [cache, setCache] = useState<ProgressCache | null>(progressCache)

  const load = useCallback(async (force = false) => {
    if (!force && isCacheFresh() && progressCache) {
      setCache(progressCache)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [groupRows, studentRows, check] = await Promise.all([
        groupsApi.list({ force }),
        studentsApi.list({ force }),
        homeworkApi.check({ force }).catch(() => ({ assignments: [], records: [] })),
      ])
      progressCache = {
        groups: groupRows,
        students: studentRows,
        assignments: check.assignments,
        submissions: check.records,
        loadedAt: Date.now(),
      }
      setCache(progressCache)
    } finally {
      setLoading(false)
    }
  }, [])

  const groupCards = useMemo<TeacherGroupInfo[]>(() => {
    if (!cache) return []
    return buildTeacherGroupInfoList(
      cache.groups,
      cache.students,
      cache.assignments,
      cache.submissions,
      groupIds,
    )
  }, [cache, groupIds])

  const enrichGroup = useCallback(
    (group: TeacherGroupInfo): TeacherGroupInfo => {
      if (!cache) return group
      return enrichGroupLessonProgress(
        group,
        cache.students,
        cache.assignments,
        cache.submissions,
      )
    },
    [cache],
  )

  return {
    loading,
    groupCards,
    load,
    enrichGroup,
  }
}
