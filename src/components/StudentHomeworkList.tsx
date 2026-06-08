import React, { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet } from "react-native"
import { exercisesApi, homeworkApi } from "../lib/api"
import { HomeworkSection, type HomeworkItem } from "./HomeworkSection"
import { parseVocabHomeworkSlug } from "../types/vocabulary"
import type { GrammarExercise } from "../types/grammar"
import { colors } from "../theme/colors"

type Status = "pending" | "in_progress" | "completed"

const STATUS_ORDER: Record<Status, number> = {
  pending: 0,
  in_progress: 1,
  completed: 2,
}

export function StudentHomeworkList({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<HomeworkItem[] | null>(null)
  const [exercises, setExercises] = useState<GrammarExercise[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [entries, exList] = await Promise.all([
        homeworkApi.mine(),
        exercisesApi.list(),
      ])
      setExercises(exList)

      const exerciseBySlug = new Map(exList.map((e) => [e.slug, e]))

      const mapped: HomeworkItem[] = entries.map(({ homework, submission }) => {
        const status: Status =
          submission.status === "submitted" || submission.status === "graded"
            ? "completed"
            : submission.status === "in_progress"
              ? "in_progress"
              : "pending"

        let route: string | undefined
        if (homework.subject === "grammar" && homework.exerciseSlug) {
          const ex = exerciseBySlug.get(homework.exerciseSlug)
          if (ex) route = `/exercise/${ex.topic}/${ex.slug}?hw=${homework.id}`
        } else if (homework.subject === "vocabulary") {
          const deckSlug = parseVocabHomeworkSlug(homework.exerciseSlug)
          if (deckSlug) route = `/vocabulary/${deckSlug}?hw=${homework.id}`
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
          route,
        }
      })

      mapped.sort((a, b) => {
        const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (s !== 0) return s
        const byAssigned = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        if (byAssigned !== 0) return byAssigned
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      })

      setItems(mapped)
    } catch {
      setItems([])
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {items === null ? (
        <ActivityIndicator style={{ marginVertical: 24 }} />
      ) : (
        <HomeworkSection items={items} />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
})
