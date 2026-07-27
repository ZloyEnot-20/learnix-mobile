export type GrammarDifficulty = "easy" | "medium" | "hard" | "mixed"
export type GrammarCategory = "grammar" | "vocabulary" | "speaking"

export type GrammarExerciseType =
  | "fill-in-the-blank"
  | "multiple-choice"
  | "matching"
  | "word-formation"
  | "sentence-transformation"
  | "true-false"
  | "error-correction"
  | "word-order"
  | "speaking"
  | "mixed"

export interface GrammarQuestion {
  id: number
  /** Per-question type override (mixed exercises). */
  type?: GrammarExerciseType
  instruction?: string
  text: string
  blanks?: string[]
  acceptableAnswers?: string[][]
  options?: string[]
  correctAnswer?: string
  answer?: string
  accepted?: string[]
  correctBool?: boolean
  segments?: ErrorSegment[]
  prefix?: string[]
  scrambled?: string[]
  correct?: string[]
  suffix?: string[]
  alternates?: string[][]
  explanation: string
  hint?: string
  /** Seconds to prepare before recording (speaking). */
  prepTimeSeconds?: number
  /** Suggested max speaking time in seconds (speaking). */
  speakTimeSeconds?: number
}

export interface MatchingPair {
  left: string
  right: string
}

export interface ErrorSegment {
  id: string
  text: string
  after?: string
  correctText?: string
  acceptableText?: string[]
  hint?: string
}

export interface GrammarExerciseContent {
  questions?: GrammarQuestion[]
  pairs?: MatchingPair[]
}

export interface GrammarExercise {
  id: string
  slug: string
  title: string
  description: string
  category: GrammarCategory
  topic: string
  subtopic: string
  difficulty: GrammarDifficulty
  level: string
  type: GrammarExerciseType
  /** Declared question types included in this exercise (mixed). */
  questionTypes?: GrammarExerciseType[]
  estimatedTime: number
  totalQuestions: number
  passingScore: number
  tags: string[]
  instructions: string
  tips: string[]
  content: GrammarExerciseContent
}

/** Lightweight exercise row for catalogue / progress screens. */
export interface GrammarExerciseSummary {
  slug: string
  title: string
  topic: string
  subtopic: string
  category: GrammarCategory
  level: string
  type: GrammarExerciseType
  /** Declared question types included in this exercise (mixed). */
  questionTypes?: GrammarExerciseType[]
  estimatedTime: number
  totalQuestions: number
  passingScore: number
}

export interface ExerciseMeta {
  slug: string
  title: string
  topic: string
  subtopic: string
  category: GrammarCategory
  level: string
  totalQuestions: number
  passingScore: number
}

export const GRAMMAR_BLANK_TOKEN = "_____"

export function isBlankCorrect(input: string, accepted: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()
  const got = norm(input)
  return accepted.some((a) => norm(a) === got)
}

/** Resolve accepted answers for one blank, including legacy data shapes. */
export function getAcceptableAnswersForBlank(
  question: Pick<GrammarQuestion, "acceptableAnswers" | "blanks">,
  blankIndex: number,
): string[] {
  const all = question.acceptableAnswers ?? []
  const blanksCount = question.blanks?.length ?? 0
  if (blanksCount === 0 || blankIndex < 0 || blankIndex >= blanksCount) return []

  const nonEmpty = (arr: string[] | undefined) =>
    (arr ?? []).map((s) => s.trim()).filter(Boolean)

  // Legacy flat: one row with one answer per blank — [["checks", "leaves"]]
  if (blanksCount > 1 && all.length === 1 && all[0].length >= blanksCount) {
    const answer = all[0][blankIndex]?.trim()
    return answer ? [answer] : []
  }

  // Canonical per-blank: one row per blank — [["checks"], ["leaves"]]
  if (all.length === blanksCount) {
    return nonEmpty(all[blankIndex])
  }

  // Single blank, each variant in its own row — [["don't watch"], ["do not watch"]]
  if (blanksCount === 1 && blankIndex === 0 && all.length > 1) {
    return all.flatMap(nonEmpty)
  }

  // Single blank, all variants in the first row — [["is", "'s"]]
  if (blanksCount === 1 && all.length === 1) {
    return nonEmpty(all[0])
  }

  if (blankIndex < all.length) {
    return nonEmpty(all[blankIndex])
  }

  const blank = question.blanks?.[blankIndex]
  if (blank) {
    const stripped = blank.replace(/^\((.*)\)$/, "$1").trim()
    return stripped ? [stripped] : [blank]
  }

  return []
}

/** Human-readable correct answer for fill-in-the-blank feedback. */
export function formatFillBlankCorrectAnswer(
  question: Pick<GrammarQuestion, "acceptableAnswers" | "blanks">,
): string {
  const blanksCount = question.blanks?.length ?? 0
  if (blanksCount === 0) return ""

  return Array.from({ length: blanksCount }, (_, i) => {
    const accepted = getAcceptableAnswersForBlank(question, i)
    if (accepted.length > 0) return accepted.join(" or ")
    return question.blanks?.[i] ?? ""
  }).join(" / ")
}

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`´]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.?!]+$/g, "")
    .trim()
}
