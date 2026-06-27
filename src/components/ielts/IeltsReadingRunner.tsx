import React, { useMemo, useState } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useCountdown, formatTimer } from "../../hooks/useCountdown"
import type { IeltsReadingPart, IeltsReadingQuestion, IeltsReadingTest } from "../../types/ielts"
import { scoreReadingTest } from "../../lib/ielts-reading"
import { HomeworkFooterButton } from "../homework/HomeworkExerciseLayout"
import { colors, radius, spacing } from "../../theme/tokens"

type Panel = "passage" | "questions"

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"] as const

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
          const selected = answer === opt
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.choiceCard, selected && styles.choiceCardSelected]}
            >
              <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
                {String.fromCharCode(65 + index)}. {opt}
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

function PassageModal({
  visible,
  part,
  onClose,
}: {
  visible: boolean
  part: IeltsReadingPart
  onClose: () => void
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={2}>
            {part.passageTitle ?? part.title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          {part.questionInstruction ? (
            <Text style={styles.instruction}>{part.questionInstruction}</Text>
          ) : null}
          <Text style={styles.passageText}>{part.passage}</Text>
        </ScrollView>
      </View>
    </Modal>
  )
}

function ResultsView({
  correct,
  total,
  onRetry,
  onExit,
}: {
  correct: number
  total: number
  onRetry: () => void
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
      <View style={styles.resultsActions}>
        <Pressable onPress={onRetry} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Try again</Text>
        </Pressable>
        <HomeworkFooterButton label="Back to list" onPress={onExit} />
      </View>
    </View>
  )
}

export function IeltsReadingRunner({
  test,
  onExit,
  homeworkId,
  studentId,
  sessionStartedAt: externalSessionStart,
}: {
  test: IeltsReadingTest
  onExit: () => void
  homeworkId?: string
  studentId?: string
  sessionStartedAt?: number
}) {
  const [panel, setPanel] = useState<Panel>("questions")
  const [partIndex, setPartIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [passageOpen, setPassageOpen] = useState(false)
  const [finished, setFinished] = useState(false)
  const [sessionStartedAt] = useState(() => externalSessionStart ?? Date.now())
  const submittedRef = React.useRef(false)

  const part = test.parts[partIndex]
  const questions = part.questions
  const currentQuestion = questions[questionIndex]
  const totalQuestions = useMemo(
    () => test.parts.reduce((sum, p) => sum + p.questions.length, 0),
    [test],
  )
  const answeredCount = Object.values(answers).filter((a) => a.trim()).length
  const secondsLeft = useCountdown(
    test.totalTimeMinutes,
    () => setFinished(true),
    finished,
    0,
    sessionStartedAt,
  )

  const globalQuestionIndex = useMemo(() => {
    let offset = 0
    for (let i = 0; i < partIndex; i++) offset += test.parts[i].questions.length
    return offset + questionIndex + 1
  }, [partIndex, questionIndex, test.parts])

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
    const { correct, total } = scoreReadingTest(test, answers)
    const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000))
    void import("../../lib/api")
      .then(({ homeworkApi }) =>
        homeworkApi.recordAttempt(homeworkId, {
          totalQuestions: total,
          correctCount: correct,
          durationSeconds,
          answeredCount: Object.values(answers).filter((a) => a.trim()).length,
        }),
      )
      .then(() =>
        import("../../lib/home-screen-sync").then(({ refreshHomeContinueLearning }) =>
          refreshHomeContinueLearning(studentId),
        ),
      )
      .catch(() => {})
  }, [finished, homeworkId, studentId, test, answers, sessionStartedAt])

  const retry = () => {
    setAnswers({})
    setPartIndex(0)
    setQuestionIndex(0)
    setFinished(false)
    setPanel("questions")
  }

  if (finished) {
    const { correct, total } = scoreReadingTest(test, answers)
    return <ResultsView correct={correct} total={total} onRetry={retry} onExit={onExit} />
  }

  const atStart = partIndex === 0 && questionIndex === 0
  const atEnd =
    partIndex === test.parts.length - 1 && questionIndex === questions.length - 1

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {test.title}
          </Text>
          <View style={styles.timerBadge}>
            <Ionicons name="time-outline" size={14} color="#B45309" />
            <Text style={styles.timerText}>{formatTimer(secondsLeft ?? 0)}</Text>
          </View>
        </View>
        <Text style={styles.progressText}>
          Question {globalQuestionIndex}/{totalQuestions} · {answeredCount} answered
        </Text>
        <View style={styles.segmented}>
          {(["passage", "questions"] as Panel[]).map((key) => {
            const active = panel === key
            return (
              <Pressable
                key={key}
                onPress={() => setPanel(key)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {key === "passage" ? "Passage" : "Questions"}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {panel === "passage" ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.passageScroll}>
          <Text style={styles.partLabel}>{part.title}</Text>
          {part.passageTitle ? (
            <Text style={styles.passageTitle}>{part.passageTitle}</Text>
          ) : null}
          {part.instruction ? <Text style={styles.instruction}>{part.instruction}</Text> : null}
          <Text style={styles.passageText}>{part.passage}</Text>
        </ScrollView>
      ) : (
        <ScrollView style={styles.flex} contentContainerStyle={styles.questionScroll}>
          <View style={styles.questionCard}>
            <Text style={styles.questionNumber}>Question {currentQuestion.id}</Text>
            {part.questionInstruction ? (
              <Text style={styles.questionInstruction}>{part.questionInstruction}</Text>
            ) : null}
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            <QuestionInput
              question={currentQuestion}
              answer={answers[currentQuestion.id] ?? ""}
              onChange={(value) => setAnswer(currentQuestion.id, value)}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navRow}
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
        </ScrollView>
      )}

      <Pressable style={styles.passageFab} onPress={() => setPassageOpen(true)}>
        <Ionicons name="book-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.passageFabText}>Full passage</Text>
      </Pressable>

      <View style={styles.footer}>
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

      <PassageModal visible={passageOpen} part={part} onClose={() => setPassageOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    gap: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.warningBg,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timerText: { fontSize: 12, fontWeight: "700", color: "#B45309" },
  progressText: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  segmentTextActive: { color: colors.text },
  passageScroll: {
    padding: spacing.screen,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  questionScroll: {
    padding: spacing.screen,
    paddingBottom: 100,
    gap: spacing.md,
  },
  partLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  passageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 26,
  },
  instruction: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  passageText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
  },
  questionInstruction: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 22,
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
  navRow: { gap: 8, paddingVertical: 4 },
  navChip: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
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
  passageFab: {
    position: "absolute",
    right: spacing.screen,
    bottom: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  passageFabText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text },
  modalClose: { padding: 4 },
  modalScroll: {
    padding: spacing.screen,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
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
  resultsActions: { gap: spacing.sm },
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
