/** Cambridge-style vocabulary book JSON — use fields as-is; do not invent schema. */

export interface BookMeta {
  title: string
  author: string
  isbn?: string
  publisher?: string
  year?: number
}

export type BookSectionType = "vocabulary" | "reading" | "test_practice" | string

/** Raw exercise / section node from book JSON (shape varies by exercise). */
export type BookExerciseRaw = Record<string, unknown> & {
  exercise_id?: string
  instruction?: string
  section_type?: BookSectionType
  subtype?: string
  exercises?: BookExerciseRaw[]
}

export interface BookSectionRaw {
  section_type?: BookSectionType
  subtype?: string
  exercises?: BookExerciseRaw[]
  /** Orphan exercise fields may sit at section level (Unit 2). */
  exercise_id?: string
  instruction?: string
  [key: string]: unknown
}

export interface BookUnitRaw {
  unit_number: number
  title: string
  subtitle?: string
  sections?: BookSectionRaw[]
}

export interface BookDocument {
  book: BookMeta
  units: BookUnitRaw[]
  answer_key?: Record<string, unknown>
}

/** Inferred UI renderer for a normalized lesson step. */
export type BookExerciseUiType =
  | "vocab-checklist"
  | "listening-structured"
  | "vocab-table"
  | "prefix-choice"
  | "word-formation"
  | "image-prompt"
  | "fill-blank-sentences"
  | "speaking-topic"
  | "instruction-only"
  | "reading-tfng"
  | "paraphrase-pairs"
  | "listening-notes"
  | "discussion-questions"
  | "listening-match"
  | "expression-notes"
  | "classification"
  | "summary-completion"
  | "sentence-wordbox"
  | "graph-task"
  | "answer-list"
  | "gap-fill-passage"

export const BOOK_EXERCISE_UI_LABELS: Record<BookExerciseUiType, string> = {
  "vocab-checklist": "Vocabulary checklist",
  "listening-structured": "Listening task",
  "vocab-table": "Vocabulary table",
  "prefix-choice": "Prefix formation",
  "word-formation": "Word formation",
  "image-prompt": "Image / mind map",
  "fill-blank-sentences": "Fill in the blank",
  "speaking-topic": "Speaking task",
  "instruction-only": "Self-check",
  "reading-tfng": "Reading · True / False / NG",
  "paraphrase-pairs": "Paraphrase matching",
  "listening-notes": "Listening · notes completion",
  "discussion-questions": "Discussion questions",
  "listening-match": "Listening · match",
  "expression-notes": "Listening · expressions",
  classification: "Classification",
  "summary-completion": "Summary completion",
  "sentence-wordbox": "Sentence completion",
  "graph-task": "Graph task",
  "answer-list": "Transformation",
  "gap-fill-passage": "Gap fill",
}

export type LessonStepStatus = "pending" | "current" | "open" | "done"

/** Flattened lesson step derived from book order (never hard-coded). */
export interface LessonStep {
  id: string
  unitNumber: number
  exerciseId: string
  sectionType: BookSectionType
  sectionLabel: string
  order: number
  instruction: string
  uiType: BookExerciseUiType
  uiLabel: string
  /** Original JSON payload for the renderer. */
  raw: BookExerciseRaw
  /** Answer key slice when available. */
  answers?: unknown
  ready: boolean
}

export type LiveLessonStatus = "idle" | "active" | "paused" | "finished"

export type StudentLiveStatus = "offline" | "online" | "working" | "done"

export interface LiveStudentProgress {
  studentId: string
  name: string
  status: StudentLiveStatus
  progress: number
  score: number | null
  startedAt: string | null
  completedAt: string | null
  elapsedSeconds: number
}

export interface LiveLessonState {
  id: string
  code: string
  orgId: string
  groupId: string
  bookId: string
  teacherId: string
  currentUnit: number | null
  currentExercise: string | null
  lessonStatus: LiveLessonStatus
  openForStudents: boolean
  startedAt: string | null
  pausedAt: string | null
  finishedAt: string | null
  students: LiveStudentProgress[]
  onlineCount: number
  workingCount: number
  doneCount: number
}
