import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  GRAMMAR_BLANK_TOKEN,
  formatFillBlankCorrectAnswer,
  getAcceptableAnswersForBlank,
  isBlankCorrect,
  normalizeAnswer,
  type GrammarExercise,
  type GrammarQuestion,
} from "../../types/grammar"
import { useCountdown, formatTimer } from "../../hooks/useCountdown"
import {
  HomeworkExerciseLayout,
  HomeworkSourceCard,
  HomeworkWordChip,
  homeworkInstructionForType,
  resolveHomeworkInstruction,
} from "../homework/HomeworkExerciseLayout"
import {
  ActionRow,
  FeedbackBox,
  HintRow,
  ProgressBar,
  ResultsScreen,
  type ReviewItem,
} from "./shared"
import { SpeakingRunner } from "./SpeakingRunner"
import { colors, radius, spacing } from "../../theme/tokens"
import { grammarIssueReport } from "../../types/issue-report"
import { resolveQuestionType } from "../../lib/grammar-question-types"
import { useHomeworkAssignmentState } from "../../hooks/useHomeworkAssignmentState"
import type { HomeworkAttempt } from "../../types/domain"

const exerciseTextInputProps = {
  placeholderTextColor: colors.textMuted,
  autoCorrect: false as const,
  underlineColorAndroid: "transparent" as const,
}

function isAssignmentMode(homeworkId?: string, controlWorkId?: string) {
  return !!(homeworkId || controlWorkId)
}

export interface ExerciseRunnerProps {
  exercise: GrammarExercise
  homeworkId?: string
  controlWorkId?: string
  stepIndex?: number
  studentId?: string
  timeLimitMinutes?: number
  /** Active segment anchor — timer only runs while this is set. */
  sessionStartedAt: number
  /** Accumulated active seconds from previous segments (homework pause). */
  elapsedSeconds?: number
  lockNavigation?: boolean
  onSessionEnd?: () => void
  /** Saved in-progress answers from a paused homework session. */
  savedAttempt?: HomeworkAttempt
}

function ExerciseHeader({
  exercise,
  secondsLeft,
  homeworkMode,
}: {
  exercise: GrammarExercise
  secondsLeft: number | null
  homeworkMode?: boolean
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {!homeworkMode ? (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exercise.title}
          </Text>
        ) : null}
        <Text style={styles.headerMeta}>
          {exercise.level} · {exercise.totalQuestions} questions
        </Text>
      </View>
      {secondsLeft != null && (
        <View style={[styles.timer, secondsLeft <= 60 && styles.timerUrgent]}>
          <Text style={styles.timerText}>{formatTimer(secondsLeft)}</Text>
        </View>
      )}
    </View>
  )
}

function QuestionCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      {children}
    </View>
  )
}

function HomeworkInstructions({
  visible,
  instructions,
}: {
  visible?: boolean
  instructions?: string
}) {
  const [open, setOpen] = useState(true)

  if (!visible || !instructions?.trim()) return null

  return (
    <View style={styles.instructionsBox}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.instructionsHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.instructionsLabel}>Instructions</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="#1D4ED8" />
      </Pressable>
      {open ? <Text style={styles.instructionsText}>{instructions}</Text> : null}
    </View>
  )
}

