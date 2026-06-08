export type GrammarDifficulty = "easy" | "medium" | "hard" | "mixed"
export type GrammarCategory = "grammar" | "vocabulary"

export type GrammarExerciseType =
  | "fill-in-the-blank"
  | "multiple-choice"
  | "matching"
  | "word-formation"
  | "sentence-transformation"
  | "true-false"
  | "error-correction"
  | "word-order"

export interface GrammarQuestion {
  id: number
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
  estimatedTime: number
  totalQuestions: number
  passingScore: number
  tags: string[]
  instructions: string
  tips: string[]
  content: GrammarExerciseContent
}

export const GRAMMAR_BLANK_TOKEN = "_____"

export function isBlankCorrect(input: string, accepted: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()
  const got = norm(input)
  return accepted.some((a) => norm(a) === got)
}

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`´]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.?!]+$/g, "")
    .trim()
}
