import type { LessonStep } from "./types"

/** Oral / discussion — no graded Assign/Finish flow or answer review chrome. */
export function isLiveGradableExercise(step: LessonStep): boolean {
  if (step.uiType === "speaking-topic" || step.uiType === "discussion-questions") {
    return false
  }
  if (step.answers != null) return true
  return (
    step.uiType !== "passage-read" &&
    step.uiType !== "instruction-only" &&
    step.uiType !== "image-prompt"
  )
}
