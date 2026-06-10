import React, { useRef } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { analyticsApi, controlWorkApi, homeworkApi } from "../../lib/api"
import { recordGameExerciseResult } from "../../lib/learned-vocabulary"
import type { GrammarExercise } from "../../types/grammar"
import {
  HomeworkFooterButton,
  HomeworkMistakeCard,
  HomeworkResultsLayout,
} from "../homework/HomeworkExerciseLayout"
import { colors, radius, shadow, spacing } from "../../theme/tokens"

export type ResultVariant = "passed" | "retry" | "timeout"

export function resultVariant(timedOut: boolean, passed: boolean): ResultVariant {
  if (timedOut) return "timeout"
  if (passed) return "passed"
  return "retry"
}

const RESULT_ICON: Record<
  ResultVariant,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  passed: { icon: "checkmark-circle-outline", color: colors.success, bg: colors.successBg },
  retry: { icon: "book-outline", color: colors.primary, bg: colors.primaryLight },
  timeout: { icon: "timer-outline", color: colors.warning, bg: colors.warningBg },
}

export function ResultStatusIcon({ variant }: { variant: ResultVariant }) {
  const meta = RESULT_ICON[variant]
  return (
    <View style={[resultIconStyles.wrap, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon} size={32} color={meta.color} />
    </View>
  )
}

const resultIconStyles = StyleSheet.create({
  wrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
})

export interface ReviewItem {
  id: number
  prompt: string
  userAnswer: string
  correctAnswer: string
  explanation?: string
}

export function ProgressBar({
  index,
  total,
  correctCount,
}: {
  index: number
  total: number
  correctCount: number
  progressPct?: number
}) {
  const pct = Math.round(((index) / total) * 100)
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressLabels}>
        <Text style={styles.progressText}>
          Question {index + 1} of {total}
        </Text>
        <View style={styles.progressCorrect}>
          <Ionicons name="checkmark" size={12} color={colors.success} />
          <Text style={styles.progressText}>{correctCount}</Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
    </View>
  )
}

