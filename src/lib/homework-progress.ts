import { homeworkApi } from "./api"
import type { HomeworkAttempt } from "../types/domain"
import type { ReviewItem } from "../components/exercise/shared"

export function restoreAssignmentIndex(attempt?: HomeworkAttempt): number {
  const answered = attempt?.answeredCount
  if (answered == null || answered <= 0) return 0
  return answered
}

export function restoreMistakes(attempt?: HomeworkAttempt): ReviewItem[] {
  return (attempt?.mistakes ?? []).map((m) => ({
    id: m.questionId,
    prompt: m.prompt,
    userAnswer: m.userAnswer,
    correctAnswer: m.correctAnswer,
    explanation: m.explanation,
  }))
}

export function buildHomeworkProgress(
  total: number,
  answeredCount: number,
  correctCount: number,
  mistakes: ReviewItem[],
): HomeworkAttempt {
  return {
    totalQuestions: total,
    correctCount,
    answeredCount,
    mistakes: mistakes.map((m) => ({
      questionId: m.id,
      prompt: m.prompt,
      userAnswer: m.userAnswer,
      correctAnswer: m.correctAnswer,
      explanation: m.explanation,
    })),
  }
}

export function hasSavedHomeworkProgress(attempt?: HomeworkAttempt): boolean {
  return (attempt?.answeredCount ?? 0) > 0
}

export async function saveHomeworkProgress(
  homeworkId: string,
  total: number,
  answeredCount: number,
  correctCount: number,
  mistakes: ReviewItem[],
): Promise<void> {
  await homeworkApi.saveProgress(
    homeworkId,
    buildHomeworkProgress(total, answeredCount, correctCount, mistakes),
  )
}
