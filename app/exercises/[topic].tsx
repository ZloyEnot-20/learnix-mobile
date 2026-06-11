import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "../../src/context/AuthContext"
import { exercisesApi } from "../../src/lib/api"
import { getLearningProgress } from "../../src/lib/learned-vocabulary"
import { recordGameTopic } from "../../src/lib/record-activity"
import { ExerciseListSkeleton } from "../../src/components/skeletons/Layouts"
import { HomeworkFooterButton } from "../../src/components/homework/HomeworkExerciseLayout"
import type { GrammarExercise } from "../../src/types/grammar"
import { Ionicons } from "@expo/vector-icons"
import { colors } from "../../src/theme/colors"
import { radius, spacing } from "../../src/theme/tokens"

export default function TopicExercisesScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
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
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.body}>
          {loading ? (
            <ExerciseListSkeleton />
          ) : exercises.length === 0 ? (
            <Text style={styles.empty}>No exercises in this topic yet.</Text>
          ) : (
            <>
              <View style={styles.listHeader}>
                <Text style={styles.progressSummary}>
                  {passedCount}/{exercises.length} rounds passed
                </Text>
              </View>
              <ScrollView contentContainerStyle={styles.list}>
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
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {ex.title}
                      </Text>
                      {passed ? (
                        <View style={styles.passedBadge}>
                          <Ionicons name="checkmark" size={12} color={colors.success} />
                          <Text style={styles.passedText}>Passed</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.typeLabel}>{ex.type.replace(/-/g, " ")}</Text>
                      <View style={styles.metaBadges}>
                        <View style={[styles.metaBadge, styles.questionsBadge]}>
                          <Ionicons
                            name="help-circle-outline"
                            size={11}
                            color={colors.primaryDark}
                          />
                          <Text style={[styles.metaBadgeText, styles.questionsBadgeText]}>
                            {ex.totalQuestions} questions
                          </Text>
                        </View>
                        <View style={[styles.metaBadge, styles.timeBadge]}>
                          <Ionicons name="time-outline" size={11} color="#B45309" />
                          <Text style={[styles.metaBadgeText, styles.timeBadgeText]}>
                            {ex.estimatedTime} min
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {ex.description}
                    </Text>
                  </Pressable>
                )
              })}
              </ScrollView>
            </>
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <HomeworkFooterButton label="Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
  listHeader: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.screen,
    gap: 8,
    paddingBottom: spacing.md,
  },
  progressSummary: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
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
    gap: 8,
  },
  passedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
    backgroundColor: colors.successBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  passedText: { fontSize: 11, fontWeight: "700", color: colors.success },
  cardTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  typeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  metaBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  questionsBadge: {
    backgroundColor: colors.primaryLight,
  },
  questionsBadgeText: {
    color: colors.primaryDark,
  },
  timeBadge: {
    backgroundColor: colors.warningBg,
  },
  timeBadgeText: {
    color: "#B45309",
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
})
