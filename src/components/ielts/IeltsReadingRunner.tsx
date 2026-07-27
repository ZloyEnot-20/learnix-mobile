import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type GestureResponderHandlers,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useCountdown, formatTimer } from "../../hooks/useCountdown"
import { useKeepAwakeWhile } from "../../hooks/useKeepAwakeWhile"
import type {
  IeltsReadingQuestionSection,
  IeltsReadingTest,
} from "../../types/ielts"
import {
  buildReadingAttempt,
  readingBandScore,
  scoreReadingTest,
} from "../../lib/ielts-reading"
import { isIeltsReading, resolveReadingLevel } from "../../types/reading"
import { HomeworkFooterButton } from "../homework/HomeworkExerciseLayout"
import { HomeworkReportIssueButton } from "../homework/HomeworkReportIssue"
import { HomeworkReadingReview } from "../homework/HomeworkReadingReview"
import { BackButton } from "../ui/BackButton"
import { IeltsBandScoreScreen } from "./IeltsBandScoreScreen"
import { PassageText } from "./PassageText"
import { ReadingSectionContent } from "./ReadingSectionContent"
import type { IssueReportPayload } from "../../types/issue-report"
import { colors, radius, spacing } from "../../theme/tokens"

const PANEL_ANIM_MS = 280
const DIVIDER_HEIGHT = 28
const DEFAULT_BOTTOM_RATIO = 0.48
const MIN_PASSAGE_HEIGHT = 120
const MIN_QUESTIONS_HEIGHT = 160

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function bottomBounds(containerHeight: number) {
  const available = Math.max(0, containerHeight - DIVIDER_HEIGHT)
  const minBottom = Math.min(MIN_QUESTIONS_HEIGHT, available)
  const maxBottom = Math.max(minBottom, available - MIN_PASSAGE_HEIGHT)
  return { available, minBottom, maxBottom }
}

type FlatSection = {
  key: string
  partIndex: number
  section: IeltsReadingQuestionSection
}

function flattenSections(test: IeltsReadingTest): FlatSection[] {
  const items: FlatSection[] = []
  test.parts.forEach((part, partIndex) => {
    if (part.sections?.length) {
      part.sections.forEach((section, sectionIndex) => {
        items.push({
          key: `${part.partNumber}-${section.id}-${sectionIndex}`,
          partIndex,
          section,
        })
      })
      return
    }
    // Legacy fallback: one synthetic section per part
    items.push({
      key: `part-${part.partNumber}`,
      partIndex,
      section: {
        id: `part-${part.partNumber}`,
        title: part.questionInstruction || `Part ${part.partNumber}`,
        instruction: part.questionInstruction || "",
        startQuestion: part.questions[0]?.id ?? 1,
        endQuestion: part.questions[part.questions.length - 1]?.id ?? 1,
        questions: part.questions,
      },
    })
  })
  return items
}

function SplitDivider({
  onToggle,
  collapsed,
  panHandlers,
  draggable,
}: {
  onToggle: () => void
  collapsed: boolean
  panHandlers?: GestureResponderHandlers
  draggable?: boolean
}) {
  return (
    <View
      style={styles.splitDivider}
      {...(draggable ? panHandlers : undefined)}
      accessibilityRole="adjustable"
      accessibilityLabel={
        collapsed ? "Show questions" : "Drag to resize, or tap button to hide questions"
      }
      accessibilityState={{ expanded: !collapsed }}
    >
      <Pressable
        onPress={onToggle}
        hitSlop={12}
        style={styles.splitDividerHit}
        accessibilityRole="button"
        accessibilityLabel={collapsed ? "Show questions" : "Hide questions"}
      >
        <View style={styles.splitDividerBar} />
      </Pressable>
    </View>
  )
}

function ReadingTimer({ secondsLeft }: { secondsLeft: number | null }) {
  if (secondsLeft == null) return null

  const urgent = secondsLeft <= 60
  const expired = secondsLeft <= 0

  return (
    <View
      style={[
        styles.timerBadge,
        urgent && styles.timerBadgeUrgent,
        expired && styles.timerBadgeExpired,
      ]}
    >
      <Ionicons
        name="time-outline"
        size={16}
        color={expired ? colors.error : urgent ? "#B45309" : colors.text}
      />
      <Text
        style={[
          styles.timerText,
          urgent && styles.timerTextUrgent,
          expired && styles.timerTextExpired,
        ]}
      >
        {expired ? "0:00" : formatTimer(secondsLeft)}
      </Text>
    </View>
  )
}

