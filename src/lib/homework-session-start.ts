import { homeworkApi } from "./api"
import { resolveHomeworkSubmission } from "./homework-review"
import type { HomeworkSubmission, IntegrityStatus } from "../types/domain"

export function needsSuspiciousAcknowledgement(
  sub:
    | {
        integrityStatus?: IntegrityStatus
        pauseUsed?: boolean
        status?: HomeworkSubmission["status"]
      }
    | null
    | undefined,
): boolean {
  return (
    sub?.integrityStatus === "cheating_suspicion" &&
    !sub?.pauseUsed &&
    sub?.status === "in_progress"
  )
}

export interface HomeworkSessionStartResult {
  sub: HomeworkSubmission | null
  needsSuspiciousAck: boolean
}

/** Starts or resumes a homework session, unless the student must acknowledge a prior violation first. */
export async function resolveHomeworkSessionStart(
  homeworkId: string,
): Promise<HomeworkSessionStartResult> {
  try {
    const entries = await homeworkApi.mine({ force: true })
    const existing = entries.find((e) => e.homework.id === homeworkId)?.submission ?? null
    if (needsSuspiciousAcknowledgement(existing)) {
      return { sub: existing, needsSuspiciousAck: true }
    }
  } catch {
    // Fall through to start when the list is unavailable.
  }

  const subRaw = await homeworkApi
    .start(homeworkId, { force: true, skipEntryCount: true })
    .catch(() => null)

  return {
    sub: resolveHomeworkSubmission(homeworkId, subRaw),
    needsSuspiciousAck: false,
  }
}

export async function resumeHomeworkSession(
  homeworkId: string,
): Promise<HomeworkSubmission | null> {
  const subRaw = await homeworkApi
    .start(homeworkId, { force: true, skipEntryCount: true })
    .catch(() => null)
  return resolveHomeworkSubmission(homeworkId, subRaw)
}