function ExerciseScreenFrame({
  homeworkId,
  controlWorkId,
  stepIndex,
  exercise,
  index,
  total,
  correctCount,
  secondsLeft,
  questionInstruction,
  questionPrompt,
  questionId,
  instructionType,
  children,
  footer,
}: {
  homeworkId?: string
  controlWorkId?: string
  stepIndex?: number
  exercise: GrammarExercise
  index: number
  total: number
  correctCount: number
  secondsLeft: number | null
  questionInstruction?: string
  questionPrompt?: string
  questionId?: number
  /** Override exercise.type for per-question homework instructions (mixed). */
  instructionType?: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  const instruction = resolveHomeworkInstruction(
    questionInstruction,
    questionPrompt,
    instructionType ?? exercise.type,
  )

  const reportIssue = grammarIssueReport(exercise, {
    homeworkId,
    controlWorkId,
    stepIndex,
    questionIndex: index,
    questionId,
    questionPrompt,
  })

  const assignmentMode = isAssignmentMode(homeworkId, controlWorkId)

  if (assignmentMode) {
    return (
      <HomeworkExerciseLayout
        index={index}
        total={total}
        instruction={instruction}
        footer={footer}
        reportIssue={reportIssue}
        secondsLeft={secondsLeft}
      >
        <HomeworkInstructions visible={assignmentMode} instructions={exercise.instructions} />
        {children}
      </HomeworkExerciseLayout>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ExerciseHeader
        exercise={exercise}
        secondsLeft={secondsLeft}
        homeworkMode={false}
      />
      <ProgressBar index={index} total={total} correctCount={correctCount} />
      <HomeworkInstructions visible={assignmentMode} instructions={exercise.instructions} />
      <QuestionCard>
        {children}
        {footer}
      </QuestionCard>
    </ScrollView>
  )
}

// ─── Fill in the blank ───────────────────────────────────────────────────────

function FillBlankRunner(props: ExerciseRunnerProps) {
  const {
    exercise,
    homeworkId,
    controlWorkId,
    stepIndex,
    studentId,
    timeLimitMinutes,
    sessionStartedAt,
    elapsedSeconds,
    lockNavigation,
    onSessionEnd,
    savedAttempt,
  } = props
  const questions = exercise.content.questions ?? []
  const {
    index,
    setIndex,
    correctCount,
    setCorrectCount,
    mistakes,
    setMistakes,
    assignmentMode,
    advanceOrFinish,
  } = useHomeworkAssignmentState(homeworkId, controlWorkId, savedAttempt, questions.length)
  const [inputs, setInputs] = useState<string[]>([])
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [perBlank, setPerBlank] = useState<boolean[]>([])
  const [showHint, setShowHint] = useState(false)
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const question = questions[index] ?? null
  const segments = useMemo(
    () => (question ? question.text.split(GRAMMAR_BLANK_TOKEN) : []),
    [question],
  )
  const blanksCount = Math.max(segments.length - 1, 0)

  const renderSegmentTokens = (seg: string, variant: "default" | "homework", keyPrefix: string) => {
    const tokens = seg.split(/(\s+)/).filter((t) => t.length > 0)
    const style = variant === "homework" ? styles.homeworkSentenceToken : styles.sentenceToken
    return tokens.map((token, idx) => (
      <Text key={`${keyPrefix}-${idx}`} style={style}>
        {token}
      </Text>
    ))
  }

  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    elapsedSeconds ?? 0,
    sessionStartedAt,
  )

  useEffect(() => {
    setInputs(Array.from({ length: blanksCount }, () => ""))
    setPerBlank([])
    setResult("idle")
    setShowHint(false)
  }, [blanksCount, index])

  const allFilled = inputs.length > 0 && inputs.every((v) => v.trim().length > 0)

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || !allFilled) return
    const checks = inputs.map((val, i) =>
      isBlankCorrect(val, getAcceptableAnswersForBlank(question, i)),
    )
    const allCorrect = checks.every(Boolean)
    const nextCorrect = allCorrect ? correctCount + 1 : correctCount
    const nextMistakes = allCorrect
      ? mistakes
      : [
          ...mistakes,
          {
            id: question.id,
            prompt: question.text,
            userAnswer: inputs.map((s) => s.trim()).filter(Boolean).join(" / "),
            correctAnswer: formatFillBlankCorrectAnswer(question),
            explanation: question.explanation,
          },
        ]
    if (allCorrect) setCorrectCount(nextCorrect)
    else setMistakes(nextMistakes)
    if (
      advanceOrFinish(index, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      }, nextCorrect, nextMistakes)
    ) {
      return
    }
    setPerBlank(checks)
    setResult(allCorrect ? "correct" : "incorrect")
  }, [allFilled, homeworkId, index, inputs, question, questions.length, result])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        correctCount={correctCount}
        total={questions.length}
        startedAt={sessionStartedAt}
        elapsedSeconds={elapsedSeconds}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        studentId={studentId}
        lockNavigation={lockNavigation}
        onSessionEnd={onSessionEnd}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  const actionRow = (
    <ActionRow
      result={result}
      canCheck={allFilled}
      isLast={index + 1 >= questions.length}
      onCheck={handleCheck}
      onNext={handleNext}
      variant={assignmentMode ? "homework" : "default"}
    />
  )

  const questionBody = (
    <>
      {!assignmentMode ? <Text style={styles.qLabel}>Question {index + 1}</Text> : null}
      {assignmentMode ? (
        <HomeworkSourceCard>
          <View style={styles.homeworkBlankRow}>
            {segments.map((seg, i) => (
              <React.Fragment key={i}>
                {seg ? renderSegmentTokens(seg, "homework", `hseg-${i}`) : null}
                {i < blanksCount && (
                  <View collapsable={false}>
                    <TextInput
                      {...exerciseTextInputProps}
                      style={[
                        styles.homeworkBlankInput,
                        result !== "idle" &&
                          (perBlank[i] ? styles.blankUnderlineOk : styles.blankUnderlineBad),
                      ]}
                      value={inputs[i] ?? ""}
                      onChangeText={(val) => {
                        setInputs((prev) => {
                          const next = [...prev]
                          next[i] = val
                          return next
                        })
                      }}
                      editable={result === "idle"}
                      placeholder=""
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </HomeworkSourceCard>
      ) : (
        <View style={styles.blankRow}>
          {segments.map((seg, i) => (
            <React.Fragment key={i}>
              {seg ? renderSegmentTokens(seg, "default", `seg-${i}`) : null}
              {i < blanksCount && (
                <TextInput
                  {...exerciseTextInputProps}
                  style={[
                    styles.blankInput,
                    result !== "idle" &&
                      (perBlank[i] ? styles.blankUnderlineOk : styles.blankUnderlineBad),
                  ]}
                  value={inputs[i] ?? ""}
                  onChangeText={(val) => {
                    setInputs((prev) => {
                      const next = [...prev]
                      next[i] = val
                      return next
                    })
                  }}
                  editable={result === "idle"}
                  placeholder=""
                  autoCapitalize="none"
                />
              )}
            </React.Fragment>
          ))}
        </View>
      )}
      <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
      {result !== "idle" && !assignmentMode && (
        <FeedbackBox
          correct={result === "correct"}
          correctAnswer={formatFillBlankCorrectAnswer(question)}
          explanation={question.explanation}
        />
      )}
    </>
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      controlWorkId={controlWorkId}
      stepIndex={stepIndex}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      questionPrompt={question.text}
      questionId={question.id}
      footer={actionRow}
    >
      {questionBody}
    </ExerciseScreenFrame>
  )
}

// ─── Multiple choice ─────────────────────────────────────────────────────────

function MultipleChoiceRunner(props: ExerciseRunnerProps) {
  const {
    exercise,
    homeworkId,
    controlWorkId,
    stepIndex,
    studentId,
    timeLimitMinutes,
    sessionStartedAt,
    elapsedSeconds,
    lockNavigation,
    onSessionEnd,
    savedAttempt,
  } = props
  const questions = exercise.content.questions ?? []
  const {
    index,
    setIndex,
    correctCount,
    setCorrectCount,
    mistakes,
    setMistakes,
    assignmentMode,
    advanceOrFinish,
  } = useHomeworkAssignmentState(homeworkId, controlWorkId, savedAttempt, questions.length)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [showHint, setShowHint] = useState(false)
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const question = questions[index] ?? null

  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    elapsedSeconds ?? 0,
    sessionStartedAt,
  )

  useEffect(() => {
    setSelected(null)
    setResult("idle")
    setShowHint(false)
  }, [index])

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || selected == null) return
    const isCorrect = selected === question.correctAnswer
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount
    const nextMistakes = isCorrect
      ? mistakes
      : [
          ...mistakes,
          {
            id: question.id,
            prompt: question.text,
            userAnswer: selected,
            correctAnswer: question.correctAnswer ?? "",
            explanation: question.explanation,
          },
        ]
    if (isCorrect) setCorrectCount(nextCorrect)
    else setMistakes(nextMistakes)
    if (
      advanceOrFinish(index, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      }, nextCorrect, nextMistakes)
    ) {
      return
    }
    setResult(isCorrect ? "correct" : "incorrect")
  }, [advanceOrFinish, correctCount, index, mistakes, question, questions.length, result, selected, setCorrectCount, setMistakes])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        correctCount={correctCount}
        total={questions.length}
        startedAt={sessionStartedAt}
        elapsedSeconds={elapsedSeconds}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        studentId={studentId}
        lockNavigation={lockNavigation}
        onSessionEnd={onSessionEnd}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  const options = question.options ?? []
  const renderedText = question.text.replace(GRAMMAR_BLANK_TOKEN, "_____")

  const actionRow = (
    <ActionRow
      result={result}
      canCheck={selected != null}
      isLast={index + 1 >= questions.length}
      onCheck={handleCheck}
      onNext={handleNext}
      variant={assignmentMode ? "homework" : "default"}
    />
  )

  const optionsBlock = (
    <View style={assignmentMode ? styles.homeworkMcOptions : styles.options}>
      {options.map((opt, optIndex) => {
        const isChosen = selected === opt
        const isCorrectOpt = opt === question.correctAnswer
        const checked = result !== "idle"
        return (
          <Pressable
            key={`${index}-opt-${optIndex}`}
            disabled={checked}
            onPress={() => setSelected(opt)}
            style={[
              assignmentMode ? styles.homeworkMcOption : styles.option,
              !checked && isChosen && (assignmentMode ? styles.homeworkOptionSelected : styles.optionSelected),
              checked && isCorrectOpt && styles.optionCorrect,
              checked && isChosen && !isCorrectOpt && styles.optionWrong,
            ]}
          >
            <Text style={assignmentMode ? styles.homeworkMcOptionText : styles.optionText}>{opt}</Text>
          </Pressable>
        )
      })}
    </View>
  )

  const questionBody = (
    <>
      {!assignmentMode ? <Text style={styles.qLabel}>Question {index + 1}</Text> : null}
      {assignmentMode ? (
        <>
          <HomeworkSourceCard source={renderedText} />
          {optionsBlock}
        </>
      ) : (
        <>
          <Text style={styles.questionText}>{renderedText}</Text>
          {optionsBlock}
        </>
      )}
      <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
      {result !== "idle" && !assignmentMode && (
        <FeedbackBox
          correct={result === "correct"}
          correctAnswer={question.correctAnswer ?? ""}
          explanation={question.explanation}
        />
      )}
    </>
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      controlWorkId={controlWorkId}
      stepIndex={stepIndex}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      questionPrompt={renderedText}
      questionId={question.id}
      footer={actionRow}
    >
      {questionBody}
    </ExerciseScreenFrame>
  )
}

// ─── True / False ────────────────────────────────────────────────────────────

