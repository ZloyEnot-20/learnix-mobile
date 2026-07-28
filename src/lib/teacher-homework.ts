import type { HomeworkSubmission } from "../types/domain"



export function submissionPercent(submission: HomeworkSubmission): number | null {

  const attempt = submission.attempt

  if (attempt && attempt.totalQuestions > 0) {

    return Math.round((attempt.correctCount / attempt.totalQuestions) * 100)

  }

  if (submission.score != null) {

    return Math.round((submission.score / 9) * 100)

  }

  return null

}



/** Vibrant score colors for teacher homework matrix & modals. */

export function percentColors(percent: number): { bg: string; text: string } {

  if (percent < 50) return { bg: "#FF3B30", text: "#FFFFFF" }

  if (percent < 75) return { bg: "#FFCC00", text: "#4A3800" }

  return { bg: "#34C759", text: "#FFFFFF" }

}



export function submissionStatusLabel(status: HomeworkSubmission["status"]): string {

  if (status === "pending") return "Not started"

  if (status === "in_progress" || status === "paused") return "In progress"

  if (status === "submitted" || status === "graded") return "Done"

  return status

}