export function HintRow({
  showHint,
  setShowHint,
  hint,
}: {
  showHint: boolean
  setShowHint: (v: boolean) => void
  hint?: string
}) {
  if (!hint) return null
  return (
    <View>
      <Pressable onPress={() => setShowHint(!showHint)} style={styles.hintRow}>
        <Ionicons name="bulb-outline" size={16} color={colors.indigo} />
        <Text style={styles.hintToggle}>{showHint ? "Hide hint" : "Show hint"}</Text>
      </Pressable>
      {showHint && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  )
}

export function FeedbackBox({
  correct,
  correctAnswer,
  explanation,
}: {
  correct: boolean
  correctAnswer: string
  explanation?: string
}) {
  return (
    <View style={[styles.feedback, correct ? styles.feedbackOk : styles.feedbackBad]}>
      <View style={styles.feedbackTitleRow}>
        <Ionicons
          name={correct ? "checkmark-circle" : "close-circle"}
          size={18}
          color={correct ? colors.success : colors.error}
        />
        <Text style={styles.feedbackTitle}>{correct ? "Correct!" : "Incorrect"}</Text>
      </View>
      {!correct && correctAnswer ? (
        <Text style={styles.feedbackAnswer}>Answer: {correctAnswer}</Text>
      ) : null}
      {explanation ? <Text style={styles.feedbackExpl}>{explanation}</Text> : null}
    </View>
  )
}

export function ActionRow({
  result,
  canCheck,
  isLast,
  onCheck,
  onNext,
  variant = "default",
}: {
  result: "idle" | "correct" | "incorrect"
  canCheck: boolean
  isLast: boolean
  onCheck: () => void
  onNext: () => void
  variant?: "default" | "homework"
}) {
  const isHomework = variant === "homework"
  const btnStyle = isHomework ? styles.homeworkBtn : styles.primaryBtn
  const btnTextStyle = isHomework ? styles.homeworkBtnText : styles.primaryBtnText

  if (result === "idle") {
    return (
      <Pressable
        onPress={onCheck}
        disabled={!canCheck}
        style={[btnStyle, !canCheck && styles.btnDisabled]}
      >
        <Text style={btnTextStyle}>
          {isHomework ? (isLast ? "See results" : "Next") : "Check"}
        </Text>
      </Pressable>
    )
  }
  return (
    <Pressable onPress={onNext} style={btnStyle}>
      <Text style={btnTextStyle}>{isLast ? "See results" : "Next question"}</Text>
    </Pressable>
  )
}

export function ResultsScreen({
  exercise,
  correctCount,
  total,
  startedAt,
  elapsedSeconds,
  finishedAt,
  mistakes,
  homeworkId,
  controlWorkId,
  stepIndex,
  studentId,
  lockNavigation,
  onSessionEnd,
  timedOut,
}: {
  exercise: GrammarExercise
  correctCount: number
  total: number
  startedAt: number
  elapsedSeconds?: number
  finishedAt: number | null
  mistakes: ReviewItem[]
  homeworkId?: string
  controlWorkId?: string
  stepIndex?: number
  studentId?: string
  lockNavigation?: boolean
  onSessionEnd?: () => void
  timedOut?: boolean
}) {
  const router = useRouter()
  const recorded = useRef(false)
  const segmentMs = (finishedAt ?? Date.now()) - startedAt
  const elapsedMs =
    homeworkId && elapsedSeconds != null
      ? elapsedSeconds * 1000 + segmentMs
      : segmentMs
  const answeredCount = correctCount + mistakes.length
  const passed = !timedOut && correctCount >= exercise.passingScore
  const scorePct = Math.round((correctCount / total) * 100)

  React.useEffect(() => {
    onSessionEnd?.()
  }, [onSessionEnd])

  React.useEffect(() => {
    if (recorded.current) return
    recorded.current = true

    void analyticsApi
      .record({
        topic: exercise.topic,
        subtopic: exercise.subtopic,
        slug: exercise.slug,
        title: exercise.title,
        type: exercise.type,
        correctCount,
        totalQuestions: total,
        timedOut: timedOut || undefined,
        source: homeworkId ? "homework" : controlWorkId != null ? "control_work" : "game",
        homeworkId: homeworkId ?? undefined,
        controlWorkId: controlWorkId != null ? String(controlWorkId) : undefined,
        durationSeconds: elapsedSeconds,
      })
      .catch(() => {})

    if (studentId && !homeworkId && controlWorkId == null) {
      void recordGameExerciseResult(studentId, {
        slug: exercise.slug,
        title: exercise.title,
        topic: exercise.topic,
        correctCount,
        totalQuestions: total,
        passed,
      }).catch(() => {})
    }

    if (controlWorkId != null && stepIndex != null && studentId) {
      void controlWorkApi
        .completeStep(controlWorkId, stepIndex, {
          totalQuestions: total,
          correctCount,
          durationSeconds: Math.round(elapsedMs / 1000),
          timedOut: timedOut || undefined,
          answeredCount,
          mistakes: mistakes.map((m) => ({
            questionId: m.id,
            prompt: m.prompt,
            userAnswer: m.userAnswer,
            correctAnswer: m.correctAnswer,
            explanation: m.explanation,
          })),
        })
        .catch(() => {})
      return
    }

    if (!homeworkId || !studentId) return
    void homeworkApi
      .recordAttempt(homeworkId, {
        totalQuestions: total,
        correctCount,
        durationSeconds: Math.round(elapsedMs / 1000),
        timedOut: timedOut || undefined,
        answeredCount,
        mistakes: mistakes.map((m) => ({
          questionId: m.id,
          prompt: m.prompt,
          userAnswer: m.userAnswer,
          correctAnswer: m.correctAnswer,
          explanation: m.explanation,
        })),
      })
      .catch(() => {})
  }, [])

  const hasMistakes = mistakes.length > 0
  const resultTitle = timedOut ? "Time's up!" : passed ? "Well done!" : "Keep practising"
  const doneButton = (
    <HomeworkFooterButton label="Done" onPress={() => router.back()} />
  )

  if (homeworkId) {
    return (
      <HomeworkResultsLayout footer={doneButton}>
        <View style={[styles.homeworkResultsHero, !hasMistakes && styles.homeworkResultsHeroCentered]}>
          <ResultStatusIcon variant={resultVariant(!!timedOut, passed)} />
          <Text style={styles.homeworkResultsTitle}>{resultTitle}</Text>
          <Text style={styles.homeworkResultsScore}>
            {correctCount}/{total} correct ({scorePct}%)
          </Text>
          <Text style={styles.homeworkResultsMeta}>
            {passed ? "You passed!" : `Need ${exercise.passingScore} to pass`}
            {" · "}
            {Math.max(1, Math.round(elapsedMs / 60000))} min
          </Text>
        </View>

        {hasMistakes ? (
          <View style={styles.homeworkMistakesSection}>
            <Text style={styles.homeworkMistakesTitle}>Review mistakes</Text>
            {mistakes.map((m) => (
              <HomeworkMistakeCard
                key={m.id}
                prompt={m.prompt}
                userAnswer={m.userAnswer}
                correctAnswer={m.correctAnswer}
                explanation={m.explanation}
              />
            ))}
          </View>
        ) : null}
      </HomeworkResultsLayout>
    )
  }

  return (
    <ScrollView
      style={styles.resultsScroll}
      contentContainerStyle={[
        styles.resultsContent,
        !hasMistakes && styles.resultsContentCentered,
      ]}
    >
      <View style={styles.resultsHero}>
        <ResultStatusIcon variant={resultVariant(!!timedOut, passed)} />
        <Text style={styles.resultsTitle}>{resultTitle}</Text>
        <Text style={styles.resultsScore}>
          {correctCount}/{total} correct ({scorePct}%)
        </Text>
        <Text style={styles.resultsMeta}>
          {passed ? "You passed!" : `Need ${exercise.passingScore} to pass`}
          {" · "}
          {Math.max(1, Math.round(elapsedMs / 60000))} min
        </Text>

        {!hasMistakes ? (
          <Pressable
            onPress={() => router.back()}
            style={styles.resultsBtn}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
        ) : null}
      </View>

      {hasMistakes ? (
        <View style={styles.mistakesSection}>
          <Text style={styles.mistakesTitle}>Review mistakes</Text>
          {mistakes.map((m) => (
            <View key={m.id} style={styles.mistakeCard}>
              <Text style={styles.mistakePrompt}>{m.prompt}</Text>
              <Text style={styles.mistakeWrong}>Your answer: {m.userAnswer}</Text>
              <Text style={styles.mistakeRight}>Correct: {m.correctAnswer}</Text>
              {m.explanation ? (
                <Text style={styles.mistakeExpl}>{m.explanation}</Text>
              ) : null}
            </View>
          ))}
          <Pressable
            onPress={() => router.back()}
            style={styles.resultsBtn}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  progressWrap: { marginBottom: 12 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressCorrect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  progressTrack: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 999 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintToggle: { fontSize: 14, color: colors.indigo, fontWeight: "500" },
  feedbackTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, fontStyle: "italic" },
  feedback: { borderRadius: 12, padding: 12, marginTop: 8 },
  feedbackOk: { backgroundColor: colors.successBg },
  feedbackBad: { backgroundColor: colors.errorBg },
  feedbackTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  feedbackAnswer: { fontSize: 14, color: colors.text, marginTop: 4 },
  feedbackExpl: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  primaryBtn: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 16,
  },
  homeworkBtn: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  homeworkBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  resultsScroll: { flex: 1, backgroundColor: colors.background },
  resultsContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
    width: "100%",
  },
  resultsContentCentered: {
    justifyContent: "center",
  },
  resultsHero: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  resultsScore: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  resultsMeta: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  resultsBtn: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 24,
  },
  mistakesSection: { width: "100%", marginTop: 24 },
  mistakesTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  mistakeCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  mistakePrompt: { fontSize: 14, fontWeight: "500", color: colors.text },
  mistakeWrong: { fontSize: 13, color: colors.error, marginTop: 6 },
  mistakeRight: { fontSize: 13, color: colors.success, marginTop: 2 },
  mistakeExpl: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  homeworkResultsHero: {
    width: "100%",
    alignItems: "center",
    paddingTop: spacing.md,
  },
  homeworkResultsHeroCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  homeworkResultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  homeworkResultsScore: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  homeworkResultsMeta: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  homeworkMistakesSection: {
    width: "100%",
    marginTop: spacing.xl,
  },
  homeworkMistakesTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
})
