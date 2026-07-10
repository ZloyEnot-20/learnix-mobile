import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
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
import type { IeltsListeningQuestion, IeltsListeningTest } from "../../types/ielts"
import {
  buildListeningAttempt,
  extractInlineQuestionIdsFromPart,
  getQuestionDetail,
  isMultiSelectListeningQuestion,
  listeningBandScore,
  parseCorrectVariants,
  extractListeningMcPrompt,
  scoreListeningTest,
} from "../../lib/ielts-listening"
import { ListeningExamAudio, type ListeningExamAudioHandle } from "./ListeningExamAudio"
import { ListeningExamAudioSequence } from "./ListeningExamAudioSequence"
import { resolveListeningFullAudioUri } from "../../lib/ielts-listening-audio"
import { HomeworkFooterButton } from "../homework/HomeworkExerciseLayout"
import { HomeworkListeningReview } from "../homework/HomeworkListeningReview"
import { BackButton } from "../ui/BackButton"
import { ListeningContent } from "./ListeningContent"
import { colors, radius, spacing, subjectColors } from "../../theme/tokens"

const LISTENING_ACCENT = subjectColors.listening

function ListeningTimer({ secondsLeft }: { secondsLeft: number | null }) {
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

function LetterPills({
  letters,
  answer,
  multiSelect,
  onChange,
}: {
  letters: string[]
  answer: string
  multiSelect?: boolean
  onChange: (value: string) => void
}) {
  const selected = useMemo(() => {
    if (!answer) return new Set<string>()
    return new Set(parseCorrectVariants(answer.replace(/,/g, " / ")).map((v) => v.toUpperCase()))
  }, [answer])

  const toggle = (letter: string) => {
    if (!multiSelect) {
      onChange(letter)
      return
    }
    const next = new Set(selected)
    if (next.has(letter)) next.delete(letter)
    else next.add(letter)
    onChange(Array.from(next).sort().join(" / "))
  }

  return (
    <View style={styles.letterRow}>
      {letters.map((letter) => {
        const isSelected = selected.has(letter)
        return (
          <Pressable
            key={letter}
            onPress={() => toggle(letter)}
            style={[styles.letterPill, isSelected && styles.letterPillSelected]}
          >
            <Text style={[styles.letterPillText, isSelected && styles.letterPillTextSelected]}>
              {letter}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function StandaloneQuestion({
  question,
  detail,
  answer,
  onChange,
}: {
  question: IeltsListeningQuestion
  detail?: ReturnType<typeof getQuestionDetail>
  answer: string
  onChange: (value: string) => void
}) {
  const prompt = detail?.options?.length
    ? extractListeningMcPrompt(detail.question?.trim() || "", detail.options)
    : detail?.question?.trim() || `Question ${question.label}`
  const multiSelect = isMultiSelectListeningQuestion(question, detail)

  if (detail?.options?.length) {
    return (
      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>Q{question.label}</Text>
        <Text style={styles.questionPrompt}>{prompt}</Text>
        <View style={styles.choiceList}>
          {detail.options.map((option) => {
            const letterMatch = option.trim().match(/^([A-H])\./i)
            const letter = letterMatch?.[1]?.toUpperCase() ?? option
            const selected = multiSelect
              ? parseCorrectVariants(answer.replace(/,/g, " / "))
                  .map((v) => v.toUpperCase())
                  .includes(letter)
              : answer.toUpperCase() === letter

            const onPress = () => {
              if (!multiSelect) {
                onChange(letter)
                return
              }
              const current = new Set(
                parseCorrectVariants(answer.replace(/,/g, " / ")).map((v) => v.toUpperCase()),
              )
              if (current.has(letter)) current.delete(letter)
              else current.add(letter)
              onChange(Array.from(current).sort().join(" / "))
            }

            return (
              <Pressable
                key={option}
                onPress={onPress}
                style={[styles.choiceCard, selected && styles.choiceCardSelected]}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                  {option}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  if (question.type === "matching" || question.type === "multiple-choice") {
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"]
    return (
      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>Q{question.label}</Text>
        <Text style={styles.questionPrompt}>{prompt}</Text>
        <LetterPills
          letters={letters}
          answer={answer}
          multiSelect={multiSelect}
          onChange={onChange}
        />
      </View>
    )
  }

  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionLabel}>Q{question.label}</Text>
      <Text style={styles.questionPrompt}>{prompt}</Text>
      <TextInput
        value={answer}
        onChangeText={onChange}
        placeholder="Your answer"
        placeholderTextColor={colors.textMuted}
        style={styles.textInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )
}

function ResultsView({
  correct,
  total,
  band,
  onExit,
  onRetry,
}: {
  correct: number
  total: number
  band: number
  onExit: () => void
  onRetry: () => void
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  return (
    <View style={styles.resultsWrap}>
      <View style={styles.resultsCard}>
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        <Text style={styles.resultsTitle}>Listening complete</Text>
        <Text style={styles.resultsScore}>
          {correct}/{total} correct ({pct}%)
        </Text>
        <Text style={styles.resultsBand}>Band score: {band.toFixed(1)}</Text>
        <Text style={styles.resultsHint}>
          Review your answers and listen again to reinforce key details.
        </Text>
      </View>
      <View style={styles.resultsActions}>
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
        <HomeworkFooterButton label="Done" onPress={onExit} />
      </View>
    </View>
  )
}

export function IeltsListeningRunner({
  test,
  testId,
  onExit,
  onBack,
  homeworkId,
  studentId,
  sessionStartedAt: externalSessionStart,
  timeLimitMinutes,
  elapsedSeconds = 0,
}: {
  test: IeltsListeningTest
  testId?: string
  onExit: () => void
  onBack?: () => void
  homeworkId?: string
  studentId?: string
  sessionStartedAt?: number
  timeLimitMinutes?: number
  elapsedSeconds?: number
}) {
  const insets = useSafeAreaInsets()
  const isHomework = Boolean(homeworkId)
  const [partIndex, setPartIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [finished, setFinished] = useState(false)
  const [testStarted, setTestStarted] = useState(isHomework)
  const [internalSessionStart, setInternalSessionStart] = useState<number | null>(null)
  const sessionStartedAt = externalSessionStart ?? internalSessionStart
  const submittedRef = useRef(false)
  const [fullAudioUri, setFullAudioUri] = useState<string | null>(null)
  const [usePartSequence, setUsePartSequence] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const audioPlayerRef = useRef<ListeningExamAudioHandle>(null)

  const timerMinutes = isHomework ? timeLimitMinutes : test.totalTime
  const secondsLeft = useCountdown(
    timerMinutes,
    () => setFinished(true),
    finished || !testStarted,
    isHomework ? elapsedSeconds : 0,
    sessionStartedAt,
  )

  const part = test.parts[partIndex]
  const totalParts = test.parts.length
  const inlineIds = useMemo(() => extractInlineQuestionIdsFromPart(part), [part])
  const questionPrompts = useMemo(() => {
    const prompts: Record<number, string> = {}
    for (const detail of test.questionDetails ?? []) {
      const prompt = detail.question?.trim()
      if (prompt) prompts[detail.id] = prompt
    }
    return prompts
  }, [test.questionDetails])
  const partAudioUrls = useMemo(
    () =>
      test.parts
        .map((item) => item.audioUrl?.trim())
        .filter((url): url is string => Boolean(url)),
    [test.parts],
  )
  const standaloneQuestions = useMemo(
    () => part.questions.filter((q) => !inlineIds.has(q.id)),
    [part.questions, inlineIds],
  )

  const setAnswer = useCallback((questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  const submitTest = () => {
    setFinished(true)
    void audioPlayerRef.current?.stop()
  }

  const handleStart = () => {
    setInternalSessionStart(Date.now())
    setTestStarted(true)
  }

  useEffect(() => {
    if (!isHomework || testStarted || externalSessionStart == null) return
    setTestStarted(true)
  }, [externalSessionStart, isHomework, testStarted])

  useEffect(() => {
    if (!testStarted) return
    let cancelled = false
    setAudioError(null)
    setUsePartSequence(false)
    setFullAudioUri(null)

    void resolveListeningFullAudioUri(test, testId)
      .then((uri) => {
        if (!cancelled) setFullAudioUri(uri)
      })
      .catch(() => {
        if (!cancelled) {
          if (partAudioUrls.length > 0) {
            setUsePartSequence(true)
          } else {
            setAudioError("Listening audio is not available for this test.")
          }
        }
      })

    return () => {
      cancelled = true
    }
  }, [partAudioUrls.length, test, testId, testStarted])

  const handleNext = () => {
    if (partIndex < totalParts - 1) {
      setPartIndex((i) => i + 1)
    }
  }

  const handlePrevious = () => {
    if (partIndex > 0) {
      setPartIndex((i) => i - 1)
    }
  }

  const handleSubmitPress = () => {
    const totalQuestions = test.parts.reduce((sum, p) => sum + p.questions.length, 0)
    const answeredCount = Object.values(answers).filter((a) => a.trim()).length
    const unanswered = totalQuestions - answeredCount

    if (unanswered > 0) {
      Alert.alert(
        "Submit test?",
        `${unanswered} question${unanswered === 1 ? "" : "s"} unanswered. Submit anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Submit", onPress: submitTest },
        ],
      )
      return
    }
    submitTest()
  }

  const handleRetry = () => {
    if (isHomework) return
    setAnswers({})
    setPartIndex(0)
    setFinished(false)
    setTestStarted(false)
    setInternalSessionStart(null)
    setFullAudioUri(null)
    setUsePartSequence(false)
    setAudioError(null)
  }

  useEffect(() => {
    if (!finished || !homeworkId || !studentId || submittedRef.current || sessionStartedAt == null) {
      return
    }
    submittedRef.current = true
    const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000))
    const attempt = buildListeningAttempt(test, answers, durationSeconds)
    void import("../../lib/api")
      .then(({ homeworkApi }) => homeworkApi.recordAttempt(homeworkId, attempt))
      .then(() =>
        import("../../lib/home-screen-sync").then(({ refreshHomeContinueLearning }) =>
          refreshHomeContinueLearning(studentId),
        ),
      )
      .catch(() => {})
  }, [finished, homeworkId, studentId, test, answers, sessionStartedAt])

  const { correct, total } = scoreListeningTest(test, answers)
  const band = listeningBandScore(correct)

  if (finished) {
    const durationSeconds =
      sessionStartedAt != null
        ? Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000))
        : 0
    const attempt = buildListeningAttempt(test, answers, durationSeconds)

    if (homeworkId) {
      return (
        <HomeworkListeningReview
          test={test}
          attempt={attempt}
          title={test.title}
          subject="listening"
        />
      )
    }

    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <View style={styles.resultsTopBar}>
          <BackButton onPress={onBack ?? onExit} />
        </View>
        <ResultsView
          correct={correct}
          total={total}
          band={band}
          onExit={onExit}
          onRetry={handleRetry}
        />
      </View>
    )
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <BackButton onPress={onBack ?? onExit} />
        {testStarted ? <ListeningTimer secondsLeft={secondsLeft} /> : null}
      </View>

      {testStarted && fullAudioUri ? (
        <ListeningExamAudio ref={audioPlayerRef} audioUri={fullAudioUri} autoPlay />
      ) : null}

      {testStarted && !fullAudioUri && usePartSequence ? (
        <ListeningExamAudioSequence ref={audioPlayerRef} audioUrls={partAudioUrls} autoPlay />
      ) : null}

      {testStarted && audioError ? (
        <View style={styles.audioErrorBanner}>
          <Text style={styles.audioErrorText}>{audioError}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentCard}>
          <ListeningContent
            content={part.content}
            contentBlocks={part.contentBlocks}
            questionPrompts={questionPrompts}
            answers={answers}
            onAnswerChange={setAnswer}
          />
        </View>

        {standaloneQuestions.length > 0 ? (
          standaloneQuestions.map((question) => (
            <StandaloneQuestion
              key={question.id}
              question={question}
              detail={getQuestionDetail(test, question.id)}
              answer={answers[question.id] ?? ""}
              onChange={(value) => setAnswer(question.id, value)}
            />
          ))
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partTabs}>
          {test.parts.map((p, index) => {
            const answered = p.questions.filter((q) => (answers[q.id] ?? "").trim()).length
            const active = index === partIndex
            return (
              <Pressable
                key={p.partNumber}
                onPress={() => setPartIndex(index)}
                style={[styles.partTab, active && styles.partTabActive]}
              >
                <Text style={[styles.partTabText, active && styles.partTabTextActive]}>
                  Part {p.partNumber} ({answered}/{p.questions.length})
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={styles.footerActions}>
          <Pressable
            onPress={handlePrevious}
            disabled={partIndex === 0}
            style={[styles.navButton, partIndex === 0 && styles.navButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Previous part"
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          {!testStarted ? (
            <Pressable onPress={handleStart} style={styles.startButton}>
              <Text style={styles.startButtonText}>Start</Text>
            </Pressable>
          ) : partIndex === totalParts - 1 ? (
            <Pressable onPress={handleSubmitPress} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Submit test</Text>
            </Pressable>
          ) : (
            <View style={styles.footerCenterSpacer} />
          )}

          <Pressable
            onPress={handleNext}
            disabled={partIndex >= totalParts - 1}
            style={[styles.navButton, partIndex >= totalParts - 1 && styles.navButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Next part"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  resultsTopBar: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  audioErrorBanner: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.errorBg,
  },
  audioErrorText: {
    fontSize: 13,
    color: colors.error,
    textAlign: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  contentCard: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    overflow: "hidden",
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  questionLabel: { fontSize: 12, fontWeight: "800", color: colors.primaryDark },
  questionPrompt: { fontSize: 14, lineHeight: 20, color: colors.text },
  choiceList: { gap: spacing.sm },
  choiceCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  choiceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  choiceText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  choiceTextSelected: { color: colors.primaryDark, fontWeight: "600" },
  letterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  letterPill: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  letterPillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  letterPillText: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  letterPillTextSelected: { color: colors.primaryDark },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  partTabs: { gap: 8, paddingBottom: 4 },
  partTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partTabActive: {
    backgroundColor: LISTENING_ACCENT + "33",
    borderColor: LISTENING_ACCENT,
  },
  partTabText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  partTabTextActive: { color: colors.text },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  footerCenterSpacer: {
    flex: 1,
    minHeight: 44,
  },
  startButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: { opacity: 0.4 },
  submitButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderLight,
  },
  timerBadgeUrgent: { backgroundColor: "#FEF3C7" },
  timerBadgeExpired: { backgroundColor: colors.errorBg },
  timerText: { fontSize: 13, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  timerTextUrgent: { color: "#B45309" },
  timerTextExpired: { color: colors.error },
  resultsWrap: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    justifyContent: "center",
    gap: spacing.md,
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
  resultsScore: { fontSize: 18, fontWeight: "700", color: colors.primaryDark },
  resultsBand: { fontSize: 16, fontWeight: "600", color: colors.text },
  resultsHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  resultsActions: { gap: spacing.sm },
  retryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: { fontSize: 15, fontWeight: "700", color: colors.text },
})
