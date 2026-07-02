import { peekStale } from "./api-cache"
import { isCompletedSubmission } from "./homework-review"
import type { HomeworkSubmission, Subject } from "../types/domain"
import { runPerfTrace, type PerfAttributes } from "./perf"

export function homeworkDetailTraceName(
  submissionKey: string | undefined,
  reviewSubmission: HomeworkSubmission | null,
): "load_homework_details" | "load_teacher_feedback" {
  if (reviewSubmission) return "load_teacher_feedback"
  if (!submissionKey) return "load_homework_details"

  const cached = peekStale<HomeworkSubmission>(submissionKey)
  if (cached && isCompletedSubmission(cached.status, cached.attempt)) {
    return "load_teacher_feedback"
  }

  return "load_homework_details"
}

export function runHomeworkDetailLoad<T>(
  submissionKey: string | undefined,
  reviewSubmission: HomeworkSubmission | null,
  homeworkType: Subject,
  fn: () => Promise<T>,
): Promise<T> {
  const traceName = homeworkDetailTraceName(submissionKey, reviewSubmission)
  const attributes: PerfAttributes = { homeworkType }
  return runPerfTrace(traceName, fn, attributes)
}
