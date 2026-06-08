import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import {
  GRAMMAR_BLANK_TOKEN,
  isBlankCorrect,
  normalizeAnswer,
  type GrammarExercise,
  type GrammarQuestion,
} from "../../types/grammar"
import { useCountdown, formatTimer } from "../../hooks/useCountdown"
import {
  ActionRow,
  FeedbackBox,
  HintRow,
  ProgressBar,
  ResultsScreen,
  type ReviewItem,
} from "./shared"
import { colors } from "../../theme/colors"

export interface ExerciseRunnerProps {
  exercise: GrammarExercise
  homeworkId?: string
  studentId?: string
  timeLimitMinutes?: number
  sessionStartedAt: number
}

function ExerciseHeader({
  exercise,
  secondsLeft,
}: {
  exercise: GrammarExercise
  secondsLeft: number | null
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {exercise.title}
        </Text>
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

// ─── Fill in the blank ───────────────────────────────────────────────────────

function FillBlankRunner(props: ExerciseRunnerProps) {
  const { exercise, homeworkId, studentId, timeLimitMinutes, sessionStartedAt } = props
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
    setPerBlank(checks)
    setResult(allCorrect ? "correct" : "incorrect")
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
  }, [allFilled, inputs, question, result])

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
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ExerciseHeader exercise={exercise} secondsLeft={secondsLeft} />
      <ProgressBar index={index} total={questions.length} correctCount={correctCount} />
      <QuestionCard>
        <Text style={styles.qLabel}>Question {index + 1}</Text>
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
        <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
        {result !== "idle" && (
          <FeedbackBox
            correct={result === "correct"}
            correctAnswer={question.blanks?.join(" / ") ?? ""}
            explanation={question.explanation}
          />
        )}
        <ActionRow
          result={result}
          canCheck={allFilled}
          isLast={index + 1 >= questions.length}
          onCheck={handleCheck}
          onNext={handleNext}
        />
      </QuestionCard>
    </ScrollView>
  )
}

// ─── Multiple choice ─────────────────────────────────────────────────────────

function MultipleChoiceRunner(props: ExerciseRunnerProps) {
  const { exercise, homeworkId, studentId, timeLimitMinutes, sessionStartedAt } = props
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
    setResult(isCorrect ? "correct" : "incorrect")
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
  }, [question, result, selected])

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
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  const options = question.options ?? []
  const renderedText = question.text.replace(GRAMMAR_BLANK_TOKEN, "_____")

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ExerciseHeader exercise={exercise} secondsLeft={secondsLeft} />
      <ProgressBar index={index} total={questions.length} correctCount={correctCount} />
      <QuestionCard>
        <Text style={styles.qLabel}>Question {index + 1}</Text>
        <Text style={styles.questionText}>{renderedText}</Text>
        <View style={styles.options}>
          {options.map((opt) => {
            const isChosen = selected === opt
            const isCorrectOpt = opt === question.correctAnswer
            const checked = result !== "idle"
            return (
              <Pressable
                key={opt}
                disabled={checked}
                onPress={() => setSelected(opt)}
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
        <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
        {result !== "idle" && (
          <FeedbackBox
            correct={result === "correct"}
            correctAnswer={question.correctAnswer ?? ""}
            explanation={question.explanation}
          />
        )}
        <ActionRow
          result={result}
          canCheck={selected != null}
          isLast={index + 1 >= questions.length}
          onCheck={handleCheck}
          onNext={handleNext}
        />
      </QuestionCard>
    </ScrollView>
  )
}

// ─── True / False ────────────────────────────────────────────────────────────

function TrueFalseRunner(props: ExerciseRunnerProps) {
  const { exercise, homeworkId, studentId, timeLimitMinutes, sessionStartedAt } = props
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
    sessionStartedAt,
  )

  useEffect(() => {
    setSelected(null)
    setResult("idle")
  }, [index])

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || selected == null) return
    const isCorrect = selected === question.correctBool
    setResult(isCorrect ? "correct" : "incorrect")
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
  }, [question, result, selected])

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
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ExerciseHeader exercise={exercise} secondsLeft={secondsLeft} />
      <ProgressBar index={index} total={questions.length} correctCount={correctCount} />
      <QuestionCard>
        <Text style={styles.qLabel}>Question {index + 1}</Text>
        <Text style={styles.questionText}>{question.text}</Text>
        <View style={styles.tfRow}>
          {[true, false].map((val) => (
            <Pressable
              key={String(val)}
              disabled={result !== "idle"}
              onPress={() => setSelected(val)}
              style={[
                styles.tfBtn,
                selected === val && result === "idle" && styles.optionSelected,
                result !== "idle" && val === question.correctBool && styles.optionCorrect,
                result !== "idle" && selected === val && val !== question.correctBool && styles.optionWrong,
              ]}
            >
              <Text style={styles.tfText}>{val ? "Correct" : "Incorrect"}</Text>
            </Pressable>
          ))}
        </View>
        {result !== "idle" && (
          <FeedbackBox
            correct={result === "correct"}
            correctAnswer={question.correctBool ? "Correct" : "Incorrect"}
            explanation={question.explanation}
          />
        )}
        <ActionRow
          result={result}
          canCheck={selected != null}
          isLast={index + 1 >= questions.length}
          onCheck={handleCheck}
          onNext={handleNext}
        />
      </QuestionCard>
    </ScrollView>
  )
}

