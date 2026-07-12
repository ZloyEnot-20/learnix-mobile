import React, { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect } from "expo-router"
import { useAuth } from "../../src/context/AuthContext"
import { isGuestUser } from "../../src/lib/guest"
import { getUserFacingErrorMessage } from "../../src/lib/api-client"
import { liveLessonsApi } from "../../src/lib/live-lesson-api"
import { flattenUnitToSteps } from "../../src/lib/books/lesson-flow"
import type { LessonStep, LiveLessonState } from "../../src/lib/books/types"
import { useLiveLessonSocket } from "../../src/hooks/useLiveLessonSocket"
import { LiveExerciseView } from "../../src/components/live-lesson/LiveExerciseView"
import { LiveLessonRoomSkeleton } from "../../src/components/live-lesson/LiveLessonSkeletons"
import { colors, radius, spacing, typography } from "../../src/theme/tokens"

/**
 * Student live lesson room.
 * Joins via group membership (User.groupId) — no lesson code.
 */
export default function LiveLessonScreen() {
  const { user, isLoading: authLoading } = useAuth()

  const [live, setLive] = useState<LiveLessonState | null>(null)
  const [steps, setSteps] = useState<LessonStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [localProgress, setLocalProgress] = useState(0)
  const [idle, setIdle] = useState(false)

  const joinActive = useCallback(async () => {
    if (!user || isGuestUser(user) || user.type !== "student") {
      setLoading(false)
      setError("Sign in as a student to join a live lesson")
      return
    }
    setLoading(true)
    setError(null)
    setIdle(false)
    try {
      const active = await liveLessonsApi.getActive()
      if (!active) {
        setLive(null)
        setIdle(true)
        return
      }
      const joined = await liveLessonsApi.joinActive()
      setLive(joined)
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not join lesson"))
      setLive(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      void joinActive()
    }, [joinActive]),
  )

  useEffect(() => {
    if (!live?.bookId || live.currentUnit == null) {
      setSteps([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { unit, answer_key } = await liveLessonsApi.getUnit(live.bookId, live.currentUnit!)
        const flow = flattenUnitToSteps(unit, answer_key ?? undefined)
        if (!cancelled) setSteps(flow)
      } catch (e) {
        if (!cancelled) setError(getUserFacingErrorMessage(e, "Failed to load exercise"))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [live?.bookId, live?.currentUnit])

  const onState = useCallback((state: LiveLessonState) => {
    setLive(state)
    setIdle(false)
    setLocalProgress(0)
    if (state.lessonStatus === "finished") {
      setIdle(true)
    }
  }, [])

  const { connected, emit } = useLiveLessonSocket(live?.id ?? null, {
    onState,
    onError: (msg) => setError(msg),
  })

  useEffect(() => {
    if (!live?.id || !connected) return
    const tick = () => emit("lesson:heartbeat", { sessionId: live.id })
    tick()
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [live?.id, connected, emit])

  const currentStep = steps.find((s) => s.exerciseId === live?.currentExercise) ?? null
  const me = live?.students?.find((s) => s.studentId === user?.id)
  const open = Boolean(live?.openForStudents && live.lessonStatus === "active")

  const markWorking = async (progress: number) => {
    if (!live) return
    setLocalProgress(progress)
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        progress,
        status: progress >= 100 ? "done" : "working",
        score: progress >= 100 ? Math.round(progress) : null,
      }
      if (connected) {
        emit("lesson:progress", { sessionId: live.id, ...body })
      } else {
        const next = await liveLessonsApi.progress(live.id, body)
        setLive(next)
      }
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Failed to update progress"))
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <LiveLessonRoomSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Live lesson</Text>
          <Text style={styles.headerSub}>
            {live
              ? `${connected ? "Connected" : "Connecting…"} · ${live.lessonStatus}`
              : "Your group"}
          </Text>
        </View>
        <Pressable onPress={() => void joinActive()} hitSlop={12}>
          <Ionicons name="refresh" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {idle || !live ? (
        <View style={styles.waiting}>
          <View style={styles.idleIcon}>
            <Ionicons name="school-outline" size={32} color={colors.primaryDark} />
          </View>
          <Text style={styles.waitingTitle}>No live lesson yet</Text>
          <Text style={styles.waitingSub}>
            When your teacher starts a lesson for your group, open this screen to join
            automatically.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => void joinActive()}>
            <Text style={styles.primaryBtnText}>Check again</Text>
          </Pressable>
        </View>
      ) : !open ? (
        <View style={styles.waiting}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.waitingTitle}>Waiting for teacher</Text>
          <Text style={styles.waitingSub}>
            You are in the lesson. Stay here — the teacher will open an exercise soon.
          </Text>
          {me ? (
            <Text style={styles.waitingMeta}>
              You are {me.status} · {me.progress}%
            </Text>
          ) : null}
          {live.currentExercise ? (
            <Text style={styles.waitingMeta}>Current exercise: {live.currentExercise}</Text>
          ) : null}
        </View>
      ) : currentStep ? (
        <View style={styles.room}>
          <View style={styles.openBadge}>
            <Ionicons name="radio" size={14} color="#fff" />
            <Text style={styles.openBadgeText}>
              Open · Unit {live.currentUnit} · Ex {live.currentExercise}
            </Text>
          </View>
          <View style={styles.exercise}>
            <LiveExerciseView step={currentStep} />
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.secondaryBtn, submitting && styles.btnDisabled]}
              disabled={submitting}
              onPress={() => void markWorking(Math.min(90, localProgress + 25))}
            >
              <Text style={styles.secondaryBtnText}>
                {`I'm working (${Math.min(90, localProgress + 25)}%)`}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, submitting && styles.btnDisabled]}
              disabled={submitting}
              onPress={() => void markWorking(100)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Mark complete</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.waiting}>
          <Text style={styles.waitingSub}>Exercise content is loading…</Text>
          <LiveLessonRoomSkeleton />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { ...typography.label, color: colors.text, fontWeight: "700" },
  headerSub: { ...typography.caption, color: colors.textMuted },
  errorBanner: {
    marginHorizontal: spacing.screen,
    marginTop: spacing.sm,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { ...typography.caption, color: "#DC2626" },
  waiting: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.screen,
    gap: spacing.sm,
  },
  idleIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  waitingTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md, textAlign: "center" },
  waitingSub: { ...typography.bodySm, color: colors.textSecondary, textAlign: "center" },
  waitingMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  room: { flex: 1 },
  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginHorizontal: spacing.screen,
    marginTop: spacing.md,
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  openBadgeText: { ...typography.caption, color: "#fff", fontWeight: "600" },
  exercise: { flex: 1, paddingHorizontal: spacing.screen, paddingTop: spacing.md },
  actions: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  primaryBtnText: { ...typography.label, color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  secondaryBtnText: { ...typography.label, color: colors.text },
  btnDisabled: { opacity: 0.6 },
})