export function IeltsReadingRunner({
  test,
  onExit,
  onGoHome,
  homeworkId,
  studentId,
  sessionStartedAt: externalSessionStart,
  timeLimitMinutes,
  elapsedSeconds = 0,
  onBack,
}: {
  test: IeltsReadingTest
  onExit: () => void
  onGoHome?: () => void
  homeworkId?: string
  studentId?: string
  sessionStartedAt?: number
  timeLimitMinutes?: number
  elapsedSeconds?: number
  onBack?: () => void
}) {
  const insets = useSafeAreaInsets()
  const flatSections = useMemo(() => flattenSections(test), [test])
  const [sectionIndex, setSectionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [finished, setFinished] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [questionsCollapsed, setQuestionsCollapsed] = useState(false)
  const [splitVisible, setSplitVisible] = useState(true)
  const collapseProgress = useRef(new Animated.Value(1)).current
  const panelAnimating = useRef(false)
  const questionScrollRef = useRef<ScrollView>(null)
  const containerHeightRef = useRef(0)
  const containerAnim = useRef(new Animated.Value(0)).current
  const bottomAnim = useRef(new Animated.Value(0)).current
  const bottomHeightRef = useRef(0)
  const savedBottomHeightRef = useRef(0)
  const dragStartBottomRef = useRef(0)
  const questionsCollapsedRef = useRef(false)
  const passageHeightAnim = useRef(
    Animated.subtract(Animated.subtract(containerAnim, bottomAnim), DIVIDER_HEIGHT),
  ).current
  const [sessionStartedAt] = useState(() => externalSessionStart ?? Date.now())
  const submittedRef = React.useRef(false)

  useKeepAwakeWhile(!finished)

  const timerMinutes = timeLimitMinutes ?? test.totalTimeMinutes
  const current = flatSections[sectionIndex] ?? flatSections[0]
  const part = test.parts[current?.partIndex ?? 0]
  const section = current?.section

  const secondsLeft = useCountdown(
    timerMinutes,
    () => setFinished(true),
    finished,
    elapsedSeconds,
    sessionStartedAt,
  )

  useEffect(() => {
    questionScrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [sectionIndex])

  useEffect(() => {
    questionsCollapsedRef.current = questionsCollapsed
  }, [questionsCollapsed])

  const setBottomHeight = useCallback(
    (next: number) => {
      bottomHeightRef.current = next
      bottomAnim.setValue(next)
    },
    [bottomAnim],
  )

  const onSplitLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height
      if (height <= 0) return

      containerHeightRef.current = height
      containerAnim.setValue(height)

      const { available, minBottom, maxBottom } = bottomBounds(height)
      if (bottomHeightRef.current <= 0 && !questionsCollapsedRef.current) {
        const initial = clamp(available * DEFAULT_BOTTOM_RATIO, minBottom, maxBottom)
        setBottomHeight(initial)
        savedBottomHeightRef.current = initial
        return
      }

      if (!questionsCollapsedRef.current) {
        const clamped = clamp(bottomHeightRef.current, minBottom, maxBottom)
        if (clamped !== bottomHeightRef.current) setBottomHeight(clamped)
        savedBottomHeightRef.current = clamp(
          savedBottomHeightRef.current || clamped,
          minBottom,
          maxBottom,
        )
      }
    },
    [containerAnim, setBottomHeight],
  )

  const toggleQuestionsPanel = useCallback(() => {
    if (panelAnimating.current) return

    const nextCollapsed = !questionsCollapsedRef.current
    panelAnimating.current = true

    if (nextCollapsed) {
      savedBottomHeightRef.current = bottomHeightRef.current
      questionsCollapsedRef.current = true
      setQuestionsCollapsed(true)

      Animated.parallel([
        Animated.timing(collapseProgress, {
          toValue: 0,
          duration: PANEL_ANIM_MS,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: false,
        }),
        Animated.timing(bottomAnim, {
          toValue: 0,
          duration: PANEL_ANIM_MS,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: false,
        }),
      ]).start(() => {
        bottomHeightRef.current = 0
        setSplitVisible(false)
        panelAnimating.current = false
      })
      return
    }

    const { minBottom, maxBottom } = bottomBounds(containerHeightRef.current)
    const expandTarget = clamp(
      savedBottomHeightRef.current || containerHeightRef.current * DEFAULT_BOTTOM_RATIO,
      minBottom,
      maxBottom,
    )

    setSplitVisible(true)
    questionsCollapsedRef.current = false
    setQuestionsCollapsed(false)
    bottomAnim.setValue(0)
    bottomHeightRef.current = 0

    Animated.parallel([
      Animated.timing(collapseProgress, {
        toValue: 1,
        duration: PANEL_ANIM_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(bottomAnim, {
        toValue: expandTarget,
        duration: PANEL_ANIM_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }),
    ]).start(() => {
      bottomHeightRef.current = expandTarget
      panelAnimating.current = false
    })
  }, [bottomAnim, collapseProgress])

  const dividerPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        !questionsCollapsedRef.current &&
        !panelAnimating.current &&
        Math.abs(gesture.dy) > 2,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        !questionsCollapsedRef.current &&
        !panelAnimating.current &&
        Math.abs(gesture.dy) > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragStartBottomRef.current = bottomHeightRef.current
      },
      onPanResponderMove: (_, gesture) => {
        const { minBottom, maxBottom } = bottomBounds(containerHeightRef.current)
        const next = clamp(dragStartBottomRef.current - gesture.dy, minBottom, maxBottom)
        bottomHeightRef.current = next
        bottomAnim.setValue(next)
      },
      onPanResponderRelease: () => {
        savedBottomHeightRef.current = bottomHeightRef.current
      },
      onPanResponderTerminate: () => {
        savedBottomHeightRef.current = bottomHeightRef.current
      },
    }),
  ).current

  const bottomDividerOpacity = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  })

  const setAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const goNext = () => {
    if (sectionIndex + 1 < flatSections.length) {
      setSectionIndex((i) => i + 1)
    }
  }

  const goPrev = () => {
    if (sectionIndex > 0) {
      setSectionIndex((i) => i - 1)
    }
  }

  const submit = () => setFinished(true)

  React.useEffect(() => {
    if (!finished || !homeworkId || !studentId || submittedRef.current) return
    submittedRef.current = true
    const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000))
    const attempt = buildReadingAttempt(test, answers, durationSeconds)
    void import("../../lib/api")
      .then(({ homeworkApi }) => homeworkApi.recordAttempt(homeworkId, attempt))
      .then(() =>
        import("../../lib/home-screen-sync").then(({ refreshHomeContinueLearning }) =>
          refreshHomeContinueLearning(studentId),
        ),
      )
      .catch(() => {})
  }, [finished, homeworkId, studentId, test, answers, sessionStartedAt])

  if (finished) {
    const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000))
    const attempt = buildReadingAttempt(test, answers, durationSeconds)
    const { correct, total } = scoreReadingTest(test, answers)
    const isIelts = isIeltsReading({ id: test.id })
    const band = isIelts ? readingBandScore(correct) : 0
    const levelLabel = resolveReadingLevel({ id: test.id })
    const goHome = onGoHome ?? onExit

    if (showReview) {
      return (
        <HomeworkReadingReview
          test={test}
          attempt={attempt}
          title={test.title}
          subject="reading"
          onBack={() => setShowReview(false)}
        />
      )
    }

    return (
      <IeltsBandScoreScreen
        skill="reading"
        title={test.title}
        band={band}
        correct={correct}
        total={total}
        scoreMode={isIelts ? "band" : "percentage"}
        levelLabel={levelLabel || undefined}
        onViewResults={() => setShowReview(true)}
        onGoHome={goHome}
      />
    )
  }

  if (!section || !part) return null

  const atStart = sectionIndex === 0
  const atEnd = sectionIndex >= flatSections.length - 1

  const reportIssue: IssueReportPayload = {
    homeworkId,
    exerciseSlug: test.id,
    exerciseTitle: test.title,
    exerciseKind: "reading",
  }

  return (
    <View style={styles.root}>
      <View style={styles.split} onLayout={onSplitLayout}>
        <Animated.View
          style={[
            styles.passagePane,
            { height: splitVisible ? passageHeightAnim : containerAnim },
          ]}
        >
          <View style={styles.passageHeader}>
            {onBack ? (
              <View style={styles.passageHeaderSide}>
                <BackButton onPress={onBack} />
              </View>
            ) : (
              <View style={styles.passageHeaderSide} />
            )}
            <View style={styles.passageHeaderSpacer} />
            <View style={styles.passageHeaderTrailing}>
              <ReadingTimer secondsLeft={secondsLeft} />
              <HomeworkReportIssueButton report={reportIssue} variant="badge" />
            </View>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.passageScroll,
              !splitVisible && {
                paddingBottom:
                  DIVIDER_HEIGHT + Math.max(insets.bottom, spacing.xs) + spacing.sm,
              },
            ]}
            showsVerticalScrollIndicator
          >
            {part.passageTitle ? (
              <Text style={styles.passageTitle}>{part.passageTitle}</Text>
            ) : null}
            <PassageText text={part.passage} />
          </ScrollView>
        </Animated.View>

        {splitVisible ? (
          <>
            <SplitDivider
              onToggle={toggleQuestionsPanel}
              collapsed={questionsCollapsed}
              panHandlers={dividerPan.panHandlers}
              draggable={!questionsCollapsed}
            />

            <Animated.View style={[styles.bottomPanel, { height: bottomAnim }]}>
              <View style={styles.questionPane}>
                <ScrollView
                  ref={questionScrollRef}
                  style={styles.flex}
                  contentContainerStyle={styles.questionScroll}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  <ReadingSectionContent
                    section={section}
                    answers={answers}
                    onAnswerChange={setAnswer}
                  />
                </ScrollView>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.navRow}
                  style={styles.navRowWrap}
                >
                  {flatSections.map((item, index) => {
                    const active = index === sectionIndex
                    const done = item.section.questions.every((q) => (answers[q.id] ?? "").trim())
                    const label =
                      item.section.startQuestion === item.section.endQuestion
                        ? String(item.section.startQuestion)
                        : `${item.section.startQuestion}–${item.section.endQuestion}`
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => setSectionIndex(index)}
                        style={[
                          styles.navChip,
                          active && styles.navChipActive,
                          done && !active && styles.navChipDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.navChipText,
                            active && styles.navChipTextActive,
                            done && !active && styles.navChipTextDone,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>

              <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                <Pressable
                  onPress={goPrev}
                  disabled={atStart}
                  style={[styles.secondaryBtn, styles.footerBtn, atStart && styles.footerBtnDisabled]}
                >
                  <Text style={[styles.secondaryBtnText, atStart && styles.footerBtnTextDisabled]}>
                    Previous
                  </Text>
                </Pressable>
                {atEnd ? (
                  <View style={styles.footerBtn}>
                    <HomeworkFooterButton label="Submit" onPress={submit} />
                  </View>
                ) : (
                  <View style={styles.footerBtn}>
                    <HomeworkFooterButton label="Next" onPress={goNext} />
                  </View>
                )}
              </View>
            </Animated.View>
          </>
        ) : null}
      </View>

      <Animated.View
        style={[
          styles.dividerBottomDock,
          {
            opacity: bottomDividerOpacity,
            paddingBottom: Math.max(insets.bottom, spacing.xs),
          },
        ]}
        pointerEvents={!splitVisible ? "auto" : "none"}
      >
        <SplitDivider
          onToggle={toggleQuestionsPanel}
          collapsed={questionsCollapsed}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, position: "relative" },
  flex: { flex: 1 },
  passageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: "#FBF9F6",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  passageHeaderSide: {
    width: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  passageHeaderSpacer: { flex: 1, minWidth: 8 },
  passageHeaderTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  timerBadgeUrgent: { backgroundColor: colors.warningBg },
  timerBadgeExpired: { backgroundColor: colors.errorBg },
  timerText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  timerTextUrgent: { color: "#B45309" },
  timerTextExpired: { color: colors.error },
  split: { flex: 1, minHeight: 0 },
  bottomPanel: { minHeight: 0, overflow: "hidden" },
  passagePane: {
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: "#FBF9F6",
  },
  splitDivider: {
    height: DIVIDER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  splitDividerHit: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  splitDividerBar: {
    width: 52,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text,
    opacity: 0.45,
  },
  dividerBottomDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  questionPane: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  passageScroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  questionScroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  passageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 28,
    marginBottom: spacing.xs,
  },
  navRowWrap: {
    flexGrow: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  navRow: { gap: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  navChip: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  navChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  navChipDone: {
    borderColor: colors.success + "66",
    backgroundColor: colors.successBg,
  },
  navChipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  navChipTextActive: { color: colors.primaryDark },
  navChipTextDone: { color: colors.success },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerBtn: { flex: 1 },
  footerBtnDisabled: { opacity: 0.45 },
  footerBtnTextDisabled: { color: colors.textMuted },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
})
