import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useCountdown, formatTimer } from "../../hooks/useCountdown"
import { useKeepAwakeWhile } from "../../hooks/useKeepAwakeWhile"
import type { IeltsReadingQuestion, IeltsReadingTest } from "../../types/ielts"
import {
  buildReadingAttempt,
  cleanPartQuestionInstruction,
  extractReadingOptionValue,
  formatReadingChoiceLabel,
  resolveReadingQuestionPrompt,
  scoreReadingTest,
} from "../../lib/ielts-reading"
import { HomeworkFooterButton } from "../homework/HomeworkExerciseLayout"
import { HomeworkReadingReview } from "../homework/HomeworkReadingReview"
import { BackButton } from "../ui/BackButton"
import { PassageText } from "./PassageText"
import { colors, radius, spacing } from "../../theme/tokens"

const PANEL_ANIM_MS = 280
const SCREEN_HEIGHT = Dimensions.get("window").height
const COLLAPSE_DIVIDER_HEIGHT = 36
const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"] as const

function isChoiceSelected(option: string, answer: string): boolean {
  if (!answer) return false
  const optionKey = extractReadingOptionValue(option)
  return answer === option || answer.toLowerCase() === optionKey.toLowerCase()
}

function CollapseDivider({
  onPress,
  chevronRotation,
  collapsed,
}: {
  onPress: () => void
  chevronRotation: Animated.AnimatedInterpolation<string>
  collapsed: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.splitDivider}
      accessibilityRole="button"
      accessibilityLabel={collapsed ? "Show questions" : "Hide questions"}
      accessibilityState={{ expanded: !collapsed }}
    >
      <View style={styles.splitDividerButton}>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
        </Animated.View>
      </View>
    </Pressable>
  )
}

