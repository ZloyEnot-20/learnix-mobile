import type { GrammarDifficulty, GrammarExercise, GrammarQuestion } from "../types/grammar"

/** Fallback max speaking duration when a question has no speakTimeSeconds. */
const DIFFICULTY_SPEAK_SECONDS: Record<GrammarDifficulty, number> = {
  easy: 45,
  medium: 90,
  hard: 150,
  mixed: 90,
}

/** ~20 KB/s for AAC high-quality recordings (128 kbps + container overhead). */
const BYTES_PER_SECOND = 20_000
const SIZE_BUFFER = 1.15

export type SpeakingLimits = {
  maxDurationSeconds: number
  maxFileSizeBytes: number
}

export function resolveSpeakingLimits(
  question: GrammarQuestion,
  exercise: GrammarExercise,
): SpeakingLimits {
  const maxDurationSeconds =
    question.speakTimeSeconds ??
    DIFFICULTY_SPEAK_SECONDS[exercise.difficulty] ??
    60

  const maxFileSizeBytes = Math.ceil(maxDurationSeconds * BYTES_PER_SECOND * SIZE_BUFFER)

  return { maxDurationSeconds, maxFileSizeBytes }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
