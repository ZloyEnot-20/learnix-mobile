export type IeltsReadingQuestionType =
  | "true-false-not-given"
  | "yes-no-not-given"
  | "multiple-choice"
  | "fill-in-blank"
  | "short-answer"

export interface IeltsReadingQuestion {
  id: number
  type: IeltsReadingQuestionType
  question: string
  options?: string[]
  correctAnswer: string | number | string[]
}

export interface IeltsReadingPart {
  partNumber: number
  title: string
  instruction: string
  passageTitle?: string
  questionInstruction?: string
  passage: string
  totalQuestions: number
  questions: IeltsReadingQuestion[]
}

export interface IeltsReadingTest {
  id: string
  title: string
  totalTimeMinutes: number
  parts: IeltsReadingPart[]
}

export interface IeltsReadingCatalogItem {
  id: string
  title: string
  subtitle: string
  estimatedMinutes: number
  questionCount: number
  file: string
}

export interface IeltsSectionCatalog {
  items: IeltsReadingCatalogItem[]
}

export type IeltsSkill = "reading" | "listening" | "speaking" | "writing"

export const IELTS_SKILLS: {
  id: IeltsSkill
  label: string
  icon: "book-outline" | "headset-outline" | "mic-outline" | "create-outline"
  description: string
}[] = [
  {
    id: "reading",
    label: "Reading",
    icon: "book-outline",
    description: "Passages with IELTS-style questions",
  },
  {
    id: "listening",
    label: "Listening",
    icon: "headset-outline",
    description: "Audio tasks — coming soon",
  },
  {
    id: "speaking",
    label: "Speaking",
    icon: "mic-outline",
    description: "Speaking prompts — coming soon",
  },
  {
    id: "writing",
    label: "Writing",
    icon: "create-outline",
    description: "Writing tasks — coming soon",
  },
]
