import type { HomeworkAttempt } from "../types/domain"
import type { GrammarExercise, GrammarQuestion } from "../types/grammar"

export type QuestionReviewStatus = "correct" | "incorrect" | "skipped"

export interface ReviewQuestionItem {
  index: number
  question: GrammarQuestion
  status: QuestionReviewStatus
  userAnswer?: string
  correctAnswer: string
}

export function getReviewQuestions(exercise: GrammarExercise): GrammarQuestion[] {
  if (exercise.type === "matching") {
    const pairs = exercise.content.pairs ?? []
    return pairs.map((p, i) => ({
      id: i + 1,
      text: p.left,
      correctAnswer: p.right,
      explanation: "",
    }))
  }
  return exercise.content.questions ?? []
}

export function questionCorrectAnswer(
  exercise: GrammarExercise,
  question: GrammarQuestion,
): string {
  switch (exercise.type) {
    case "fill-in-the-blank":
      return question.blanks?.join(" / ") ?? ""
    case "multiple-choice":
    case "matching":
      return question.correctAnswer ?? ""
    case "true-false":
      return question.correctBool ? "True" : "False"
    case "word-formation":
    case "sentence-transformation":
      return question.answer ?? ""
    case "word-order": {
      const prefix = (question.prefix ?? []).join(" ")
      const suffix = (question.suffix ?? []).join(" ")
      const core = (question.correct ?? []).join(" ")
      return [prefix, core, suffix].filter(Boolean).join(" ")
    }
    case "error-correction":
      return (question.segments ?? [])
        .map((s) => s.correctText ?? s.text)
        .join("")
    default:
      return question.correctAnswer ?? question.answer ?? ""
  }
}

export function buildReviewQuestions(
  exercise: GrammarExercise,
  attempt: HomeworkAttempt,
): ReviewQuestionItem[] {
  const questions = getReviewQuestions(exercise)
  const mistakeById = new Map(attempt.mistakes.map((m) => [m.questionId, m]))
  const answered =
    attempt.answeredCount ?? attempt.correctCount + attempt.mistakes.length

  return questions.map((question, index) => {
    const mistake = mistakeById.get(question.id)
    const correctAnswer =
      mistake?.correctAnswer || questionCorrectAnswer(exercise, question)

    if (mistake) {
      return {
        index,
        question,
        status: "incorrect" as const,
        userAnswer: mistake.userAnswer,
        correctAnswer,
      }
    }

    if (index < answered) {
      return {
        index,
        question,
        status: "correct" as const,
        correctAnswer,
      }
    }

    return {
      index,
      question,
      status: "skipped" as const,
      correctAnswer,
    }
  })
}

export function isCompletedSubmission(
  status?: string,
  attempt?: HomeworkAttempt,
): boolean {
  return (
    (status === "submitted" || status === "graded") && attempt != null
  )
}
