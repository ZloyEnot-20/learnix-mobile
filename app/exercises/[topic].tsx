import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { BackButton } from "../../src/components/ui/BackButton"
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi } from "../../src/lib/api"
import { getLearningProgress } from "../../src/lib/learned-vocabulary"
import { recordGameTopic } from "../../src/lib/record-activity"
import { ExerciseListSkeleton } from "../../src/components/skeletons/Layouts"
import type { GrammarExercise } from "../../src/types/grammar"
import { Ionicons } from "@expo/vector-icons"
import { colors } from "../../src/theme/colors"

export default function TopicExercisesScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [exercises, setExercises] = useState<GrammarExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [passedSlugs, setPassedSlugs] = useState<Set<string>>(new Set())

  const loadProgress = useCallback(async () => {
    if (!user?.id || !topic) return
    const progress = await getLearningProgress(user.id)
    const slugs = new Set<string>()
    for (const result of progress.gameResults) {
      if (result.topic !== topic) continue
      const passed =
        result.passed ??
        result.correctCount >=
          (exercises.find((ex) => ex.slug === result.slug)?.passingScore ??
            Math.ceil(result.totalQuestions * 0.7))
      if (passed) slugs.add(result.slug)
    }
    setPassedSlugs(slugs)
  }, [user?.id, topic, exercises])

  useEffect(() => {
    if (!topic) return
    Promise.all([exercisesApi.list(topic), exercisesApi.topics()])
      .then(([list, metas]) => {
        setExercises(list)
        if (user?.type === "student" && user.id) {
          const meta = metas.find((m) => m.topic === topic)
          recordGameTopic(user.id, topic, meta?.title ?? topic, meta?.category ?? "grammar")
        }
      })
      .catch(() => setExercises([]))
      .finally(() => setLoading(false))
  }, [topic, user?.id, user?.type])

  useEffect(() => {
    if (!loading) void loadProgress()
  }, [loading, loadProgress])

  useFocusEffect(
    useCallback(() => {
      void loadProgress()
    }, [loadProgress]),
  )

  const passedCount = useMemo(
    () => exercises.filter((ex) => passedSlugs.has(ex.slug)).length,
    [exercises, passedSlugs],
  )

  return (
    <>
      <Stack.Screen options={{ title: topic ?? "Exercises" }} />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.backWrap}>
          <BackButton onPress={() => router.back()} />
        </View>

        {loading ? (
          <ExerciseListSkeleton />
        ) : exercises.length === 0 ? (
          <Text style={styles.empty}>No exercises in this topic yet.</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {exercises.length > 0 ? (
              <Text style={styles.progressSummary}>
                {passedCount}/{exercises.length} rounds passed
              </Text>
            ) : null}
            {exercises.map((ex) => {
              const passed = passedSlugs.has(ex.slug)
              return (
                <Pressable
                  key={ex.slug}
                  style={[styles.card, passed && styles.cardPassed]}
                  onPress={() =>
                    router.push(`/exercise/${ex.topic}/${ex.slug}` as never)
                  }
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{ex.title}</Text>
                    {passed ? (
                      <View style={styles.passedBadge}>
                        <Ionicons name="checkmark" size={12} color={colors.success} />
                        <Text style={styles.passedText}>Passed</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardMeta}>
                    {ex.type.replace(/-/g, " ")} · {ex.totalQuestions} questions ·{" "}
                    {ex.estimatedTime} min
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {ex.description}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  progressSummary: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  cardPassed: {
    borderColor: colors.success + "55",
    backgroundColor: colors.successBg,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  passedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  passedText: { fontSize: 11, fontWeight: "700", color: colors.success },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: "capitalize",
  },
  cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
})
