import React, { useCallback, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useFocusEffect } from "expo-router"
import { homeworkApi, controlWorkApi } from "../lib/api"
import { runPerfTrace } from "../lib/perf"
import {
  getHomeworkListSnapshot,
  loadHomeworkListCache,
  setHomeworkListSnapshot,
} from "../lib/homework-list-cache"
import { HomeworkSection, type HomeworkItem } from "./HomeworkSection"
import { HomeworkListSkeleton } from "./skeletons/Layouts"
import { parseVocabHomeworkSlug } from "../types/vocabulary"
import { parsePodcastHomeworkSlug } from "../types/podcast"
import { parseReadingHomeworkSlug } from "../types/reading"
import { parseListeningHomeworkSlug } from "../types/listening"
import type {
  StudentControlWorkEntry,
  StudentHomeworkSummaryEntry,
} from "../types/domain"
import { colors, spacing } from "../theme/tokens"

type Status = "pending" | "in_progress" | "completed"

const STATUS_ORDER: Record<Status, number> = {
  pending: 0,
  in_progress: 1,
  completed: 2,
}

function mapHomeworkItems(entries: StudentHomeworkSummaryEntry[]): HomeworkItem[] {
  return entries.map(({ homework, submission, exerciseTopic, reviewedWordLabels }) => {
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
    let kind: HomeworkItem["kind"] = "homework"
    if (!failedCheating) {
      if (
        (homework.subject === "grammar" || homework.subject === "speaking") &&
        homework.exerciseSlug &&
        exerciseTopic
      ) {
        route = `/homework/exercise/${exerciseTopic}/${homework.exerciseSlug}?hw=${homework.id}`
      } else if (homework.subject === "vocabulary") {
        const deckSlug = parseVocabHomeworkSlug(homework.exerciseSlug)
        if (deckSlug) route = `/homework/vocabulary/${deckSlug}?hw=${homework.id}`
      } else if (homework.subject === "listening") {
        const ieltsSlug = parseListeningHomeworkSlug(homework.exerciseSlug)
        if (ieltsSlug) {
          route = `/homework/listening/${ieltsSlug}?hw=${homework.id}`
          kind = "ielts_listening"
        } else {
          const podcastSlug = parsePodcastHomeworkSlug(homework.exerciseSlug)
          if (podcastSlug) {
            route = `/homework/podcast/${podcastSlug}?hw=${homework.id}`
          }
          kind = "podcast"
        }
      } else if (homework.subject === "reading") {
        const readingSlug = parseReadingHomeworkSlug(homework.exerciseSlug)
        if (readingSlug) route = `/homework/reading/${readingSlug}?hw=${homework.id}`
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
      kind: kind === "podcast" ? "podcast" : kind === "ielts_listening" ? "ielts_listening" : undefined,
      correctCount: submission.attempt?.correctCount,
      totalQuestions: submission.attempt?.totalQuestions,
      listeningStats: submission.attempt?.listeningStats,
      reviewedWords: reviewedWordLabels,
    }
  })
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
  homeworkEntries: StudentHomeworkSummaryEntry[],
  controlEntries: StudentControlWorkEntry[],
): HomeworkItem[] {
  const mapped = [...mapHomeworkItems(homeworkEntries), ...mapControlWorkItems(controlEntries)]
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
  const [animateItemIds, setAnimateItemIds] = useState<Set<string>>(() => new Set())
  const hasLoadedRef = useRef(items !== null)
  const itemsRef = useRef(items)
  const loadGenerationRef = useRef(0)
  itemsRef.current = items

  const publishItems = useCallback(
    (mapped: HomeworkItem[], opts?: { background?: boolean }) => {
      if (opts?.background && itemsRef.current) {
        const prevIds = new Set(itemsRef.current.map((i) => i.id))
        const newIds = mapped.filter((i) => !prevIds.has(i.id)).map((i) => i.id)
        if (newIds.length > 0) {
          setAnimateItemIds(new Set(newIds))
        }
      }

      setHomeworkListSnapshot(studentId, mapped)
      setItems(mapped)
      hasLoadedRef.current = true
    },
    [studentId],
  )

  const load = useCallback(
    async (opts?: { force?: boolean; background?: boolean }) => {
      const generation = ++loadGenerationRef.current
      const fetchOpts = opts?.force ? { force: true as const } : undefined

      try {
        await runPerfTrace("load_homework", async () => {
          const [entries, controlEntries] = await Promise.all([
            homeworkApi.mineSummary(fetchOpts),
            controlWorkApi.mineSummary(fetchOpts),
          ])

          if (generation !== loadGenerationRef.current) return

          const mapped = mergeHomeworkItems(entries, controlEntries)
          publishItems(mapped, { background: opts?.background })
        })
      } catch {
        if (generation !== loadGenerationRef.current) return
        if (!hasLoadedRef.current) setItems([])
      }
    },
    [publishItems],
  )

  useFocusEffect(
    useCallback(() => {
      let cancelled = false

      void (async () => {
        if (itemsRef.current === null) {
          const cached = await loadHomeworkListCache(studentId)
          if (cancelled) return
          if (cached) {
            setItems(cached)
            hasLoadedRef.current = true
          }
        }

        const hasVisibleItems = itemsRef.current !== null
        await load({ background: hasVisibleItems })
      })()

      return () => {
        cancelled = true
      }
    }, [studentId, load]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setAnimateItemIds(new Set())
    await load({ force: true, background: true })
    setRefreshing(false)
  }, [load])

  return (
    <View style={styles.container}>
      {items === null ? (
        <View style={styles.skeletonWrap}>
          <HomeworkListSkeleton />
        </View>
      ) : (
        <HomeworkSection
          items={items}
          refreshing={refreshing}
          onRefresh={onRefresh}
          animateItemIds={animateItemIds}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skeletonWrap: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
})