function TrueFalseRunner(props: ExerciseRunnerProps) {
  const {
    exercise,
    homeworkId,
    controlWorkId,
    stepIndex,
    studentId,
    timeLimitMinutes,
    sessionStartedAt,
    elapsedSeconds,
    lockNavigation,
    onSessionEnd,
    savedAttempt,
  } = props
  const questions = exercise.content.questions ?? []
  const {
    index,
    setIndex,
    correctCount,
    setCorrectCount,
    mistakes,
    setMistakes,
    assignmentMode,
    advanceOrFinish,
  } = useHomeworkAssignmentState(homeworkId, controlWorkId, savedAttempt, questions.length)
  const [selected, setSelected] = useState<boolean | null>(null)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const question = questions[index] ?? null

  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    elapsedSeconds ?? 0,
    sessionStartedAt,
  )

  useEffect(() => {
    setSelected(null)
    setResult("idle")
  }, [index])

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || selected == null) return
    const isCorrect = selected === question.correctBool
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount
    const nextMistakes = isCorrect
      ? mistakes
      : [
          ...mistakes,
          {
            id: question.id,
            prompt: question.text,
            userAnswer: selected ? "Correct" : "Incorrect",
            correctAnswer: question.correctBool ? "Correct" : "Incorrect",
            explanation: question.explanation,
          },
        ]
    if (isCorrect) setCorrectCount(nextCorrect)
    else setMistakes(nextMistakes)
    if (
      advanceOrFinish(index, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      }, nextCorrect, nextMistakes)
    ) {
      return
    }
    setResult(isCorrect ? "correct" : "incorrect")
  }, [advanceOrFinish, correctCount, index, mistakes, question, questions.length, result, selected, setCorrectCount, setMistakes])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        correctCount={correctCount}
        total={questions.length}
        startedAt={sessionStartedAt}
        elapsedSeconds={elapsedSeconds}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        studentId={studentId}
        lockNavigation={lockNavigation}
        onSessionEnd={onSessionEnd}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  const actionRow = (
    <ActionRow
      result={result}
      canCheck={selected != null}
      isLast={index + 1 >= questions.length}
      onCheck={handleCheck}
      onNext={handleNext}
      variant={assignmentMode ? "homework" : "default"}
    />
  )

  const tfButtons = (
    <View style={assignmentMode ? styles.homeworkTfRow : styles.tfRow}>
      {[true, false].map((val) => (
        <Pressable
          key={String(val)}
          disabled={result !== "idle"}
          onPress={() => setSelected(val)}
          style={[
            assignmentMode ? styles.homeworkTfBtn : styles.tfBtn,
            selected === val && result === "idle" && (assignmentMode ? styles.homeworkOptionSelected : styles.optionSelected),
            result !== "idle" && val === question.correctBool && styles.optionCorrect,
            result !== "idle" && selected === val && val !== question.correctBool && styles.optionWrong,
          ]}
        >
          <Text style={assignmentMode ? styles.homeworkOptionText : styles.tfText}>
            {val ? "Correct" : "Incorrect"}
          </Text>
        </Pressable>
      ))}
    </View>
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      controlWorkId={controlWorkId}
      stepIndex={stepIndex}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      questionPrompt={question.text}
      questionId={question.id}
      footer={actionRow}
    >
      {!assignmentMode ? <Text style={styles.qLabel}>Question {index + 1}</Text> : null}
      {assignmentMode ? (
        <>
          <HomeworkSourceCard source={question.text} />
          {tfButtons}
        </>
      ) : (
        <>
          <Text style={styles.questionText}>{question.text}</Text>
          {tfButtons}
        </>
      )}
      {result !== "idle" && !assignmentMode && (
        <FeedbackBox
          correct={result === "correct"}
          correctAnswer={question.correctBool ? "Correct" : "Incorrect"}
          explanation={question.explanation}
        />
      )}
    </ExerciseScreenFrame>
  )
}

// ─── Text answer (word-formation / sentence-transformation) ──────────────────

function TextAnswerRunner(props: ExerciseRunnerProps) {
  const {
    exercise,
    homeworkId,
    controlWorkId,
    stepIndex,
    studentId,
    timeLimitMinutes,
    sessionStartedAt,
    elapsedSeconds,
    lockNavigation,
    onSessionEnd,
    savedAttempt,
  } = props
  const questions = exercise.content.questions ?? []
  const {
    index,
    setIndex,
    correctCount,
    setCorrectCount,
    mistakes,
    setMistakes,
    assignmentMode,
    advanceOrFinish,
  } = useHomeworkAssignmentState(homeworkId, controlWorkId, savedAttempt, questions.length)
  const [input, setInput] = useState("")
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [showHint, setShowHint] = useState(false)
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const question = questions[index] ?? null

  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    elapsedSeconds ?? 0,
    sessionStartedAt,
  )

  useEffect(() => {
    setInput("")
    setResult("idle")
    setShowHint(false)
  }, [index])

  const checkAnswer = (q: GrammarQuestion, ans: string) => {
    const accepted = [q.answer ?? "", ...(q.accepted ?? [])].filter(Boolean)
    const norm = normalizeAnswer(ans)
    return accepted.some((a) => normalizeAnswer(a) === norm)
  }

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || !input.trim()) return
    const isCorrect = checkAnswer(question, input)
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount
    const nextMistakes = isCorrect
      ? mistakes
      : [
          ...mistakes,
          {
            id: question.id,
            prompt: question.text,
            userAnswer: input.trim(),
            correctAnswer: question.answer ?? "",
            explanation: question.explanation,
          },
        ]
    if (isCorrect) setCorrectCount(nextCorrect)
    else setMistakes(nextMistakes)
    if (
      advanceOrFinish(index, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      }, nextCorrect, nextMistakes)
    ) {
      return
    }
    setResult(isCorrect ? "correct" : "incorrect")
  }, [advanceOrFinish, correctCount, index, input, mistakes, question, questions.length, result, setCorrectCount, setMistakes])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        correctCount={correctCount}
        total={questions.length}
        startedAt={sessionStartedAt}
        elapsedSeconds={elapsedSeconds}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        studentId={studentId}
        lockNavigation={lockNavigation}
        onSessionEnd={onSessionEnd}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  const actionRow = (
    <ActionRow
      result={result}
      canCheck={input.trim().length > 0}
      isLast={index + 1 >= questions.length}
      onCheck={handleCheck}
      onNext={handleNext}
      variant={assignmentMode ? "homework" : "default"}
    />
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      controlWorkId={controlWorkId}
      stepIndex={stepIndex}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      questionPrompt={question.text}
      questionId={question.id}
      footer={actionRow}
    >
      {!assignmentMode ? <Text style={styles.qLabel}>Question {index + 1}</Text> : null}
      {assignmentMode ? (
        <>
          <HomeworkSourceCard source={question.text} />
          <TextInput
            {...exerciseTextInputProps}
            style={[
              styles.homeworkTextInput,
              result !== "idle" && (result === "correct" ? styles.inputOk : styles.inputBad),
            ]}
            value={input}
            onChangeText={setInput}
            editable={result === "idle"}
            placeholder="Type your answer..."
            autoCapitalize="none"
          />
        </>
      ) : (
        <>
          <Text style={styles.questionText}>{question.text}</Text>
          <TextInput
            {...exerciseTextInputProps}
            style={[styles.textInput, result !== "idle" && (result === "correct" ? styles.inputOk : styles.inputBad)]}
            value={input}
            onChangeText={setInput}
            editable={result === "idle"}
            placeholder="Type your answer..."
            autoCapitalize="none"
          />
        </>
      )}
      <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
      {result !== "idle" && !assignmentMode && (
        <FeedbackBox
          correct={result === "correct"}
          correctAnswer={question.answer ?? ""}
          explanation={question.explanation}
        />
      )}
    </ExerciseScreenFrame>
  )
}

// ─── Matching ────────────────────────────────────────────────────────────────