// ─── Text answer (word-formation / sentence-transformation) ──────────────────

function TextAnswerRunner(props: ExerciseRunnerProps) {
  const { exercise, homeworkId, studentId, timeLimitMinutes, sessionStartedAt } = props
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
    setResult(isCorrect ? "correct" : "incorrect")
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
  }, [question, result, input])

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
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ExerciseHeader exercise={exercise} secondsLeft={secondsLeft} />
      <ProgressBar index={index} total={questions.length} correctCount={correctCount} />
      <QuestionCard>
        <Text style={styles.qLabel}>Question {index + 1}</Text>
        <Text style={styles.questionText}>{question.text}</Text>
        <TextInput
          style={[styles.textInput, result !== "idle" && (result === "correct" ? styles.inputOk : styles.inputBad)]}
          value={input}
          onChangeText={setInput}
          editable={result === "idle"}
          placeholder="Type your answer..."
          autoCapitalize="none"
        />
        <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
        {result !== "idle" && (
          <FeedbackBox
            correct={result === "correct"}
            correctAnswer={question.answer ?? ""}
            explanation={question.explanation}
          />
        )}
        <ActionRow
          result={result}
          canCheck={input.trim().length > 0}
          isLast={index + 1 >= questions.length}
          onCheck={handleCheck}
          onNext={handleNext}
        />
      </QuestionCard>
    </ScrollView>
  )
}

// ─── Matching ────────────────────────────────────────────────────────────────

function MatchingRunner(props: ExerciseRunnerProps) {
  const pairs = props.exercise.content.pairs ?? []
  const questions: GrammarQuestion[] = pairs.map((p, i) => ({
    id: i + 1,
    text: p.left,
    correctAnswer: p.right,
    options: pairs.map((x) => x.right),
    explanation: "",
  }))

  const patchedExercise = {
    ...props.exercise,
    content: { questions },
    totalQuestions: questions.length,
  }

  return <MultipleChoiceRunner {...props} exercise={patchedExercise} />
}

// ─── Word order ──────────────────────────────────────────────────────────────

