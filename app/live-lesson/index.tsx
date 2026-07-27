import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect } from "expo-router"
import { useAuth } from "../../src/context/AuthContext"
import { isGuestUser } from "../../src/lib/guest"
import { getUserFacingErrorMessage } from "../../src/lib/api-client"
import { liveLessonsApi } from "../../src/lib/live-lesson-api"
import { flattenUnitToSteps } from "../../src/lib/books/lesson-flow"
import { buildLiveReviewItems } from "../../src/lib/books/live-review-items"
import type { LessonStep, LiveLessonState } from "../../src/lib/books/types"
import { useLiveLessonSocket } from "../../src/hooks/useLiveLessonSocket"
import { LiveExerciseView } from "../../src/components/live-lesson/LiveExerciseView"
import { LiveLessonFinishedScreen } from "../../src/components/live-lesson/LiveLessonFinishedScreen"
import { LiveLessonRoomSkeleton } from "../../src/components/live-lesson/LiveLessonSkeletons"
import { PageCard, SectionBanner, UnitHeader } from "../../src/demo/BookPageChrome"
import { colors, radius, spacing, typography } from "../../src/theme/tokens"

const POLL_MS = 3000

function LessonStartingState() {
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] })
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.08] })
  const cardY = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -6] })

  return (
    <View style={styles.waiting}>
      <View style={styles.lessonStartHero}>
        <Animated.View
          style={[styles.lessonStartRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
        />
        <Animated.View style={[styles.lessonStartCard, { transform: [{ translateY: cardY }] }]}>
          <Ionicons name="school-outline" size={34} color={colors.primaryDark} />
        </Animated.View>
      </View>
      <Text style={styles.waitingTitle}>Teacher started the lesson</Text>
      <Text style={styles.waitingSub}>
        Stay here. The unit is being prepared and the exercise will appear in a moment.
      </Text>
    </View>
  )
}

function NoActiveLessonsState() {
  return (
    <View style={styles.waiting}>
      <View style={styles.emptyStateHero}>
        <View style={styles.emptyStateIcon}>
          <Ionicons name="calendar-clear-outline" size={34} color={colors.textMuted} />
        </View>
      </View>
      <Text style={styles.waitingTitle}>No active lessons</Text>
      <Text style={styles.waitingSub}>
        When your teacher starts a live lesson for your group, it will appear here automatically.
      </Text>
    </View>
  )
}

type PageMeta = {
  page: number
  label: string
  exercise_ids: string[]
}

const SKIP_INSTRUCTION_RE =
  /mind\s*map|photograph|pie\s*chart|look at the (graph|picture|pictures|chart|diagram)|look at pictures/i

function shouldSkipExercise(step: LessonStep): boolean {
  const raw = step.raw
  if (raw.has_image === true || raw.has_graph === true) return true
  if (step.uiType === "image-prompt" || step.uiType === "graph-task") return true
  const type = String(raw.type ?? "").toLowerCase()
  if (type === "crossword" || type === "diagram_labels" || type === "graph_vocabulary") return true
  const text = `${typeof raw.instruction === "string" ? raw.instruction : ""} ${typeof raw.title === "string" ? raw.title : ""}`
  return SKIP_INSTRUCTION_RE.test(text)
}

function stepsForPage(page: PageMeta, allSteps: LessonStep[]): LessonStep[] {
  const ids = new Set(page.exercise_ids.map(String))
  const matched = allSteps.filter(
    (s) => ids.has(String(s.exerciseId)) && !shouldSkipExercise(s),
  )
  return page.exercise_ids
    .map((id) => matched.find((s) => String(s.exerciseId) === String(id)))
    .filter((s): s is LessonStep => Boolean(s))
}

function sectionTitleFor(page: PageMeta, pageSteps: LessonStep[]): string | undefined {
  const head = page.label.split("·")[0]?.trim()
  return head || pageSteps[0]?.sectionLabel || undefined
}

/**
 * Student live lesson room.
 * REST is the source of truth (progress + exercise sync). Socket is best-effort.
 */
export default function LiveLessonScreen() {
  const { user, isLoading: authLoading } = useAuth()

  const [live, setLive] = useState<LiveLessonState | null>(null)
  const [steps, setSteps] = useState<LessonStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [unitLoading, setUnitLoading] = useState(false)
  const [unitTitle, setUnitTitle] = useState("")
  const [unitSubtitle, setUnitSubtitle] = useState<string | undefined>()
  const [pages, setPages] = useState<PageMeta[]>([])
  const [localProgress, setLocalProgress] = useState(0)
  const [idle, setIdle] = useState(false)
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<string, unknown> | null>(null)
  const exerciseAnswersRef = useRef<Record<string, unknown> | null>(null)
  exerciseAnswersRef.current = exerciseAnswers
  const [finishedSummary, setFinishedSummary] = useState<{
    unitNumber: number | null
    score: number | null
  } | null>(null)
  const liveIdRef = useRef<string | null>(null)
  const lastExerciseRef = useRef<string | null>(null)
  const lastMeRef = useRef<{ score: number | null; unit: number | null }>({
    score: null,
    unit: null,
  })

  const applyState = useCallback((state: LiveLessonState | null) => {
    if (!state || state.lessonStatus === "finished") {
      if (state?.lessonStatus === "finished") {
        setFinishedSummary({
          unitNumber: state.currentUnit ?? lastMeRef.current.unit,
          score: lastMeRef.current.score,
        })
      }
      setLive(null)
      setIdle(true)
      liveIdRef.current = null
      return
    }
    const exerciseChanged =
      lastExerciseRef.current != null &&
      state.currentExercise != null &&
      lastExerciseRef.current !== state.currentExercise
    if (exerciseChanged) {
      setLocalProgress(0)
      setExerciseAnswers(null)
    }
    lastExerciseRef.current = state.currentExercise
    liveIdRef.current = state.id
    setLive(state)
    setIdle(false)
    setFinishedSummary(null)

    const me = state.students?.find((s) => s.studentId === user?.id)
    if (me) {
      lastMeRef.current = {
        score: me.score ?? (me.status === "done" ? me.progress : null),
        unit: state.currentUnit,
      }
      if (me.status === "done") {
        setLocalProgress(me.progress ?? 100)
      }
    }
  }, [user?.id])

  const joinActive = useCallback(async () => {
    if (!user || isGuestUser(user) || user.type !== "student") {
      setLoading(false)
      setError("Sign in as a student to join a live lesson")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const active = await liveLessonsApi.getActive()
      if (!active) {
        applyState(null)
        return
      }
      const joined = await liveLessonsApi.joinActive()
      applyState(joined)
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not join lesson"))
      applyState(null)
    } finally {
      setLoading(false)
    }
  }, [user, applyState])

  /** Lightweight poll — picks up teacher exercise / finish without reload. */
  const refreshActive = useCallback(async () => {
    if (!user || isGuestUser(user) || user.type !== "student") return
    try {
      const active = await liveLessonsApi.getActive()
      if (!active) {
        if (liveIdRef.current) {
          setFinishedSummary({
            unitNumber: lastMeRef.current.unit,
            score: lastMeRef.current.score,
          })
          setLive(null)
          setIdle(true)
          liveIdRef.current = null
        } else {
          applyState(null)
        }
        return
      }
      if (liveIdRef.current && liveIdRef.current === active.id) {
        applyState(active)
      } else {
        const joined = await liveLessonsApi.joinActive()
        applyState(joined)
      }
    } catch {
      // Keep last known state on transient errors
    }
  }, [user, applyState])

  useFocusEffect(
    useCallback(() => {
      void joinActive()
      const t = setInterval(() => {
        void refreshActive()
      }, POLL_MS)
      return () => clearInterval(t)
    }, [joinActive, refreshActive]),
  )

  useEffect(() => {
    if (!live?.bookId || live.currentUnit == null) {
      setSteps([])
      setPages([])
      setUnitTitle("")
      setUnitSubtitle(undefined)
      return
    }
    let cancelled = false
    ;(async () => {
      setUnitLoading(true)
      try {
        const [bookMeta, unitPayload] = await Promise.all([
          liveLessonsApi.getBook(live.bookId),
          liveLessonsApi.getUnit(live.bookId, live.currentUnit!),
        ])
        const { unit, answer_key } = unitPayload
        const flow = flattenUnitToSteps(unit, answer_key ?? undefined)
        const unitMeta = (bookMeta.units ?? []).find(
          (item) => Number(item.unit_number) === Number(live.currentUnit),
        )
        const pageList = (
          unitMeta?.pages?.length
            ? unitMeta.pages
            : (bookMeta.pages ?? []).filter((p) => Number(p.unit) === Number(live.currentUnit))
        ).map((p) => ({
          page: p.page,
          label: p.label,
          exercise_ids: p.exercise_ids ?? [],
        }))
        const resolvedPages =
          pageList.length > 0
            ? pageList
            : flow.map((s) => ({
                page: s.order + 1,
                label: `${s.sectionLabel} · ${s.exerciseId}`,
                exercise_ids: [s.exerciseId],
              }))
        if (!cancelled) {
          setSteps(flow)
          setPages(resolvedPages)
          setUnitTitle(unitMeta?.title || `Unit ${live.currentUnit}`)
          setUnitSubtitle(unitMeta?.subtitle ?? undefined)
        }
      } catch (e) {
        if (!cancelled) setError(getUserFacingErrorMessage(e, "Failed to load exercise"))
      } finally {
        if (!cancelled) setUnitLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [live?.bookId, live?.currentUnit])

  const onState = useCallback(
    (state: LiveLessonState) => {
      applyState(state)
    },
    [applyState],
  )

  const { connected } = useLiveLessonSocket(live?.id ?? null, {
    onState,
    onError: (msg) => setError(msg),
  })

  const currentStep =
    steps.find(
      (s) =>
        s.exerciseId === live?.currentExercise &&
        Number(s.unitNumber) === Number(live?.currentUnit),
    ) ?? null
  const currentExerciseLabel =
    currentStep != null ? `${currentStep.unitNumber}.${currentStep.exerciseId}` : null
  const review = live?.lastExerciseReview
  const me = live?.students?.find((s) => s.studentId === user?.id)
  const open = Boolean(live?.openForStudents && live.lessonStatus === "active")
  const isDone = me?.status === "done" || localProgress >= 100
  const visiblePages = pages.filter((p) => {
    const ids = new Set(p.exercise_ids.map(String))
    return steps.some((s) => ids.has(String(s.exerciseId)) && !shouldSkipExercise(s))
  })

  const handleAnswersChange = useCallback((answers: Record<string, unknown>) => {
    setExerciseAnswers(answers)
  }, [])

  const markWorking = async (progress: number, status?: "working" | "done") => {
    if (!live) return
    const nextStatus = status ?? (progress >= 100 ? "done" : "working")
    setLocalProgress(progress)
    setSubmitting(true)
    setError(null)
    try {
      const answers = exerciseAnswersRef.current ?? { kind: "open", notes: "" }
      const next = await liveLessonsApi.progress(live.id, {
        progress,
        status: nextStatus,
        answers,
        // Never send client score — server grades from answers
      })
      applyState(next)
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Failed to update progress"))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmComplete = () => {
    Alert.alert(
      "Complete exercise?",
      "Your answers will be sent to the teacher. You won’t be able to change them.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "default",
          onPress: () => {
            void markWorking(100, "done")
          },
        },
      ],
    )
  }

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <LiveLessonRoomSkeleton />
      </SafeAreaView>
    )
  }

  if (finishedSummary) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <LiveLessonFinishedScreen
          unitNumber={finishedSummary.unitNumber}
          score={finishedSummary.score}
          onGoHome={() => router.replace("/(tabs)" as never)}
          onDismiss={() => {
            setFinishedSummary(null)
            setIdle(true)
          }}
        />
      </SafeAreaView>
    )
  }

  const statusLabel = live
    ? connected
      ? `In lesson · live`
      : `In lesson · ${live.lessonStatus}`
    : "Your group"

  const headerTitle =
    live?.currentUnit != null
      ? unitTitle || `Unit ${live.currentUnit}`
      : "Live lesson"

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={styles.headerSub}>{statusLabel}</Text>
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
        <NoActiveLessonsState />
      ) : live?.currentUnit != null ? (
        <View style={styles.room}>
          <View style={styles.exercise}>
            {unitLoading ? (
              <LiveLessonRoomSkeleton />
            ) : (
              <ScrollView
                contentContainerStyle={styles.previewScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {visiblePages.length === 0 ? (
                  <PageCard>
                    <Text style={styles.waitingSub}>No exercises mapped to this unit yet.</Text>
                  </PageCard>
                ) : (
                  visiblePages.map((page, i) => {
                    const pageSteps = stepsForPage(page, steps)
                    const banner = sectionTitleFor(page, pageSteps)
                    return (
                      <PageCard key={`${page.page}-${page.label}`} pageNum={page.page}>
                        {i === 0 ? (
                          <UnitHeader
                            unit={live.currentUnit ?? undefined}
                            title={unitTitle || `Unit ${live.currentUnit}`}
                            subtitle={unitSubtitle}
                          />
                        ) : null}
                        {banner ? <SectionBanner title={banner} /> : null}
                        {pageSteps.map((step) => {
                          const isCurrentExercise =
                            open &&
                            step.exerciseId === live.currentExercise &&
                            Number(step.unitNumber) === Number(live.currentUnit)
                          const isCompletedCurrent = isCurrentExercise && isDone
                          const isReviewStep =
                            review != null &&
                            step.exerciseId === review.exerciseId &&
                            Number(step.unitNumber) === Number(review.unitNumber)
                          const reviewItems =
                            isReviewStep
                              ? buildLiveReviewItems(me, review.answerKey)
                              : isCompletedCurrent && me?.scoreDetail
                                ? buildLiveReviewItems(me, undefined)
                                : undefined
                          return (
                            <LiveExerciseView
                              key={step.id}
                              step={step}
                              unitSteps={steps}
                              embedded
                              locked={!isCurrentExercise || isDone}
                              active={isCurrentExercise && !isDone}
                              liveLessonId={live.id}
                              bookId={live.bookId}
                              reviewItems={reviewItems}
                              resultMode={isReviewStep ? "full" : isCompletedCurrent ? "compact" : undefined}
                              onAnswersChange={
                                isCurrentExercise && !isDone ? handleAnswersChange : undefined
                              }
                              showReportIssue={false}
                            />
                          )
                        })}
                      </PageCard>
                    )
                  })
                )}
              </ScrollView>
            )}
          </View>
          {open && currentStep && !isDone ? (
            <View style={styles.actions}>
              <Pressable
                style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                disabled={submitting}
                onPress={confirmComplete}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  {submitting
                    ? "Saving…"
                    : currentExerciseLabel
                      ? `Complete ${currentExerciseLabel}`
                      : "Complete"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : !open ? (
        <View style={styles.waitingWrap}>
          <LessonStartingState />
        </View>
      ) : (
        <View style={styles.waitingWrap}>
          <LessonStartingState />
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
  waitingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.screen,
    gap: spacing.md,
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
  lessonStartHero: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  lessonStartRing: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.primary,
  },
  lessonStartCard: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateHero: {
    marginBottom: spacing.sm,
  },
  emptyStateIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  room: { flex: 1 },
  exercise: { flex: 1 },
  previewScroll: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
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
  btnDisabled: { opacity: 0.6 },
})