function MatchingRunner(props: ExerciseRunnerProps) {
  const {
    exercise,
    homeworkId,
    controlWorkId,
    stepIndex,
    studentId,
    timeLimitMinutes,
    sessionStartedAt,
    elapsedSeconds,
    lockNavigation,
    onSessionEnd,
  } = props
  const assignmentMode = isAssignmentMode(homeworkId, controlWorkId)

  const pairs = exercise.content.pairs ?? []
  const [picks, setPicks] = useState<(string | null)[]>(() => pairs.map(() => null))
  const [checked, setChecked] = useState(false)
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    elapsedSeconds ?? 0,
    sessionStartedAt,
  )

  const options = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const p of pairs) {
      if (!seen.has(p.right)) {
        seen.add(p.right)
        out.push(p.right)
      }
    }
    return out
  }, [pairs])

  const total = pairs.length
  const allAnswered = picks.length === total && picks.every((p) => p != null)

  const correctCount = useMemo(
    () => pairs.reduce((acc, p, i) => acc + (picks[i] === p.right ? 1 : 0), 0),
    [pairs, picks],
  )

  const mistakes: ReviewItem[] = useMemo(
    () =>
      pairs
        .map((p, i) => ({ p, i }))
        .filter(({ p, i }) => picks[i] !== p.right)
        .map(({ p, i }) => ({
          id: i + 1,
          prompt: p.left,
          userAnswer: picks[i] ?? "—",
          correctAnswer: p.right,
          explanation: `${p.left} → ${p.right}`,
        })),
    [pairs, picks],
  )

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        correctCount={correctCount}
        total={total}
        startedAt={sessionStartedAt}
        elapsedSeconds={elapsedSeconds}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        studentId={studentId}
        lockNavigation={lockNavigation}
        onSessionEnd={onSessionEnd}
        timedOut={timedOut}
      />
    )
  }

  if (total === 0) return null

  const answeredCount = picks.filter((p) => p != null).length

  const matchFooter = !checked ? (
    <Pressable
      onPress={() => {
        if (assignmentMode) {
          setFinished(true)
          setFinishedAt(Date.now())
          return
        }
        setChecked(true)
      }}
      disabled={!allAnswered}
      style={[styles.homeworkBtn, !allAnswered && styles.btnDisabled]}
    >
      <Text style={styles.homeworkBtnText}>Next</Text>
    </Pressable>
  ) : (
    <Pressable
      onPress={() => {
        setFinished(true)
        setFinishedAt(Date.now())
      }}
      style={styles.homeworkBtn}
    >
      <Text style={styles.homeworkBtnText}>See results</Text>
    </Pressable>
  )

  const matchContent = (
    <>
      {!assignmentMode ? (
        <View style={styles.matchStatusRow}>
          <Text style={styles.matchStatusLabel}>Match all {total} pairs</Text>
          {checked ? (
            <Text style={styles.matchStatusScore}>
              <Text style={styles.matchStatusScoreValue}>{correctCount}</Text> / {total} correct
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={assignmentMode ? undefined : styles.card}>
        {pairs.map((pair, rowIndex) => {
          const pick = picks[rowIndex]
          const isRowCorrect = pick === pair.right

          return (
            <View
              key={`pair-${rowIndex}`}
              style={[
                styles.matchRow,
                checked && isRowCorrect && styles.matchRowCorrect,
                checked && !isRowCorrect && styles.matchRowWrong,
              ]}
            >
              <View style={styles.matchRowInner}>
                <Text style={styles.matchLeft}>{pair.left}</Text>
                <Text style={styles.matchArrow}>→</Text>
                <View style={styles.matchOptions}>
                  {options.map((opt, optIndex) => {
                    const isChosen = pick === opt
                    const isCorrectOpt = opt === pair.right
                    return (
                      <Pressable
                        key={`${rowIndex}-${optIndex}`}
                        disabled={checked}
                        onPress={() =>
                          setPicks((prev) => {
                            const next = [...prev]
                            next[rowIndex] = opt
                            return next
                          })
                        }
                        style={[
                          assignmentMode ? styles.homeworkMatchOption : styles.matchOption,
                          !checked && isChosen && (assignmentMode ? styles.homeworkOptionSelected : styles.matchOptionSelected),
                          checked && isChosen && isCorrectOpt && styles.matchOptionCorrect,
                          checked && isChosen && !isCorrectOpt && styles.matchOptionWrong,
                          checked && !isChosen && isCorrectOpt && styles.matchOptionReveal,
                          checked && !isChosen && !isCorrectOpt && styles.matchOptionMuted,
                        ]}
                      >
                        <Text
                          style={[
                            assignmentMode ? styles.homeworkOptionText : styles.matchOptionText,
                            checked && isChosen && !isCorrectOpt && styles.matchOptionTextWrong,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                {checked ? (
                  <Ionicons
                    name={isRowCorrect ? "checkmark-circle" : "close-circle"}
                    size={22}
                    color={isRowCorrect ? colors.success : colors.error}
                    style={styles.matchRowIcon}
                  />
                ) : null}
              </View>
            </View>
          )
        })}

        {!assignmentMode ? (
          !checked ? (
            <Pressable
              onPress={() => setChecked(true)}
              disabled={!allAnswered}
              style={[styles.matchCheckBtn, !allAnswered && styles.btnDisabled]}
            >
              <Text style={styles.matchCheckBtnText}>Check Answers</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setFinished(true)
                setFinishedAt(Date.now())
              }}
              style={styles.matchCheckBtn}
            >
              <Text style={styles.matchCheckBtnText}>See results</Text>
            </Pressable>
          )
        ) : null}
      </View>
    </>
  )

  if (assignmentMode) {
    const reportIssue = grammarIssueReport(exercise, {
      homeworkId,
      controlWorkId,
      stepIndex,
      questionIndex: answeredCount,
    })
    return (
      <HomeworkExerciseLayout
        index={answeredCount}
        total={total}
        instruction={homeworkInstructionForType("matching")}
        footer={matchFooter}
        reportIssue={reportIssue}
        secondsLeft={secondsLeft}
      >
        <HomeworkInstructions visible={assignmentMode} instructions={exercise.instructions} />
        {matchContent}
      </HomeworkExerciseLayout>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ExerciseHeader
        exercise={exercise}
        secondsLeft={secondsLeft}
        homeworkMode={false}
      />
      <HomeworkInstructions visible={assignmentMode} instructions={exercise.instructions} />
      {matchContent}
    </ScrollView>
  )
}

// ─── Word order ──────────────────────────────────────────────────────────────

function WordOrderRunner(props: ExerciseRunnerProps) {
  const {
    exercise,
    homeworkId,
    controlWorkId,
    stepIndex,
    studentId,
    timeLimitMinutes,
    sessionStartedAt,
    elapsedSeconds,
    lockNavigation,
    onSessionEnd,
    savedAttempt,
  } = props
  const questions = exercise.content.questions ?? []
  const {
    index,
    setIndex,
    correctCount,
    setCorrectCount,
    mistakes,
    setMistakes,
    assignmentMode,
    advanceOrFinish,
  } = useHomeworkAssignmentState(homeworkId, controlWorkId, savedAttempt, questions.length)
  const [picked, setPicked] = useState<{ word: string; bankIndex: number }[]>([])
  const [bankUsed, setBankUsed] = useState<boolean[]>([])
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const question = questions[index] ?? null
  const scrambled = question?.scrambled ?? []
  const remainingCount = bankUsed.filter((used) => !used).length
  const pickedWords = picked.map((item) => item.word)

  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    elapsedSeconds ?? 0,
    sessionStartedAt,
  )

  useEffect(() => {
    if (!question) return
    setBankUsed((question.scrambled ?? []).map(() => false))
    setPicked([])
    setResult("idle")
  }, [index, question])

  const handlePickFromBank = (bankIndex: number) => {
    if (result !== "idle" || bankUsed[bankIndex]) return
    const word = scrambled[bankIndex]
    setBankUsed((used) => {
      const next = [...used]
      next[bankIndex] = true
      return next
    })
    setPicked((items) => [...items, { word, bankIndex }])
  }

  const handleUnpick = (pickIndex: number) => {
    if (result !== "idle") return
    const item = picked[pickIndex]
    if (!item) return
    setBankUsed((used) => {
      const next = [...used]
      next[item.bankIndex] = false
      return next
    })
    setPicked((items) => items.filter((_, i) => i !== pickIndex))
  }

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || remainingCount > 0) return
    const correct = question.correct ?? []
    const alternates = question.alternates ?? []
    const isCorrect =
      JSON.stringify(pickedWords) === JSON.stringify(correct) ||
      alternates.some((alt) => JSON.stringify(pickedWords) === JSON.stringify(alt))
    const prefix = (question.prefix ?? []).join(" ")
    const suffix = (question.suffix ?? []).join(" ")
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount
    const nextMistakes = isCorrect
      ? mistakes
      : [
          ...mistakes,
          {
            id: question.id,
            prompt: question.text || "Arrange the words",
            userAnswer: [prefix, ...pickedWords, suffix].filter(Boolean).join(" "),
            correctAnswer: [prefix, ...correct, suffix].filter(Boolean).join(" "),
            explanation: question.explanation,
          },
        ]
    if (isCorrect) setCorrectCount(nextCorrect)
    else setMistakes(nextMistakes)
    if (
      advanceOrFinish(index, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      }, nextCorrect, nextMistakes)
    ) {
      return
    }
    setResult(isCorrect ? "correct" : "incorrect")
  }, [advanceOrFinish, correctCount, index, mistakes, pickedWords, question, questions.length, remainingCount, result, setCorrectCount, setMistakes])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        correctCount={correctCount}
        total={questions.length}
        startedAt={sessionStartedAt}
        elapsedSeconds={elapsedSeconds}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        studentId={studentId}
        lockNavigation={lockNavigation}
        onSessionEnd={onSessionEnd}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  const sourceText = [
    ...(question.prefix ?? []),
    question.text,
    ...(question.suffix ?? []),
  ]
    .filter(Boolean)
    .join(" ")

  const actionRow = (
    <ActionRow
      result={result}
      canCheck={remainingCount === 0 && picked.length > 0}
      isLast={index + 1 >= questions.length}
      onCheck={handleCheck}
      onNext={handleNext}
      variant={assignmentMode ? "homework" : "default"}
    />
  )

  const homeworkContent = (
    <>
      <HomeworkSourceCard source={sourceText || question.text}>
        {picked.length === 0 ? (
          <Text style={styles.homeworkPlaceholder}>Tap words below</Text>
        ) : (
          picked.map((item, i) => (
            <HomeworkWordChip
              key={`p-${item.bankIndex}-${i}`}
              label={item.word}
              onPress={() => handleUnpick(i)}
            />
          ))
        )}
      </HomeworkSourceCard>

      <View style={styles.homeworkWordBank}>
        {scrambled.map((word, bankIndex) =>
          bankUsed[bankIndex] ? (
            <HomeworkWordChip key={`slot-${bankIndex}`} empty />
          ) : (
            <HomeworkWordChip
              key={`bank-${bankIndex}-${word}`}
              label={word}
              onPress={() => handlePickFromBank(bankIndex)}
            />
          ),
        )}
      </View>

      {result !== "idle" && !assignmentMode ? (
        <FeedbackBox
          correct={result === "correct"}
          correctAnswer={(question.correct ?? []).join(" ")}
          explanation={question.explanation}
        />
      ) : null}
    </>
  )

  const defaultContent = (
    <>
      <Text style={styles.qLabel}>Question {index + 1} — Arrange the words</Text>
      {(question.prefix ?? []).length > 0 && (
        <Text style={styles.prefixText}>{question.prefix!.join(" ")}</Text>
      )}
      <View style={styles.wordOrderArea}>
        {picked.length === 0 ? (
          <Text style={styles.placeholder}>Tap words below to build the sentence</Text>
        ) : (
          picked.map((item, i) => (
            <Pressable
              key={`p-${item.bankIndex}-${i}`}
              onPress={() => handleUnpick(i)}
              style={styles.wordChip}
            >
              <Text>{item.word}</Text>
            </Pressable>
          ))
        )}
      </View>
      {(question.suffix ?? []).length > 0 && (
        <Text style={styles.prefixText}>{question.suffix!.join(" ")}</Text>
      )}
      <View style={styles.wordBank}>
        {scrambled.map((word, bankIndex) =>
          bankUsed[bankIndex] ? null : (
            <Pressable
              key={`r-${bankIndex}-${word}`}
              onPress={() => handlePickFromBank(bankIndex)}
              style={styles.wordChip}
            >
              <Text>{word}</Text>
            </Pressable>
          ),
        )}
      </View>
      {result !== "idle" && !assignmentMode && (
        <FeedbackBox
          correct={result === "correct"}
          correctAnswer={(question.correct ?? []).join(" ")}
          explanation={question.explanation}
        />
      )}
    </>
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      controlWorkId={controlWorkId}
      stepIndex={stepIndex}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      questionPrompt={sourceText || question.text}
      questionId={question.id}
      footer={actionRow}
    >
      {assignmentMode ? homeworkContent : defaultContent}
    </ExerciseScreenFrame>
  )
}

// ─── Error correction ────────────────────────────────────────────────────────

function ErrorCorrectionRunner(props: ExerciseRunnerProps) {
  const {
    exercise,
    homeworkId,
    controlWorkId,
    stepIndex,
    studentId,
    timeLimitMinutes,
    sessionStartedAt,
    elapsedSeconds,
    lockNavigation,
    onSessionEnd,
    savedAttempt,
  } = props
  const questions = exercise.content.questions ?? []
  const {
    index,
    setIndex,
    correctCount,
    setCorrectCount,
    mistakes,
    setMistakes,
    assignmentMode,
    advanceOrFinish,
  } = useHomeworkAssignmentState(homeworkId, controlWorkId, savedAttempt, questions.length)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const question = questions[index] ?? null

  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    elapsedSeconds ?? 0,
    sessionStartedAt,
  )

  useEffect(() => {
    setEdits({})
    setEditingId(null)
    setResult("idle")
  }, [index])

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle") return
    const segments = question.segments ?? []
    let allCorrect = true
    for (const seg of segments) {
      if (!seg.correctText) continue
      const userVal = normalizeAnswer(edits[seg.id] ?? seg.text)
      const accepted = [seg.correctText, ...(seg.acceptableText ?? [])].map(normalizeAnswer)
      if (!accepted.includes(userVal)) allCorrect = false
    }
    const nextCorrect = allCorrect ? correctCount + 1 : correctCount
    const nextMistakes = allCorrect
      ? mistakes
      : [
          ...mistakes,
          {
            id: question.id,
            prompt: question.text || segments.map((s) => s.text).join(""),
            userAnswer: segments.map((s) => edits[s.id] ?? s.text).join(""),
            correctAnswer: segments.map((s) => s.correctText ?? s.text).join(""),
            explanation: question.explanation,
          },
        ]
    if (allCorrect) setCorrectCount(nextCorrect)
    else setMistakes(nextMistakes)
    if (
      advanceOrFinish(index, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      }, nextCorrect, nextMistakes)
    ) {
      return
    }
    setResult(allCorrect ? "correct" : "incorrect")
  }, [advanceOrFinish, correctCount, edits, index, mistakes, question, questions.length, result, setCorrectCount, setMistakes])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        correctCount={correctCount}
        total={questions.length}
        startedAt={sessionStartedAt}
        elapsedSeconds={elapsedSeconds}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        studentId={studentId}
        lockNavigation={lockNavigation}
        onSessionEnd={onSessionEnd}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  const segments = question.segments ?? []

  const actionRow = (
    <ActionRow
      result={result}
      canCheck={true}
      isLast={index + 1 >= questions.length}
      onCheck={handleCheck}
      onNext={handleNext}
      variant={assignmentMode ? "homework" : "default"}
    />
  )

  const errorContent = (
    <>
      {!assignmentMode ? (
        <>
          <Text style={styles.qLabel}>Question {index + 1} — Fix the errors</Text>
          <Text style={styles.instructionHint}>Tap highlighted words to edit them</Text>
        </>
      ) : null}
      {assignmentMode ? (
        <HomeworkSourceCard source="Fix the highlighted words">
          <View style={styles.homeworkErrorRow}>
            {segments.map((seg) => {
              const isEditable = !!seg.correctText
              const display = edits[seg.id] ?? seg.text
              const isEditing = editingId === seg.id
              return (
                <React.Fragment key={seg.id}>
                  {isEditing ? (
                    <TextInput
                      {...exerciseTextInputProps}
                      style={styles.homeworkErrorInput}
                      value={edits[seg.id] ?? seg.text}
                      onChangeText={(t) => setEdits((e) => ({ ...e, [seg.id]: t }))}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                    />
                  ) : (
                    <Pressable
                      onPress={() => isEditable && result === "idle" && setEditingId(seg.id)}
                      style={[styles.errorSegment, isEditable && styles.homeworkErrorSegment]}
                    >
                      <Text style={styles.homeworkErrorText}>{display}</Text>
                    </Pressable>
                  )}
                  {seg.after ? <Text style={styles.homeworkErrorText}>{seg.after}</Text> : null}
                </React.Fragment>
              )
            })}
          </View>
        </HomeworkSourceCard>
      ) : (
        <View style={styles.errorRow}>
          {segments.map((seg) => {
            const isEditable = !!seg.correctText
            const display = edits[seg.id] ?? seg.text
            const isEditing = editingId === seg.id
            return (
              <React.Fragment key={seg.id}>
                {isEditing ? (
                  <TextInput
                    {...exerciseTextInputProps}
                    style={styles.errorInput}
                    value={edits[seg.id] ?? seg.text}
                    onChangeText={(t) => setEdits((e) => ({ ...e, [seg.id]: t }))}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                  />
                ) : (
                  <Pressable
                    onPress={() => isEditable && result === "idle" && setEditingId(seg.id)}
                    style={[styles.errorSegment, isEditable && styles.errorSegmentEditable]}
                  >
                    <Text>{display}</Text>
                  </Pressable>
                )}
                {seg.after ? <Text>{seg.after}</Text> : null}
              </React.Fragment>
            )
          })}
        </View>
      )}
      {result !== "idle" && !assignmentMode && (
        <FeedbackBox
          correct={result === "correct"}
          correctAnswer=""
          explanation={question.explanation}
        />
      )}
    </>
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      controlWorkId={controlWorkId}
      stepIndex={stepIndex}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      questionPrompt={segments.map((s) => s.text).join("")}
      questionId={question.id}
      footer={actionRow}
    >
      {errorContent}
    </ExerciseScreenFrame>
  )
}