function WordOrderRunner(props: ExerciseRunnerProps) {
  const { exercise, homeworkId, studentId, timeLimitMinutes, sessionStartedAt } = props
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const [remaining, setRemaining] = useState<string[]>([])
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
    sessionStartedAt,
  )

  useEffect(() => {
    if (!question) return
    setRemaining([...(question.scrambled ?? [])])
    setPicked([])
    setResult("idle")
  }, [index, question])

  const handlePick = (word: string, fromRemaining: boolean) => {
    if (result !== "idle") return
    if (fromRemaining) {
      setRemaining((r) => r.filter((w, i) => !(w === word && r.indexOf(word) === i)))
      setPicked((p) => [...p, word])
    } else {
      setPicked((p) => p.filter((w, i) => !(w === word && p.indexOf(word) === i)))
      setRemaining((r) => [...r, word])
    }
  }

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || remaining.length > 0) return
    const correct = question.correct ?? []
    const alternates = question.alternates ?? []
    const isCorrect =
      JSON.stringify(picked) === JSON.stringify(correct) ||
      alternates.some((alt) => JSON.stringify(picked) === JSON.stringify(alt))
    setResult(isCorrect ? "correct" : "incorrect")
    if (isCorrect) setCorrectCount((c) => c + 1)
    else {
      const prefix = (question.prefix ?? []).join(" ")
      const suffix = (question.suffix ?? []).join(" ")
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text || "Arrange the words",
          userAnswer: [prefix, ...picked, suffix].filter(Boolean).join(" "),
          correctAnswer: [prefix, ...correct, suffix].filter(Boolean).join(" "),
          explanation: question.explanation,
        },
      ])
    }
  }, [question, result, picked, remaining])

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
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ExerciseHeader exercise={exercise} secondsLeft={secondsLeft} />
      <ProgressBar index={index} total={questions.length} correctCount={correctCount} />
      <QuestionCard>
        <Text style={styles.qLabel}>Question {index + 1} — Arrange the words</Text>
        {(question.prefix ?? []).length > 0 && (
          <Text style={styles.prefixText}>{question.prefix!.join(" ")}</Text>
        )}
        <View style={styles.wordOrderArea}>
          {picked.length === 0 ? (
            <Text style={styles.placeholder}>Tap words below to build the sentence</Text>
          ) : (
            picked.map((w, i) => (
              <Pressable key={`p-${i}-${w}`} onPress={() => handlePick(w, false)} style={styles.wordChip}>
                <Text>{w}</Text>
              </Pressable>
            ))
          )}
        </View>
        {(question.suffix ?? []).length > 0 && (
          <Text style={styles.prefixText}>{question.suffix!.join(" ")}</Text>
        )}
        <View style={styles.wordBank}>
          {remaining.map((w, i) => (
            <Pressable key={`r-${i}-${w}`} onPress={() => handlePick(w, true)} style={styles.wordChip}>
              <Text>{w}</Text>
            </Pressable>
          ))}
        </View>
        {result !== "idle" && (
          <FeedbackBox
            correct={result === "correct"}
            correctAnswer={(question.correct ?? []).join(" ")}
            explanation={question.explanation}
          />
        )}
        <ActionRow
          result={result}
          canCheck={remaining.length === 0 && picked.length > 0}
          isLast={index + 1 >= questions.length}
          onCheck={handleCheck}
          onNext={handleNext}
        />
      </QuestionCard>
    </ScrollView>
  )
}

// ─── Error correction ────────────────────────────────────────────────────────

function ErrorCorrectionRunner(props: ExerciseRunnerProps) {
  const { exercise, homeworkId, studentId, timeLimitMinutes, sessionStartedAt } = props
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
    setResult(allCorrect ? "correct" : "incorrect")
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
  }, [question, result, edits])

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
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }
  if (!question) return null

  const segments = question.segments ?? []

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ExerciseHeader exercise={exercise} secondsLeft={secondsLeft} />
      <ProgressBar index={index} total={questions.length} correctCount={correctCount} />
      <QuestionCard>
        <Text style={styles.qLabel}>Question {index + 1} — Fix the errors</Text>
        <Text style={styles.instructionHint}>Tap highlighted words to edit them</Text>
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
        {result !== "idle" && (
          <FeedbackBox
            correct={result === "correct"}
            correctAnswer=""
            explanation={question.explanation}
          />
        )}
        <ActionRow
          result={result}
          canCheck={true}
          isLast={index + 1 >= questions.length}
          onCheck={handleCheck}
          onNext={handleNext}
        />
      </QuestionCard>
    </ScrollView>
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
})
