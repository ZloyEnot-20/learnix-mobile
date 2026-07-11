import { cacheKey, peekStale } from "./api-cache"
import type { HomeworkAttempt, HomeworkSubmission, StudentHomeworkEntry } from "../types/domain"
import type { IeltsReadingTest } from "../types/ielts"
import {
  flattenReadingQuestions,
  formatReadingCorrectAnswer,
  isReadingAnswerCorrect,
  resolveReadingQuestionPrompt,
} from "./ielts-reading"
import {
  flattenListeningQuestions,
  formatListeningCorrectAnswer,
  getQuestionDetail,
  isListeningAnswerCorrect,
  resolveListeningReviewOptions,
  resolveListeningReviewPrompt,
} from "./ielts-listening"
import {
  formatFillBlankCorrectAnswer,
  type GrammarExercise,
  type GrammarQuestion,
} from "../types/grammar"

export type QuestionReviewStatus = "correct" | "incorrect" | "skipped"

export interface ReviewQuestionItem {
  index: number
  question: GrammarQuestion
  status: QuestionReviewStatus
  userAnswer?: string
  correctAnswer: string
}

export interface ReadingReviewItem {
  index: number
  questionId: number
  partNumber: number
  prompt: string
  status: QuestionReviewStatus
  userAnswer?: string
  correctAnswer: string
}

export type ListeningReviewItem = ReadingReviewItem & {
  options?: string[]
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
      return formatFillBlankCorrectAnswer(question)
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

export function buildReadingReviewItems(
  test: IeltsReadingTest,
  attempt: HomeworkAttempt,
): ReadingReviewItem[] {
  const flat = flattenReadingQuestions(test)
  const mistakeById = new Map(attempt.mistakes.map((m) => [m.questionId, m]))
  const answerById = new Map(
    (attempt.readingAnswers ?? []).map((a) => [a.questionId, a.userAnswer]),
  )
  const answered =
    attempt.answeredCount ?? attempt.correctCount + attempt.mistakes.length
  const hasStoredAnswers = answerById.size > 0
  const hasMistakeDetails = attempt.mistakes.length > 0
  const allCorrect = attempt.correctCount === attempt.totalQuestions

  return flat.map((question, index) => {
    const prompt =
      resolveReadingQuestionPrompt(
        question.question,
        question.options,
        question.questionInstruction,
      ) || `Question ${question.id}`
    const correctAnswer =
      mistakeById.get(question.id)?.correctAnswer ??
      formatReadingCorrectAnswer(question)
    const mistake = mistakeById.get(question.id)
    const storedAnswer = answerById.get(question.id)

    if (mistake) {
      return {
        index,
        questionId: question.id,
        partNumber: question.partNumber,
        prompt,
        status: "incorrect" as const,
        userAnswer: mistake.userAnswer,
        correctAnswer,
      }
    }

    if (storedAnswer) {
      const isCorrect = isReadingAnswerCorrect(question, storedAnswer)
      return {
        index,
        questionId: question.id,
        partNumber: question.partNumber,
        prompt,
        status: isCorrect ? ("correct" as const) : ("incorrect" as const),
        userAnswer: storedAnswer,
        correctAnswer,
      }
    }

    if (hasMistakeDetails || hasStoredAnswers || allCorrect) {
      if (index < answered) {
        return {
          index,
          questionId: question.id,
          partNumber: question.partNumber,
          prompt,
          status: "correct" as const,
          correctAnswer,
        }
      }

      return {
        index,
        questionId: question.id,
        partNumber: question.partNumber,
        prompt,
        status: "skipped" as const,
        correctAnswer,
      }
    }

    return {
      index,
      questionId: question.id,
      partNumber: question.partNumber,
      prompt,
      status: "skipped" as const,
      correctAnswer,
    }
  })
}

export function buildListeningReviewItems(
  test: import("../types/ielts").IeltsListeningTest,
  attempt: HomeworkAttempt,
): ListeningReviewItem[] {
  const flat = flattenListeningQuestions(test)
  const mistakeById = new Map(attempt.mistakes.map((m) => [m.questionId, m]))
  const answerById = new Map(
    (attempt.readingAnswers ?? []).map((a) => [a.questionId, a.userAnswer]),
  )
  const answered =
    attempt.answeredCount ?? attempt.correctCount + attempt.mistakes.length
  const hasStoredAnswers = answerById.size > 0
  const hasMistakeDetails = attempt.mistakes.length > 0
  const allCorrect = attempt.correctCount === attempt.totalQuestions

  return flat.map((question, index) => {
    const detail = getQuestionDetail(test, question.id)
    const prompt = resolveListeningReviewPrompt(test, question.id, detail)
    const options = resolveListeningReviewOptions(test, question.id, detail)
    const correctAnswer =
      mistakeById.get(question.id)?.correctAnswer ?? formatListeningCorrectAnswer(question)
    const mistake = mistakeById.get(question.id)
    const storedAnswer = answerById.get(question.id)

    if (mistake) {
      return {
        index,
        questionId: question.id,
        partNumber: question.partNumber,
        prompt,
        options,
        status: "incorrect" as const,
        userAnswer: mistake.userAnswer,
        correctAnswer,
      }
    }

    if (storedAnswer) {
      const isCorrect = isListeningAnswerCorrect(question, storedAnswer, detail)
      return {
        index,
        questionId: question.id,
        partNumber: question.partNumber,
        prompt,
        options,
        status: isCorrect ? ("correct" as const) : ("incorrect" as const),
        userAnswer: storedAnswer,
        correctAnswer,
      }
    }

    if (hasMistakeDetails || hasStoredAnswers || allCorrect) {
      if (index < answered) {
        return {
          index,
          questionId: question.id,
          partNumber: question.partNumber,
          prompt,
          options,
          status: "correct" as const,
          correctAnswer,
        }
      }

      return {
        index,
        questionId: question.id,
        partNumber: question.partNumber,
        prompt,
        options,
        status: "skipped" as const,
        correctAnswer,
      }
    }

    return {
      index,
      questionId: question.id,
      partNumber: question.partNumber,
      prompt,
      options,
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

/** Prefer live API data; fall back to start/mine caches when the network request fails. */
export function resolveHomeworkSubmission(
  homeworkId: string,
  apiSub: HomeworkSubmission | null | undefined,
): HomeworkSubmission | null {
  if (apiSub) return apiSub

  const fromStart = peekStale<HomeworkSubmission>(
    cacheKey("POST", `/homework/start:${homeworkId}`),
  )
  if (fromStart) return fromStart

  const entries = peekStale<StudentHomeworkEntry[]>(cacheKey("GET", "/homework/mine"))
  return entries?.find((e) => e.homework.id === homeworkId)?.submission ?? null
}