function QuestionInput({
  question,
  answer,
  onChange,
}: {
  question: IeltsReadingQuestion
  answer: string
  onChange: (value: string) => void
}) {
  if (question.type === "true-false-not-given" || question.type === "yes-no-not-given") {
    const options =
      question.type === "yes-no-not-given"
        ? (["YES", "NO", "NOT GIVEN"] as const)
        : TFNG_OPTIONS
    return (
      <View style={styles.optionRow}>
        {options.map((opt) => {
          const selected = answer.toUpperCase() === opt
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.optionPill, selected && styles.optionPillSelected]}
            >
              <Text style={[styles.optionPillText, selected && styles.optionPillTextSelected]}>
                {opt === "NOT GIVEN" ? "N/G" : opt[0] + opt.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          )
        })}
      </View>
    )
  }

  if (question.type === "multiple-choice" && question.options?.length) {
    return (
      <View style={styles.choiceList}>
        {question.options.map((opt, index) => {
          const selected = isChoiceSelected(opt, answer)
          const optionValue = extractReadingOptionValue(opt)
          return (
            <Pressable
              key={`${index}-${opt}`}
              onPress={() => onChange(optionValue)}
              style={[styles.choiceCard, selected && styles.choiceCardSelected]}
            >
              <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
                {formatReadingChoiceLabel(opt, index)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    )
  }

  return (
    <TextInput
      value={answer}
      onChangeText={onChange}
      placeholder="Your answer"
      placeholderTextColor={colors.textMuted}
      style={styles.textInput}
      autoCapitalize="none"
      autoCorrect={false}
    />
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

function CollapsibleInstruction({
  instruction,
  expanded,
  onToggle,
}: {
  instruction: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <View style={styles.instructionWrap}>
      <Pressable
        onPress={onToggle}
        style={styles.instructionToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.instructionToggleLabel}>Instructions</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded ? <Text style={styles.questionInstruction}>{instruction}</Text> : null}
    </View>
  )
}

function ResultsView({
  correct,
  total,
  onExit,
}: {
  correct: number
  total: number
  onExit: () => void
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  return (
    <View style={styles.resultsWrap}>
      <View style={styles.resultsCard}>
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        <Text style={styles.resultsTitle}>Practice complete</Text>
        <Text style={styles.resultsScore}>
          {correct}/{total} correct ({pct}%)
        </Text>
        <Text style={styles.resultsHint}>
          Review your answers and re-read the passage to reinforce key details.
        </Text>
      </View>
      <HomeworkFooterButton label="Done" onPress={onExit} />
    </View>
  )
}

export function IeltsReadingRunner({
  test,
  onExit,
  homeworkId,
  studentId,
  sessionStartedAt: externalSessionStart,
  timeLimitMinutes,
  elapsedSeconds = 0,
  onBack,
}: {
  test: IeltsReadingTest
  onExit: () => void
  homeworkId?: string
  studentId?: string
  sessionStartedAt?: number
  timeLimitMinutes?: number
  elapsedSeconds?: number
  onBack?: () => void
}) {
  const insets = useSafeAreaInsets()
  const [partIndex, setPartIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [finished, setFinished] = useState(false)
  const [instructionExpanded, setInstructionExpanded] = useState(true)
  const [questionsCollapsed, setQuestionsCollapsed] = useState(false)
  const collapseProgress = useRef(new Animated.Value(1)).current
  const panelAnimating = useRef(false)
  const [sessionStartedAt] = useState(() => externalSessionStart ?? Date.now())
  const submittedRef = React.useRef(false)

  useKeepAwakeWhile(!finished)

  const timerMinutes = timeLimitMinutes ?? test.totalTimeMinutes
  const part = test.parts[partIndex]
  const questions = part.questions
  const currentQuestion = questions[questionIndex]
  const secondsLeft = useCountdown(
    timerMinutes,
    () => setFinished(true),
    finished,
    elapsedSeconds,
    sessionStartedAt,
  )

  const partInstruction = useMemo(
    () => cleanPartQuestionInstruction(part.questionInstruction),
    [part.questionInstruction],
  )

  const questionPrompt = useMemo(
    () =>
      resolveReadingQuestionPrompt(
        currentQuestion.question,
        currentQuestion.options,
        part.questionInstruction,
      ),
    [currentQuestion, part.questionInstruction],
  )

  useEffect(() => {
    setInstructionExpanded(true)
  }, [partIndex])

  const toggleQuestionsPanel = useCallback(() => {
    if (panelAnimating.current) return

    const nextCollapsed = !questionsCollapsed
    panelAnimating.current = true
    setQuestionsCollapsed(nextCollapsed)

    Animated.timing(collapseProgress, {
      toValue: nextCollapsed ? 0 : 1,
      duration: PANEL_ANIM_MS,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start(() => {
      panelAnimating.current = false
    })
  }, [collapseProgress, questionsCollapsed])

  const panelFlex = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  const animatedPanelOpacity = collapseProgress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.92, 1],
  })

  const chevronRotation = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "0deg"],
  })

  const inlineDividerOpacity = collapseProgress
  const bottomDividerOpacity = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  })

  const setAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const goNext = () => {
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((i) => i + 1)
      return
    }
    if (partIndex + 1 < test.parts.length) {
      setPartIndex((i) => i + 1)
      setQuestionIndex(0)
    }
  }

  const goPrev = () => {
    if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1)
      return
    }
    if (partIndex > 0) {
      const prevPart = test.parts[partIndex - 1]
      setPartIndex((i) => i - 1)
      setQuestionIndex(prevPart.questions.length - 1)
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

    if (homeworkId) {
      return (
        <HomeworkReadingReview
          test={test}
          attempt={attempt}
          title={test.title}
          subject="reading"
        />
      )
    }

    const { correct, total } = scoreReadingTest(test, answers)
    return <ResultsView correct={correct} total={total} onExit={onExit} />
  }

  const atStart = partIndex === 0 && questionIndex === 0
  const atEnd =
    partIndex === test.parts.length - 1 && questionIndex === questions.length - 1

  return (
    <View style={styles.root}>
      <View style={styles.split}>
        <View style={styles.passagePane}>
          <View style={styles.passageHeader}>
            {onBack ? (
              <View style={styles.passageHeaderSide}>
                <BackButton onPress={onBack} />
              </View>
            ) : null}
            <View style={styles.passageHeaderSpacer} />
            <ReadingTimer secondsLeft={secondsLeft} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.passageScroll,
              questionsCollapsed && {
                paddingBottom:
                  COLLAPSE_DIVIDER_HEIGHT + Math.max(insets.bottom, spacing.xs) + spacing.sm,
              },
            ]}
            showsVerticalScrollIndicator
          >
            {part.passageTitle ? (
              <Text style={styles.passageTitle}>{part.passageTitle}</Text>
            ) : null}
            <PassageText text={part.passage} />
          </ScrollView>
        </View>

        <Animated.View
          style={{
            opacity: inlineDividerOpacity,
            maxHeight: collapseProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 36],
            }),
            overflow: "hidden",
          }}
          pointerEvents={questionsCollapsed ? "none" : "auto"}
        >
          <CollapseDivider
            onPress={toggleQuestionsPanel}
            chevronRotation={chevronRotation}
            collapsed={questionsCollapsed}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomPanel,
            {
              flex: panelFlex,
              opacity: animatedPanelOpacity,
              maxHeight: collapseProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, SCREEN_HEIGHT],
              }),
            },
          ]}
          pointerEvents={questionsCollapsed ? "none" : "auto"}
        >
          <View style={styles.questionPane}>
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.questionScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                <View style={styles.questionCard}>
                  {partInstruction ? (
                    <CollapsibleInstruction
                      instruction={partInstruction}
                      expanded={instructionExpanded}
                      onToggle={() => setInstructionExpanded((open) => !open)}
                    />
                  ) : null}
                  {questionPrompt ? (
                    <Text style={styles.questionText}>{questionPrompt}</Text>
                  ) : null}
                  <QuestionInput
                    question={currentQuestion}
                    answer={answers[currentQuestion.id] ?? ""}
                    onChange={(value) => setAnswer(currentQuestion.id, value)}
                  />
                </View>
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.navRow}
                style={styles.navRowWrap}
              >
                {test.parts.flatMap((p, pi) =>
                  p.questions.map((q, qi) => {
                    const active = pi === partIndex && qi === questionIndex
                    const done = !!(answers[q.id] ?? "").trim()
                    return (
                      <Pressable
                        key={q.id}
                        onPress={() => {
                          setPartIndex(pi)
                          setQuestionIndex(qi)
                        }}
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
                          {q.id}
                        </Text>
                      </Pressable>
                    )
                  }),
                )}
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
      </View>

      <Animated.View
        style={[
          styles.dividerBottomDock,
          {
            opacity: bottomDividerOpacity,
            paddingBottom: Math.max(insets.bottom, spacing.xs),
          },
        ]}
        pointerEvents={questionsCollapsed ? "auto" : "none"}
      >
        <CollapseDivider
          onPress={toggleQuestionsPanel}
          chevronRotation={chevronRotation}
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
  passageHeaderSpacer: {
    flex: 1,
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
  timerBadgeUrgent: {
    backgroundColor: colors.warningBg,
  },
  timerBadgeExpired: {
    backgroundColor: colors.errorBg,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  timerTextUrgent: { color: "#B45309" },
  timerTextExpired: { color: colors.error },
  split: {
    flex: 1,
    minHeight: 0,
  },
  bottomPanel: {
    minHeight: 0,
    overflow: "hidden",
  },
  passagePane: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "#FBF9F6",
  },
  splitDivider: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    backgroundColor: colors.borderLight,
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
  splitDividerButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
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
    padding: spacing.md,
    paddingBottom: spacing.xs,
  },
  passageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 28,
    marginBottom: spacing.xs,
  },
  instructionWrap: {
    gap: spacing.xs,
  },
  instructionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  instructionToggleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  questionInstruction: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 24,
  },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  optionPill: {
    flexGrow: 1,
    minWidth: "30%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  optionPillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionPillText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  optionPillTextSelected: { color: colors.primaryDark },
  choiceList: { gap: 8 },
  choiceCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 12,
  },
  choiceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  choiceLabel: { fontSize: 14, color: colors.text, lineHeight: 20 },
  choiceLabelSelected: { color: colors.primaryDark, fontWeight: "600" },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  navRowWrap: {
    flexGrow: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  navRow: { gap: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  navChip: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
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
  navChipText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
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
  resultsWrap: {
    flex: 1,
    padding: spacing.screen,
    justifyContent: "center",
    gap: spacing.lg,
  },
  resultsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  resultsTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  resultsScore: { fontSize: 28, fontWeight: "800", color: colors.primaryDark },
  resultsHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "700", color: colors.text },
  footerBtn: { flex: 1 },
  footerBtnDisabled: { opacity: 0.45 },
  footerBtnTextDisabled: { color: colors.textMuted },
})
