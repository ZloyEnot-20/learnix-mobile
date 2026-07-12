export type IeltsReadingQuestionType =
  | "true-false-not-given"
  | "yes-no-not-given"
  | "multiple-choice"
  | "fill-in-blank"
  | "short-answer"
  | "matching-headings"
  | "matching-information"
  | "matching-features"
  | "matching-sentence-endings"
  | "sentence-completion"
  | "summary-completion"
  | "note-completion"
  | "table-completion"
  | "flow-chart-completion"
  | "diagram-label-completion"
  | "selecting-a-title"
  | "summary-completion-word-box"
  | "diagram-completion"
  | "note-completion-word-box"
  | "table-completion-word-box"
  | "flow-chart-completion-word-box"
  | string

export interface IeltsReadingQuestion {
  id: number
  type: IeltsReadingQuestionType
  question: string
  options?: string[]
  correctAnswer: string | number | string[]
}

/** One exam task block (Questions 8–10, etc.) — mirrors engnovate section-content. */
export interface IeltsReadingQuestionSection {
  id: string
  title: string
  /** Task instructions only (Complete the flow-chart… / Do the following…). */
  instruction: string
  /**
   * Shared body for notes / flow-chart / summary with `[N]` blanks.
   * Empty when questions are listed individually (T/F/NG, MC).
   */
  content?: string
  /** Shared option bank (summary / matching). */
  options?: string[]
  startQuestion: number
  endQuestion: number
  questions: IeltsReadingQuestion[]
}

export interface IeltsReadingPart {
  partNumber: number
  title: string
  instruction: string
  passageTitle?: string
  questionInstruction?: string
  passage: string
  totalQuestions: number
  /** Preferred: task sections shown as scrollable pages. */
  sections?: IeltsReadingQuestionSection[]
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

export type IeltsListeningQuestionType = "fill-in-blank" | "multiple-choice" | "matching"

export interface IeltsListeningQuestion {
  id: number
  type: IeltsListeningQuestionType
  label: string
  correctAnswer: string
}

export interface IeltsListeningQuestionDetail extends IeltsListeningQuestion {
  question: string
  options: string[]
}

export type IeltsListeningMatchingRow = {
  questionId: number
  label: string
}

export type IeltsListeningFlowChartStep = {
  stepLabel: string
  questionId: number
}

export type IeltsListeningNoteLine =
  | { kind: "text"; text: string; bullet?: boolean }
  | { kind: "blank"; questionId: number; before?: string; after: string }

export type IeltsListeningNoteSection = {
  heading?: string
  lines: IeltsListeningNoteLine[]
}

export type IeltsListeningContentBlock =
  | { type: "text"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "image"; url: string; alt?: string }
  | {
      type: "multi-select-group"
      questionIds: number[]
      label?: string
      prompt: string
      options: string[]
    }
  | {
      type: "multiple-choice"
      questionId: number
      prompt: string
      options: string[]
      imageUrl?: string
    }
  | {
      type: "matching-grid"
      columns: string[]
      rows: IeltsListeningMatchingRow[]
    }
  | {
      type: "flow-chart"
      title?: string
      steps: IeltsListeningFlowChartStep[]
      options: string[]
    }
  | {
      type: "notes"
      intro?: string
      title?: string
      sections: IeltsListeningNoteSection[]
    }

export interface IeltsListeningPart {
  partNumber: number
  title: string
  instruction: string
  audioUrl: string
  content: string
  contentBlocks?: IeltsListeningContentBlock[]
  questions: IeltsListeningQuestion[]
}

export interface IeltsListeningTest {
  testId: string
  title: string
  book?: number
  test?: number
  catalogId?: string
  fullAudioUrl?: string
  totalTime: number
  parts: IeltsListeningPart[]
  questionDetails?: IeltsListeningQuestionDetail[]
}

export interface IeltsListeningCatalogItem {
  id: string
  title: string
  subtitle: string
  estimatedMinutes: number
  questionCount: number
  file: string
  book: number
  test: number
}

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
    description: "Cambridge IELTS listening tests",
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
