import type { IeltsReadingCatalogItem, IeltsReadingTest } from "../types/ielts"

import readingIndex from "../../../exercises/ielts/reading/index.json"
import marieCuriePart1 from "../../../exercises/ielts/reading/marie-curie-part1.json"

const READING_TESTS: Record<string, IeltsReadingTest> = {
  "marie-curie-part1": marieCuriePart1 as IeltsReadingTest,
}

export function listIeltsReadingTasks(): IeltsReadingCatalogItem[] {
  const items = (readingIndex as { items: IeltsReadingCatalogItem[] }).items
  return items.slice().sort((a, b) => a.title.localeCompare(b.title))
}

export function getIeltsReadingTest(id: string): IeltsReadingTest | null {
  return READING_TESTS[id] ?? null
}

export function countReadingQuestions(test: IeltsReadingTest): number {
  return test.parts.reduce((sum, part) => sum + part.questions.length, 0)
}

export function flattenReadingQuestions(test: IeltsReadingTest) {
  return test.parts.flatMap((part) =>
    part.questions.map((q) => ({
      ...q,
      partNumber: part.partNumber,
      passageTitle: part.passageTitle,
      questionInstruction: part.questionInstruction,
    })),
  )
}

export function isReadingAnswerCorrect(
  question: { type: string; correctAnswer: string | number | string[] },
  answer: string,
): boolean {
  const normalized = answer.trim()
  if (!normalized) return false

  if (question.type === "multiple-choice") {
    const user = normalized.trim().toUpperCase()
    const correct =
      typeof question.correctAnswer === "number"
        ? String(question.correctAnswer)
        : String(question.correctAnswer).trim().toUpperCase()
    return user === correct
  }

  if (Array.isArray(question.correctAnswer)) {
    const userAnswers = normalized.split("|||").filter(Boolean).map((a) => a.trim().toUpperCase())
    const correctAnswers = question.correctAnswer.map((a) => String(a).trim().toUpperCase())
    return (
      userAnswers.length === correctAnswers.length &&
      userAnswers.every((a) => correctAnswers.includes(a))
    )
  }

  return normalized.toUpperCase() === String(question.correctAnswer).trim().toUpperCase()
}

export function scoreReadingTest(
  test: IeltsReadingTest,
  answers: Record<number, string>,
): { correct: number; total: number } {
  let correct = 0
  let total = 0
  for (const part of test.parts) {
    for (const question of part.questions) {
      total += 1
      if (isReadingAnswerCorrect(question, answers[question.id] ?? "")) correct += 1
    }
  }
  return { correct, total }
}
