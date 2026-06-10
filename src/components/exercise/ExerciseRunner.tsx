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
} from "../homework/HomeworkExerciseLayout"
import {
  ActionRow,
  FeedbackBox,
  HintRow,
  ProgressBar,
  ResultsScreen,
  type ReviewItem,
} from "./shared"
import { colors, radius, spacing } from "../../theme/tokens"

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
  homeworkId,
  instructions,
}: {
  homeworkId?: string
  instructions?: string
}) {
  const [open, setOpen] = useState(false)

  if (!homeworkId || !instructions?.trim()) return null

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

function applyHomeworkAdvance(
  homeworkId: string | undefined,
  index: number,
  total: number,
  setIndex: React.Dispatch<React.SetStateAction<number>>,
  finish: () => void,
): boolean {
  if (!homeworkId) return false
  if (index + 1 >= total) finish()
  else setIndex((i) => i + 1)
  return true
}

function ExerciseScreenFrame({
  homeworkId,
  exercise,
  index,
  total,
  correctCount,
  secondsLeft,
  questionInstruction,
  children,
  footer,
}: {
  homeworkId?: string
  exercise: GrammarExercise
  index: number
  total: number
  correctCount: number
  secondsLeft: number | null
  questionInstruction?: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  const instruction =
    questionInstruction?.trim() || homeworkInstructionForType(exercise.type)

  if (homeworkId) {
    return (
      <HomeworkExerciseLayout
        index={index}
        total={total}
        instruction={instruction}
        footer={footer}
      >
        <HomeworkInstructions homeworkId={homeworkId} instructions={exercise.instructions} />
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
      <HomeworkInstructions homeworkId={homeworkId} instructions={exercise.instructions} />
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
  } = props
  const [index, setIndex] = useState(0)
  const [inputs, setInputs] = useState<string[]>([])
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [perBlank, setPerBlank] = useState<boolean[]>([])
  const [showHint, setShowHint] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const questions = exercise.content.questions ?? []
  const question = questions[index] ?? null
  const segments = useMemo(
    () => (question ? question.text.split(GRAMMAR_BLANK_TOKEN) : []),
    [question],
  )
  const blanksCount = Math.max(segments.length - 1, 0)

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
      isBlankCorrect(val, question.acceptableAnswers?.[i] ?? []),
    )
    const allCorrect = checks.every(Boolean)
    if (allCorrect) setCorrectCount((c) => c + 1)
    else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text,
          userAnswer: inputs.map((s) => s.trim()).filter(Boolean).join(" / "),
          correctAnswer: question.blanks?.join(" / ") ?? "",
          explanation: question.explanation,
        },
      ])
    }
    if (
      applyHomeworkAdvance(homeworkId, index, questions.length, setIndex, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      })
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
      variant={homeworkId ? "homework" : "default"}
    />
  )

  const questionBody = (
    <>
      {!homeworkId ? <Text style={styles.qLabel}>Question {index + 1}</Text> : null}
      {homeworkId ? (
        <HomeworkSourceCard source={question.text}>
          <View style={styles.homeworkBlankRow}>
            {segments.map((seg, i) => (
              <React.Fragment key={i}>
                {seg ? <Text style={styles.homeworkSentenceText}>{seg}</Text> : null}
                {i < blanksCount && (
                  <TextInput
                    style={[
                      styles.homeworkBlankInput,
                      result !== "idle" && (perBlank[i] ? styles.inputOk : styles.inputBad),
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
                    placeholder="..."
                    autoCapitalize="none"
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </HomeworkSourceCard>
      ) : (
        <View style={styles.blankRow}>
          {segments.map((seg, i) => (
            <React.Fragment key={i}>
              {seg ? <Text style={styles.sentenceText}>{seg}</Text> : null}
              {i < blanksCount && (
                <TextInput
                  style={[
                    styles.blankInput,
                    result !== "idle" && (perBlank[i] ? styles.inputOk : styles.inputBad),
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
                  placeholder="..."
                  autoCapitalize="none"
                />
              )}
            </React.Fragment>
          ))}
        </View>
      )}
      <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
      {result !== "idle" && !homeworkId && (
        <FeedbackBox
          correct={result === "correct"}
          correctAnswer={question.blanks?.join(" / ") ?? ""}
          explanation={question.explanation}
        />
      )}
    </>
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
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
  } = props
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [showHint, setShowHint] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const questions = exercise.content.questions ?? []
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
    if (isCorrect) setCorrectCount((c) => c + 1)
    else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text,
          userAnswer: selected,
          correctAnswer: question.correctAnswer ?? "",
          explanation: question.explanation,
        },
      ])
    }
    if (
      applyHomeworkAdvance(homeworkId, index, questions.length, setIndex, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      })
    ) {
      return
    }
    setResult(isCorrect ? "correct" : "incorrect")
  }, [homeworkId, index, question, questions.length, result, selected])

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
      variant={homeworkId ? "homework" : "default"}
    />
  )

  const optionsBlock = (
    <View style={homeworkId ? styles.homeworkMcOptions : styles.options}>
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
              homeworkId ? styles.homeworkMcOption : styles.option,
              !checked && isChosen && (homeworkId ? styles.homeworkOptionSelected : styles.optionSelected),
              checked && isCorrectOpt && styles.optionCorrect,
              checked && isChosen && !isCorrectOpt && styles.optionWrong,
            ]}
          >
            <Text style={homeworkId ? styles.homeworkMcOptionText : styles.optionText}>{opt}</Text>
          </Pressable>
        )
      })}
    </View>
  )

  const questionBody = (
    <>
      {!homeworkId ? <Text style={styles.qLabel}>Question {index + 1}</Text> : null}
      {homeworkId ? (
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
      {result !== "idle" && !homeworkId && (
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
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
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
  } = props
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<boolean | null>(null)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const questions = exercise.content.questions ?? []
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
    if (isCorrect) setCorrectCount((c) => c + 1)
    else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text,
          userAnswer: selected ? "Correct" : "Incorrect",
          correctAnswer: question.correctBool ? "Correct" : "Incorrect",
          explanation: question.explanation,
        },
      ])
    }
    if (
      applyHomeworkAdvance(homeworkId, index, questions.length, setIndex, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      })
    ) {
      return
    }
    setResult(isCorrect ? "correct" : "incorrect")
  }, [homeworkId, index, question, questions.length, result, selected])

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
      variant={homeworkId ? "homework" : "default"}
    />
  )

  const tfButtons = (
    <View style={homeworkId ? styles.homeworkTfRow : styles.tfRow}>
      {[true, false].map((val) => (
        <Pressable
          key={String(val)}
          disabled={result !== "idle"}
          onPress={() => setSelected(val)}
          style={[
            homeworkId ? styles.homeworkTfBtn : styles.tfBtn,
            selected === val && result === "idle" && (homeworkId ? styles.homeworkOptionSelected : styles.optionSelected),
            result !== "idle" && val === question.correctBool && styles.optionCorrect,
            result !== "idle" && selected === val && val !== question.correctBool && styles.optionWrong,
          ]}
        >
          <Text style={homeworkId ? styles.homeworkOptionText : styles.tfText}>
            {val ? "Correct" : "Incorrect"}
          </Text>
        </Pressable>
      ))}
    </View>
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      footer={actionRow}
    >
      {!homeworkId ? <Text style={styles.qLabel}>Question {index + 1}</Text> : null}
      {homeworkId ? (
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
      {result !== "idle" && !homeworkId && (
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
  } = props
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState("")
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [showHint, setShowHint] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const questions = exercise.content.questions ?? []
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
    if (isCorrect) setCorrectCount((c) => c + 1)
    else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text,
          userAnswer: input.trim(),
          correctAnswer: question.answer ?? "",
          explanation: question.explanation,
        },
      ])
    }
    if (
      applyHomeworkAdvance(homeworkId, index, questions.length, setIndex, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      })
    ) {
      return
    }
    setResult(isCorrect ? "correct" : "incorrect")
  }, [homeworkId, index, input, question, questions.length, result])

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
      variant={homeworkId ? "homework" : "default"}
    />
  )

  return (
    <ExerciseScreenFrame
      homeworkId={homeworkId}
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      footer={actionRow}
    >
      {!homeworkId ? <Text style={styles.qLabel}>Question {index + 1}</Text> : null}
      {homeworkId ? (
        <>
          <HomeworkSourceCard source={question.text} />
          <TextInput
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
      {result !== "idle" && !homeworkId && (
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
        if (homeworkId) {
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
      {!homeworkId ? (
        <View style={styles.matchStatusRow}>
          <Text style={styles.matchStatusLabel}>Match all {total} pairs</Text>
          {checked ? (
            <Text style={styles.matchStatusScore}>
              <Text style={styles.matchStatusScoreValue}>{correctCount}</Text> / {total} correct
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={homeworkId ? undefined : styles.card}>
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
                          homeworkId ? styles.homeworkMatchOption : styles.matchOption,
                          !checked && isChosen && (homeworkId ? styles.homeworkOptionSelected : styles.matchOptionSelected),
                          checked && isChosen && isCorrectOpt && styles.matchOptionCorrect,
                          checked && isChosen && !isCorrectOpt && styles.matchOptionWrong,
                          checked && !isChosen && isCorrectOpt && styles.matchOptionReveal,
                          checked && !isChosen && !isCorrectOpt && styles.matchOptionMuted,
                        ]}
                      >
                        <Text
                          style={[
                            homeworkId ? styles.homeworkOptionText : styles.matchOptionText,
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

        {!homeworkId ? (
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

  if (homeworkId) {
    return (
      <HomeworkExerciseLayout
        index={answeredCount}
        total={total}
        instruction={homeworkInstructionForType("matching")}
        footer={matchFooter}
      >
        <HomeworkInstructions homeworkId={homeworkId} instructions={exercise.instructions} />
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
      <HomeworkInstructions homeworkId={homeworkId} instructions={exercise.instructions} />
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
  } = props
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<{ word: string; bankIndex: number }[]>([])
  const [bankUsed, setBankUsed] = useState<boolean[]>([])
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const questions = exercise.content.questions ?? []
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
    if (isCorrect) setCorrectCount((c) => c + 1)
    else {
      const prefix = (question.prefix ?? []).join(" ")
      const suffix = (question.suffix ?? []).join(" ")
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text || "Arrange the words",
          userAnswer: [prefix, ...pickedWords, suffix].filter(Boolean).join(" "),
          correctAnswer: [prefix, ...correct, suffix].filter(Boolean).join(" "),
          explanation: question.explanation,
        },
      ])
    }
    if (
      applyHomeworkAdvance(homeworkId, index, questions.length, setIndex, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      })
    ) {
      return
    }
    setResult(isCorrect ? "correct" : "incorrect")
  }, [homeworkId, index, pickedWords, question, questions.length, remainingCount, result])

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
      variant={homeworkId ? "homework" : "default"}
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

      {result !== "idle" && !homeworkId ? (
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
      {result !== "idle" && !homeworkId && (
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
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      footer={actionRow}
    >
      {homeworkId ? homeworkContent : defaultContent}
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
  } = props
  const [index, setIndex] = useState(0)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const questions = exercise.content.questions ?? []
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
    if (allCorrect) setCorrectCount((c) => c + 1)
    else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: segments.map((s) => edits[s.id] ?? s.text).join(""),
          userAnswer: "See sentence",
          correctAnswer: segments.map((s) => s.correctText ?? s.text).join(""),
          explanation: question.explanation,
        },
      ])
    }
    if (
      applyHomeworkAdvance(homeworkId, index, questions.length, setIndex, () => {
        setFinished(true)
        setFinishedAt(Date.now())
      })
    ) {
      return
    }
    setResult(allCorrect ? "correct" : "incorrect")
  }, [edits, homeworkId, index, question, questions.length, result])

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
      variant={homeworkId ? "homework" : "default"}
    />
  )

  const errorContent = (
    <>
      {!homeworkId ? (
        <>
          <Text style={styles.qLabel}>Question {index + 1} — Fix the errors</Text>
          <Text style={styles.instructionHint}>Tap highlighted words to edit them</Text>
        </>
      ) : null}
      {homeworkId ? (
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
      {result !== "idle" && !homeworkId && (
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
      exercise={exercise}
      index={index}
      total={questions.length}
      correctCount={correctCount}
      secondsLeft={secondsLeft}
      questionInstruction={question.instruction}
      footer={actionRow}
    >
      {errorContent}
    </ExerciseScreenFrame>
  )
}

// ─── Main switch ─────────────────────────────────────────────────────────────

export function ExerciseRunner(props: ExerciseRunnerProps & { exercise: GrammarExercise }) {
  switch (props.exercise.type) {
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 80,
    fontSize: 16,
    marginHorizontal: 4,
    marginVertical: 4,
    backgroundColor: "#FAFAFA",
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
    fontSize: 16,
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
    gap: 4,
  },
  homeworkSentenceText: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
    fontWeight: "600",
  },
  homeworkBlankInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 96,
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "#FFFFFF",
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
    fontSize: 16,
    fontWeight: "600",
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