// ─── Mixed type runner (heterogeneous question sequence) ─────────────────────

function MixedTypeRunner(props: ExerciseRunnerProps) {
  const {
    exercise,
    homeworkId,
    controlWorkId,
    stepIndex,
    studentId,
    timeLimitMinutes,
    sessionStartedAt,
    elapsedSeconds,
    lockNavigation,
    onSessionEnd,
    savedAttempt,
  } = props
  const questions = exercise.content.questions ?? []
  const {
    index,
    setIndex,
    correctCount,
    setCorrectCount,
    mistakes,
    setMistakes,
    assignmentMode,
    advanceOrFinish,
  } = useHomeworkAssignmentState(homeworkId, controlWorkId, savedAttempt, questions.length)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [showHint, setShowHint] = useState(false)
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const [fillInputs, setFillInputs] = useState<string[]>([])
  const [fillPerBlank, setFillPerBlank] = useState<boolean[]>([])
  const [mcSelected, setMcSelected] = useState<string | null>(null)
  const [tfSelected, setTfSelected] = useState<boolean | null>(null)
  const [ecEdits, setEcEdits] = useState<Record<string, string>>({})
  const [ecEditingId, setEcEditingId] = useState<string | null>(null)

  const question = questions[index] ?? null
  const questionType = question
    ? resolveQuestionType(question, exercise.type)
    : null

  const fillSegments = useMemo(() => {
    if (!question || questionType !== "fill-in-the-blank") return [] as string[]
    return question.text.split(GRAMMAR_BLANK_TOKEN)
  }, [question, questionType])

  const fillBlanksCount = Math.max(fillSegments.length - 1, 0)

  const renderSegmentTokens = (seg: string, variant: "default" | "homework", keyPrefix: string) => {
    const tokens = seg.split(/(\s+)/).filter((t) => t.length > 0)
    const style = variant === "homework" ? styles.homeworkSentenceToken : styles.sentenceToken
    return tokens.map((token, idx) => (
      <Text key={`${keyPrefix}-${idx}`} style={style}>
        {token}
      </Text>
    ))
  }

  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    elapsedSeconds ?? 0,
    sessionStartedAt,
  )

  useEffect(() => {
    setResult("idle")
    setShowHint(false)
    setMcSelected(null)
    setTfSelected(null)
    setEcEdits({})
    setEcEditingId(null)

    if (!question || questionType !== "fill-in-the-blank") {
      setFillInputs([])
      setFillPerBlank([])
      return
    }

    const segs = question.text.split(GRAMMAR_BLANK_TOKEN)
    const blanksCount = Math.max(segs.length - 1, 0)
    setFillInputs(Array.from({ length: blanksCount }, () => ""))
    setFillPerBlank([])
  }, [index, question, questionType])

  const fillAllFilled =
    fillInputs.length > 0 && fillInputs.every((v) => v.trim().length > 0)

  const canCheck = useMemo(() => {
    if (!question || !questionType) return false
    switch (questionType) {
      case "fill-in-the-blank":
        return fillAllFilled
      case "multiple-choice":
        return mcSelected != null
      case "true-false":
        return tfSelected != null
      case "error-correction":
        return true
      default:
        return false
    }
  }, [question, questionType, fillAllFilled, mcSelected, tfSelected])

  const handleCheck = useCallback(() => {
    if (!question || !questionType || result !== "idle" || !canCheck) return

    let isCorrect = false
    let userAnswer = ""
    let correctAnswer = ""

    switch (questionType) {
      case "fill-in-the-blank": {
        const checks = fillInputs.map((val, i) =>
          isBlankCorrect(val, getAcceptableAnswersForBlank(question, i)),
        )
        isCorrect = checks.every(Boolean)
        setFillPerBlank(checks)
        userAnswer = fillInputs.map((s) => s.trim()).filter(Boolean).join(" / ")
        correctAnswer = formatFillBlankCorrectAnswer(question)
        break
      }
      case "multiple-choice": {
        isCorrect = mcSelected === question.correctAnswer
        userAnswer = mcSelected ?? ""
        correctAnswer = question.correctAnswer ?? ""
        break
      }
      case "true-false": {
        isCorrect = tfSelected === question.correctBool
        userAnswer = tfSelected ? "Correct" : "Incorrect"
        correctAnswer = question.correctBool ? "Correct" : "Incorrect"
        break
      }
      case "error-correction": {
        const segments = question.segments ?? []
        let allCorrect = true
        for (const seg of segments) {
          if (!seg.correctText) continue
          const userVal = normalizeAnswer(ecEdits[seg.id] ?? seg.text)
          const accepted = [seg.correctText, ...(seg.acceptableText ?? [])].map(normalizeAnswer)
          if (!accepted.includes(userVal)) allCorrect = false
        }
        isCorrect = allCorrect
        setEcEditingId(null)
        userAnswer = segments.map((s) => ecEdits[s.id] ?? s.text).join("")
        correctAnswer = segments.map((s) => s.correctText ?? s.text).join("")
        break
      }
    }

    const nextCorrect = isCorrect ? correctCount + 1 : correctCount
    const nextMistakes = isCorrect
      ? mistakes
      : [
          ...mistakes,
          {
            id: question.id,
            prompt: question.text,
            userAnswer,
            correctAnswer,
            explanation: question.explanation,
          },
        ]
    if (isCorrect) setCorrectCount(nextCorrect)
    else setMistakes(nextMistakes)
    if (
      advanceOrFinish(index, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      }, nextCorrect, nextMistakes)
    ) {
      return
    }
    setResult(isCorrect ? "correct" : "incorrect")
  }, [
    advanceOrFinish,
    canCheck,
    correctCount,
    ecEdits,
    fillInputs,
    index,
    mcSelected,
    mistakes,
    question,
    questionType,
    questions.length,
    result,
    setCorrectCount,
    setMistakes,
    tfSelected,
  ])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        correctCount={correctCount}
        total={questions.length}
        startedAt={sessionStartedAt}
        elapsedSeconds={elapsedSeconds}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        controlWorkId={controlWorkId}
        stepIndex={stepIndex}
        studentId={studentId}
        lockNavigation={lockNavigation}
        onSessionEnd={onSessionEnd}
        timedOut={timedOut}
      />
    )
  }
  if (!question || !questionType) return null

  const renderedMcText = question.text.replace(GRAMMAR_BLANK_TOKEN, "_____")
  const ecSegments = question.segments ?? []

  let feedbackCorrectAnswer = ""
  if (questionType === "fill-in-the-blank") {
    feedbackCorrectAnswer = formatFillBlankCorrectAnswer(question)
  } else if (questionType === "multiple-choice") {
    feedbackCorrectAnswer = question.correctAnswer ?? ""
  } else if (questionType === "true-false") {
    feedbackCorrectAnswer = question.correctBool ? "Correct" : "Incorrect"
  }

  const questionPrompt =
    questionType === "multiple-choice"
      ? renderedMcText
      : questionType === "error-correction"
        ? ecSegments.map((s) => s.text).join("")
        : question.text

  const actionRow = (
    <ActionRow
      result={result}
      canCheck={canCheck}
      isLast={index + 1 >= questions.length}
      onCheck={handleCheck}
      onNext={handleNext}
      variant={assignmentMode ? "homework" : "default"}
    />
  )

  const questionBody = (
    <>
      {!assignmentMode ? <Text style={styles.qLabel}>Question {index + 1}</Text> : null}

      {questionType === "fill-in-the-blank" && (
        <>
          {assignmentMode ? (
            <HomeworkSourceCard>
              <View style={styles.homeworkBlankRow}>
                {fillSegments.map((seg, i) => (
                  <React.Fragment key={i}>
                    {seg ? renderSegmentTokens(seg, "homework", `hseg-${i}`) : null}
                    {i < fillBlanksCount && (
                      <View collapsable={false}>
                        <TextInput
                          {...exerciseTextInputProps}
                          style={[
                            styles.homeworkBlankInput,
                            result !== "idle" &&
                              (fillPerBlank[i] ? styles.blankUnderlineOk : styles.blankUnderlineBad),
                          ]}
                          value={fillInputs[i] ?? ""}
                          onChangeText={(val) => {
                            setFillInputs((prev) => {
                              const next = [...prev]
                              next[i] = val
                              return next
                            })
                          }}
                          editable={result === "idle"}
                          placeholder=""
                          autoCapitalize="none"
                        />
                      </View>
                    )}
                  </React.Fragment>
                ))}
              </View>
            </HomeworkSourceCard>
          ) : (
            <View style={styles.blankRow}>
              {fillSegments.map((seg, i) => (
                <React.Fragment key={i}>
                  {seg ? renderSegmentTokens(seg, "default", `seg-${i}`) : null}
                  {i < fillBlanksCount && (
                    <TextInput
                      {...exerciseTextInputProps}
                      style={[
                        styles.blankInput,
                        result !== "idle" &&
                          (fillPerBlank[i] ? styles.blankUnderlineOk : styles.blankUnderlineBad),
                      ]}
                      value={fillInputs[i] ?? ""}
                      onChangeText={(val) => {
                        setFillInputs((prev) => {
                          const next = [...prev]
                          next[i] = val
                          return next
                        })
                      }}
                      editable={result === "idle"}
                      placeholder=""
                      autoCapitalize="none"
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
        </>
      )}

      {questionType === "multiple-choice" && (
        <>
          {assignmentMode ? (
            <>
              <HomeworkSourceCard source={renderedMcText} />
              <View style={styles.homeworkMcOptions}>
                {(question.options ?? []).map((opt, optIndex) => {
                  const isChosen = mcSelected === opt
                  const isCorrectOpt = opt === question.correctAnswer
                  const checked = result !== "idle"
                  return (
                    <Pressable
                      key={`${index}-opt-${optIndex}`}
                      disabled={checked}
                      onPress={() => setMcSelected(opt)}
                      style={[
                        styles.homeworkMcOption,
                        !checked && isChosen && styles.homeworkOptionSelected,
                        checked && isCorrectOpt && styles.optionCorrect,
                        checked && isChosen && !isCorrectOpt && styles.optionWrong,
                      ]}
                    >
                      <Text style={styles.homeworkMcOptionText}>{opt}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.questionText}>{renderedMcText}</Text>
              <View style={styles.options}>
                {(question.options ?? []).map((opt, optIndex) => {
                  const isChosen = mcSelected === opt
                  const isCorrectOpt = opt === question.correctAnswer
                  const checked = result !== "idle"
                  return (
                    <Pressable
                      key={`${index}-opt-${optIndex}`}
                      disabled={checked}
                      onPress={() => setMcSelected(opt)}
                      style={[
                        styles.option,
                        !checked && isChosen && styles.optionSelected,
                        checked && isCorrectOpt && styles.optionCorrect,
                        checked && isChosen && !isCorrectOpt && styles.optionWrong,
                      ]}
                    >
                      <Text style={styles.optionText}>{opt}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </>
          )}
        </>
      )}

      {questionType === "true-false" && (
        <>
          {assignmentMode ? (
            <>
              <HomeworkSourceCard source={question.text} />
              <View style={styles.homeworkTfRow}>
                {[true, false].map((val) => (
                  <Pressable
                    key={String(val)}
                    disabled={result !== "idle"}
                    onPress={() => setTfSelected(val)}
                    style={[
                      styles.homeworkTfBtn,
                      tfSelected === val && result === "idle" && styles.homeworkOptionSelected,
                      result !== "idle" && val === question.correctBool && styles.optionCorrect,
                      result !== "idle" &&
                        tfSelected === val &&
                        val !== question.correctBool &&
                        styles.optionWrong,
                    ]}
                  >
                    <Text style={styles.homeworkOptionText}>
                      {val ? "Correct" : "Incorrect"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.questionText}>{question.text}</Text>
              <View style={styles.tfRow}>
                {[true, false].map((val) => (
                  <Pressable
                    key={String(val)}
                    disabled={result !== "idle"}
                    onPress={() => setTfSelected(val)}
                    style={[
                      styles.tfBtn,
                      tfSelected === val && result === "idle" && styles.optionSelected,
                      result !== "idle" && val === question.correctBool && styles.optionCorrect,
                      result !== "idle" &&
                        tfSelected === val &&
                        val !== question.correctBool &&
                        styles.optionWrong,
                    ]}
                  >
                    <Text style={styles.tfText}>{val ? "Correct" : "Incorrect"}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </>
      )}

      {questionType === "error-correction" && (
        <>
          {!assignmentMode ? (
            <Text style={styles.instructionHint}>Tap highlighted words to edit them</Text>
          ) : null}
          {assignmentMode ? (
            <HomeworkSourceCard source="Fix the highlighted words">
              <View style={styles.homeworkErrorRow}>
                {ecSegments.map((seg) => {
                  const isEditable = !!seg.correctText
                  const display = ecEdits[seg.id] ?? seg.text
                  const isEditing = ecEditingId === seg.id
                  return (
                    <React.Fragment key={seg.id}>
                      {isEditing ? (
                        <TextInput
                          {...exerciseTextInputProps}
                          style={styles.homeworkErrorInput}
                          value={ecEdits[seg.id] ?? seg.text}
                          onChangeText={(t) => setEcEdits((e) => ({ ...e, [seg.id]: t }))}
                          onBlur={() => setEcEditingId(null)}
                          autoFocus
                        />
                      ) : (
                        <Pressable
                          onPress={() => isEditable && result === "idle" && setEcEditingId(seg.id)}
                          style={[styles.errorSegment, isEditable && styles.homeworkErrorSegment]}
                        >
                          <Text style={styles.homeworkErrorText}>{display}</Text>
                        </Pressable>
                      )}
                      {seg.after ? <Text style={styles.homeworkErrorText}>{seg.after}</Text> : null}
                    </React.Fragment>
                  )
                })}
              </View>
            </HomeworkSourceCard>
          ) : (
            <View style={styles.errorRow}>
              {ecSegments.map((seg) => {
                const isEditable = !!seg.correctText
                const display = ecEdits[seg.id] ?? seg.text
                const isEditing = ecEditingId === seg.id
                return (
                  <React.Fragment key={seg.id}>
                    {isEditing ? (
                      <TextInput
                        {...exerciseTextInputProps}
                        style={styles.errorInput}
                        value={ecEdits[seg.id] ?? seg.text}
                        onChangeText={(t) => setEcEdits((e) => ({ ...e, [seg.id]: t }))}
                        onBlur={() => setEcEditingId(null)}
                        autoFocus
                      />
                    ) : (
                      <Pressable
                        onPress={() => isEditable && result === "idle" && setEcEditingId(seg.id)}
                        style={[styles.errorSegment, isEditable && styles.errorSegmentEditable]}
                      >
                        <Text>{display}</Text>
                      </Pressable>
                    )}
                    {seg.after ? <Text>{seg.after}</Text> : null}
                  </React.Fragment>
                )
              })}
            </View>
          )}
        </>
      )}

      {(questionType === "fill-in-the-blank" ||
        questionType === "multiple-choice" ||
        questionType === "error-correction") && (
        <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
      )}
      {result !== "idle" && !assignmentMode && (
        <FeedbackBox
          correct={result === "correct"}
          correctAnswer={feedbackCorrectAnswer}
          explanation={question.explanation}
        />
      )}
    </>
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      controlWorkId={controlWorkId}
      stepIndex={stepIndex}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      questionPrompt={questionPrompt}
      questionId={question.id}
      instructionType={questionType}
      footer={actionRow}
    >
      {questionBody}
    </ExerciseScreenFrame>
  )
}

// ─── Main switch ─────────────────────────────────────────────────────────────

export function ExerciseRunner(props: ExerciseRunnerProps & { exercise: GrammarExercise }) {
  const { exercise } = props
  const questions = exercise.content.questions ?? []
  const questionTypes = new Set(
    questions.map((q) => resolveQuestionType(q, exercise.type)),
  )
  const useMixed = exercise.type === "mixed" || questionTypes.size > 1

  if (useMixed) {
    return <MixedTypeRunner {...props} />
  }

  switch (exercise.type) {
    case "multiple-choice":
      return <MultipleChoiceRunner {...props} />
    case "matching":
      return <MatchingRunner {...props} />
    case "true-false":
      return <TrueFalseRunner {...props} />
    case "word-formation":
    case "sentence-transformation":
      return <TextAnswerRunner {...props} />
    case "error-correction":
      return <ErrorCorrectionRunner {...props} />
    case "word-order":
      return <WordOrderRunner {...props} />
    case "speaking":
      return <SpeakingRunner {...props} />
    default:
      return <FillBlankRunner {...props} />
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  headerMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  timer: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerUrgent: { backgroundColor: colors.errorBg },
  timerText: { fontSize: 14, fontWeight: "700", color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  qLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  questionText: { fontSize: 17, lineHeight: 26, color: colors.text, marginBottom: 16 },
  sentenceText: { fontSize: 17, lineHeight: 28, color: colors.text },
  blankRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  blankInput: {
    borderWidth: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: "#FBBF24",
    borderRadius: 0,
    paddingHorizontal: 2,
    paddingVertical: 0,
    minWidth: 56,
    minHeight: 28,
    height: 28,
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
    marginHorizontal: 2,
    marginVertical: 2,
    backgroundColor: "transparent",
    maxWidth: "55%",
    alignSelf: "baseline",
    textAlignVertical: "center",
    includeFontPadding: false,
    flexShrink: 1,
    transform: [{ translateY: -2 }],
  },
  inputOk: { borderColor: colors.success, backgroundColor: colors.successBg },
  inputBad: { borderColor: colors.error, backgroundColor: colors.errorBg },
  options: { gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.card,
  },
  optionSelected: { borderColor: colors.indigo, backgroundColor: "#EEF2FF" },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.error, backgroundColor: colors.errorBg },
  optionText: { fontSize: 16, color: colors.text },
  tfRow: { flexDirection: "row", gap: 12 },
  tfBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  tfText: { fontSize: 16, fontWeight: "600", color: colors.text },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    backgroundColor: "#FAFAFA",
  },
  prefixText: { fontSize: 16, color: colors.textSecondary, marginBottom: 8 },
  wordOrderArea: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  placeholder: { color: colors.textMuted, fontSize: 14 },
  wordBank: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  wordChip: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  instructionHint: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  errorRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  errorSegment: { paddingHorizontal: 2 },
  errorSegmentEditable: {
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  errorInput: {
    borderWidth: 1,
    borderColor: colors.indigo,
    borderRadius: 6,
    padding: 4,
    minWidth: 60,
    minHeight: 36,
    fontSize: 16,
    color: colors.text,
  },
  matchStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  matchStatusLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  matchStatusScore: { fontSize: 13, color: colors.textSecondary },
  matchStatusScoreValue: { fontWeight: "700", color: colors.text },
  instructionsBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  instructionsLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#1D4ED8",
  },
  instructionsText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
    lineHeight: 20,
  },
  matchRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  matchRowCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  matchRowWrong: {
    borderColor: colors.errorBg,
    backgroundColor: colors.errorBg,
  },
  matchRowInner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  matchLeft: {
    minWidth: 40,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  matchArrow: { fontSize: 16, color: colors.textMuted },
  matchOptions: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 120,
  },
  matchOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  matchOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  matchOptionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  matchOptionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  matchOptionReveal: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  matchOptionMuted: {
    borderColor: colors.borderLight,
    opacity: 0.7,
  },
  matchOptionText: { fontSize: 14, fontWeight: "600", color: colors.text },
  matchOptionTextWrong: { textDecorationLine: "line-through" },
  matchRowIcon: { marginLeft: "auto" },
  matchCheckBtn: {
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    minWidth: 180,
    alignItems: "center",
  },
  matchCheckBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.45 },
  homeworkPlaceholder: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: "500",
  },
  homeworkWordBank: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  homeworkBlankRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 2,
  },
  homeworkBlankInput: {
    borderWidth: 0,
    borderBottomWidth: 1.75,
    borderBottomColor: "#F59E0B",
    borderRadius: 0,
    paddingHorizontal: 2,
    paddingVertical: 0,
    minWidth: 52,
    minHeight: 28,
    height: 28,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: colors.text,
    backgroundColor: "transparent",
    maxWidth: "55%",
    alignSelf: "baseline",
    textAlignVertical: "center",
    includeFontPadding: false,
    flexShrink: 1,
    transform: [{ translateY: -2 }],
  },
  blankUnderlineOk: {
    borderBottomColor: colors.success,
  },
  blankUnderlineBad: {
    borderBottomColor: colors.error,
  },
  sentenceToken: {
    fontSize: 17,
    lineHeight: 28,
    color: colors.text,
    flexShrink: 1,
  },
  homeworkSentenceToken: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
    fontWeight: "600",
    flexShrink: 1,
  },
  homeworkTextInput: {
    alignSelf: "stretch",
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    backgroundColor: "#FFFFFF",
    marginTop: spacing.md,
  },
  homeworkMcOptions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  homeworkMcOption: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    width: "100%",
  },
  homeworkMcOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 22,
  },
  homeworkOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  homeworkOption: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  homeworkOptionSelected: {
    borderColor: colors.brand,
    backgroundColor: "#E8F6FF",
  },
  homeworkOptionText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  homeworkTfRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  homeworkTfBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
  homeworkBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  homeworkErrorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 2,
  },
  homeworkErrorSegment: {
    backgroundColor: "#FFF4CC",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  homeworkErrorText: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
    fontWeight: "600",
  },
  homeworkErrorInput: {
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 72,
    minHeight: 36,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  homeworkMatchOption: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
})
