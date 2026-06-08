import React, { useCallback, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useFocusEffect } from "expo-router"
import { exercisesApi, homeworkApi, controlWorkApi } from "../lib/api"
import {
  getHomeworkListSnapshot,
  setHomeworkListSnapshot,
} from "../lib/homework-list-cache"
import { HomeworkSection, type HomeworkItem } from "./HomeworkSection"
import { HomeworkListSkeleton } from "./skeletons/Layouts"
import { parseVocabHomeworkSlug } from "../types/vocabulary"
import type { GrammarExercise } from "../types/grammar"
import type { StudentHomeworkEntry, StudentControlWorkEntry } from "../types/domain"
import { colors, spacing } from "../theme/tokens"

type Status = "pending" | "in_progress" | "completed"

const STATUS_ORDER: Record<Status, number> = {
  pending: 0,
  in_progress: 1,
  completed: 2,
}

function mapHomeworkItems(
  entries: StudentHomeworkEntry[],
  exList: GrammarExercise[],
): HomeworkItem[] {
  const exerciseBySlug = new Map(exList.map((e) => [e.slug, e]))

  const mapped: HomeworkItem[] = entries.map(({ homework, submission }) => {
    const failedCheating =
      submission.integrityStatus === "cheating_detected" ||
      submission.attempt?.failedDueToCheating

    const status: Status =
      failedCheating || submission.status === "submitted" || submission.status === "graded"
        ? "completed"
        : submission.status === "in_progress" || submission.status === "paused"
          ? "in_progress"
          : "pending"

    let route: string | undefined
    if (!failedCheating) {
      if (homework.subject === "grammar" && homework.exerciseSlug) {
        const ex = exerciseBySlug.get(homework.exerciseSlug)
        if (ex) route = `/homework/exercise/${ex.topic}/${ex.slug}?hw=${homework.id}`
      } else if (homework.subject === "vocabulary") {
        const deckSlug = parseVocabHomeworkSlug(homework.exerciseSlug)
        if (deckSlug) route = `/homework/vocabulary/${deckSlug}?hw=${homework.id}`
      }
    }

    return {
      id: homework.id,
      subject: homework.subject,
      title: homework.title,
      description: homework.description,
      dueAt: homework.dueAt,
      createdAt: homework.createdAt,
      status,
      timeLimitMinutes: homework.timeLimitMinutes,
      completedAt: submission.submittedAt ?? undefined,
      integrityStatus: submission.integrityStatus,
      failedCheating,
      paused: submission.status === "paused",
      pauseUsed: submission.pauseUsed,
      route,
      correctCount: submission.attempt?.correctCount,
      totalQuestions: submission.attempt?.totalQuestions,
    }
  })

  return mapped
}

function mapControlWorkItems(entries: StudentControlWorkEntry[]): HomeworkItem[] {
  return entries.map(({ controlWork: cw, submission }) => {
    const failedCheating = submission.integrityStatus === "cheating_detected"
    const status: Status =
      failedCheating || submission.status === "submitted" || submission.status === "graded"
        ? "completed"
        : submission.status === "in_progress" || submission.status === "paused"
          ? "in_progress"
          : "pending"

    const sectionDone = submission.stepResults?.filter((s) => s.status === "completed").length ?? 0

    return {
      id: cw.id,
      subject: "grammar",
      title: cw.title,
      description: cw.description || `${cw.steps.length} sections`,
      dueAt: cw.dueAt,
      createdAt: cw.createdAt,
      status,
      timeLimitMinutes: cw.timeLimitMinutes,
      completedAt: submission.submittedAt ?? undefined,
      integrityStatus: submission.integrityStatus,
      failedCheating,
      paused: submission.status === "paused",
      pauseUsed: submission.pauseUsed,
      route: failedCheating ? undefined : `/homework/control/${cw.id}`,
      kind: "control_work",
      sectionDone,
      sectionTotal: cw.steps.length,
      correctCount: submission.stepResults?.reduce(
        (acc, s) => acc + (s.attempt?.correctCount ?? 0),
        0,
      ),
      totalQuestions: submission.stepResults?.reduce(
        (acc, s) => acc + (s.attempt?.totalQuestions ?? 0),
        0,
      ),
    }
  })
}

function mergeHomeworkItems(
  homeworkEntries: StudentHomeworkEntry[],
  controlEntries: StudentControlWorkEntry[],
  exList: GrammarExercise[],
): HomeworkItem[] {
  const mapped = [
    ...mapHomeworkItems(homeworkEntries, exList),
    ...mapControlWorkItems(controlEntries),
  ]
  mapped.sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (s !== 0) return s
    const byAssigned = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (byAssigned !== 0) return byAssigned
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  })
  return mapped
}

export function StudentHomeworkList({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<HomeworkItem[] | null>(() =>
    getHomeworkListSnapshot(studentId),
  )
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedRef = useRef(items !== null)

  const load = useCallback(
    async (opts?: { force?: boolean }) => {
      try {
        const [entries, controlEntries, exList] = await Promise.all([
          homeworkApi.mine(opts),
          controlWorkApi.mine(opts),
          exercisesApi.list(undefined, opts),
        ])

        const mapped = mergeHomeworkItems(entries, controlEntries, exList)
        setHomeworkListSnapshot(studentId, mapped)
        setItems(mapped)
        hasLoadedRef.current = true
      } catch {
        if (!hasLoadedRef.current) setItems([])
      }
    },
    [studentId],
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load({ force: true })
    setRefreshing(false)
  }, [load])

  return (
    <View style={styles.container}>
      {items === null ? (
        <View style={styles.skeletonWrap}>
          <HomeworkListSkeleton />
        </View>
      ) : (
        <HomeworkSection items={items} refreshing={refreshing} onRefresh={onRefresh} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skeletonWrap: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
})

