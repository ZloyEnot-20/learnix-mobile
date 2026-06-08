import React, { useRef } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { analyticsApi, homeworkApi } from "../../lib/api"
import type { GrammarExercise } from "../../types/grammar"
import { colors } from "../../theme/colors"

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
        <Text style={styles.progressText}>✓ {correctCount}</Text>
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
      <Pressable onPress={() => setShowHint(!showHint)}>
        <Text style={styles.hintToggle}>💡 {showHint ? "Hide hint" : "Show hint"}</Text>
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
      <Text style={styles.feedbackTitle}>{correct ? "✓ Correct!" : "✗ Incorrect"}</Text>
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
}: {
  result: "idle" | "correct" | "incorrect"
  canCheck: boolean
  isLast: boolean
  onCheck: () => void
  onNext: () => void
}) {
  if (result === "idle") {
    return (
      <Pressable
        onPress={onCheck}
        disabled={!canCheck}
        style={[styles.primaryBtn, !canCheck && styles.btnDisabled]}
      >
        <Text style={styles.primaryBtnText}>Check</Text>
      </Pressable>
    )
  }
  return (
    <Pressable onPress={onNext} style={styles.primaryBtn}>
      <Text style={styles.primaryBtnText}>{isLast ? "See results" : "Next question"}</Text>
    </Pressable>
  )
}

export function ResultsScreen({
  exercise,
  correctCount,
  total,
  startedAt,
  finishedAt,
  mistakes,
  homeworkId,
  studentId,
  timedOut,
}: {
  exercise: GrammarExercise
  correctCount: number
  total: number
  startedAt: number
  finishedAt: number | null
  mistakes: ReviewItem[]
  homeworkId?: string
  studentId?: string
  timedOut?: boolean
}) {
  const router = useRouter()
  const recorded = useRef(false)
  const elapsedMs = (finishedAt ?? Date.now()) - startedAt
  const answeredCount = correctCount + mistakes.length
  const passed = !timedOut && correctCount >= exercise.passingScore
  const scorePct = Math.round((correctCount / total) * 100)

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
        studentId,
      })
      .catch(() => {})

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

  return (
    <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent}>
      <Text style={styles.resultsEmoji}>{timedOut ? "⏱" : passed ? "🎉" : "📚"}</Text>
      <Text style={styles.resultsTitle}>
        {timedOut ? "Time's up!" : passed ? "Well done!" : "Keep practising"}
      </Text>
      <Text style={styles.resultsScore}>
        {correctCount}/{total} correct ({scorePct}%)
      </Text>
      <Text style={styles.resultsMeta}>
        {passed ? "You passed!" : `Need ${exercise.passingScore} to pass`}
        {" · "}
        {Math.max(1, Math.round(elapsedMs / 60000))} min
      </Text>

      {mistakes.length > 0 && (
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
        </View>
      )}

      <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Done</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  progressWrap: { marginBottom: 12 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  progressTrack: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 999 },
  hintToggle: { fontSize: 14, color: colors.indigo, fontWeight: "500" },
  hintText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, fontStyle: "italic" },
  feedback: { borderRadius: 12, padding: 12, marginTop: 8 },
  feedbackOk: { backgroundColor: colors.successBg },
  feedbackBad: { backgroundColor: colors.errorBg },
  feedbackTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  feedbackAnswer: { fontSize: 14, color: colors.text, marginTop: 4 },
  feedbackExpl: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  resultsScroll: { flex: 1, backgroundColor: colors.background },
  resultsContent: { padding: 24, alignItems: "center" },
  resultsEmoji: { fontSize: 48, marginBottom: 12 },
  resultsTitle: { fontSize: 24, fontWeight: "700", color: colors.text },
  resultsScore: { fontSize: 18, color: colors.textSecondary, marginTop: 8 },
  resultsMeta: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
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
})
