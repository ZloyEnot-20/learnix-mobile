import React, { useCallback, useState } from "react"
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../../../src/context/AuthContext"
import { controlWorkApi } from "../../../../src/lib/api"
import { BackButton } from "../../../../src/components/ui/BackButton"
import type {
  ControlWork,
  ControlWorkStep,
  ControlWorkSubmission,
  ControlWorkSubject,
} from "../../../../src/types/domain"
import { colors, radius, spacing, typography } from "../../../../src/theme/tokens"
import { formatDue } from "../../../../src/lib/utils"

const SUBJECT_ICONS: Record<ControlWorkSubject, keyof typeof Ionicons.glyphMap> = {
  vocabulary: "library-outline",
  grammar: "school-outline",
  reading: "book-outline",
  listening: "headset-outline",
  writing: "create-outline",
}

function stepRoute(cwId: string, step: ControlWorkStep, stepIndex: number): string | null {
  if (step.subject === "grammar" && step.exerciseSlug && step.topic) {
    return `/homework/control/${cwId}/grammar/${step.topic}/${step.exerciseSlug}?step=${stepIndex}`
  }
  if (step.subject === "vocabulary" && step.deckSlug) {
    return `/homework/control/${cwId}/vocabulary/${step.deckSlug}?step=${stepIndex}`
  }
  return null
}

export default function ControlWorkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [cw, setCw] = useState<ControlWork | null>(null)
  const [sub, setSub] = useState<ControlWorkSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (force?: boolean) => {
    if (!id) return
    try {
      const [work, entries] = await Promise.all([
        controlWorkApi.get(id, { force }),
        controlWorkApi.mine({ force }),
      ])
      const entry = entries.find((e) => e.controlWork.id === id)
      setCw(work)
      setSub(entry?.submission ?? null)
      if (entry && user?.role === "student" && entry.submission.status === "pending") {
        const started = await controlWorkApi.start(id, { force })
        setSub(started)
      }
    } catch {
      setCw(null)
    } finally {
      setLoading(false)
    }
  }, [id, user?.role])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load(true)
    setRefreshing(false)
  }

  const completed =
    sub?.status === "submitted" ||
    sub?.status === "graded" ||
    sub?.integrityStatus === "cheating_detected"
  const currentStep = sub?.currentStep ?? 0
  const totalSteps = cw?.steps.length ?? 0
  const doneCount = sub?.stepResults?.filter((s) => s.status === "completed").length ?? 0

  const onOpenStep = (stepIndex: number) => {
    if (!cw || !sub || completed) return
    if (stepIndex !== currentStep) return
    const step = cw.steps[stepIndex]
    if (!step) return

    const route = stepRoute(id!, step, stepIndex)
    if (route) {
      router.push(route as never)
      return
    }

    if (step.testId) {
      void controlWorkApi
        .completeStep(id!, stepIndex, { totalQuestions: 0, correctCount: 0, mistakes: [] })
        .then(() => load(true))
        .catch(() => {})
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <BackButton />
          <View style={styles.topBarText}>
            <Text style={styles.badge}>Unit test</Text>
            <Text style={styles.title} numberOfLines={2}>
              {cw?.title ?? "Control work"}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <Text style={styles.muted}>Loading…</Text>
          </View>
        ) : !cw ? (
          <View style={styles.center}>
            <Text style={styles.error}>Control work not found</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {doneCount}/{totalSteps} sections · Due {formatDue(cw.dueAt).label}
              </Text>
              {cw.timeLimitMinutes ? (
                <Text style={styles.summaryText}>{cw.timeLimitMinutes} min limit</Text>
              ) : null}
            </View>

            {completed && sub?.status === "submitted" && typeof sub.score === "number" ? (
              <View style={styles.doneCard}>
                <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                <Text style={styles.doneTitle}>Control work complete</Text>
                <Text style={styles.doneScore}>Band {sub.score.toFixed(1)}</Text>
              </View>
            ) : null}

            <View style={styles.steps}>
              {cw.steps.map((step, index) => {
                const result = sub?.stepResults?.[index]
                const isDone = result?.status === "completed"
                const isCurrent = !completed && index === currentStep
                const icon = SUBJECT_ICONS[step.subject]
                const canOpen = isCurrent && !isDone

                return (
                  <Pressable
                    key={`${step.subject}-${index}`}
                    disabled={!canOpen}
                    onPress={() => onOpenStep(index)}
                    style={[
                      styles.stepCard,
                      isDone && styles.stepDone,
                      isCurrent && styles.stepCurrent,
                    ]}
                  >
                    <View style={styles.stepLeft}>
                      <View style={[styles.stepIcon, isDone && styles.stepIconDone]}>
                        <Ionicons
                          name={isDone ? "checkmark" : icon}
                          size={18}
                          color={isDone ? colors.success : colors.primaryDark}
                        />
                      </View>
                      <View style={styles.stepBody}>
                        <Text style={styles.stepSubject}>
                          {step.subject.charAt(0).toUpperCase() + step.subject.slice(1)}
                        </Text>
                        <Text style={styles.stepTitle} numberOfLines={2}>
                          {step.title}
                        </Text>
                        {isDone && result?.attempt ? (
                          <Text style={styles.stepScore}>
                            {result.attempt.correctCount}/{result.attempt.totalQuestions} correct
                          </Text>
                        ) : isCurrent ? (
                          <Text style={styles.stepHint}>Tap to start</Text>
                        ) : !isDone ? (
                          <Text style={styles.stepHint}>Locked</Text>
                        ) : null}
                      </View>
                    </View>
                    {canOpen ? (
                      <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />
                    ) : null}
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  topBarText: { flex: 1, gap: 4 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  title: { ...typography.h2, color: colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: colors.textMuted },
  error: { color: colors.error, fontWeight: "600" },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  summary: { gap: 4 },
  summaryText: { fontSize: 13, color: colors.textMuted },
  doneCard: {
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  doneTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  doneScore: { fontSize: 15, color: colors.success, fontWeight: "600" },
  steps: { gap: spacing.sm },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepDone: { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  stepCurrent: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  stepLeft: { flex: 1, flexDirection: "row", gap: spacing.md, alignItems: "center" },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconDone: { backgroundColor: colors.successBg },
  stepBody: { flex: 1, gap: 2 },
  stepSubject: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  stepTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  stepScore: { fontSize: 12, color: colors.success, fontWeight: "600" },
  stepHint: { fontSize: 12, color: colors.primaryDark },
})
