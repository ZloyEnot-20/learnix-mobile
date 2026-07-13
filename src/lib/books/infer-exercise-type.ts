import type { BookExerciseRaw, BookExerciseUiType } from "./types"
import { BOOK_EXERCISE_UI_LABELS } from "./types"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function itemsAreFillBlanks(items: unknown): boolean {
  if (!Array.isArray(items) || items.length === 0) return false
  // After student strip, `answer` is removed — detect by sentence shape only.
  return items.every((it) => isRecord(it) && typeof it.sentence === "string")
}

function itemsAreParaphrasePairs(items: unknown): boolean {
  if (!Array.isArray(items) || items.length === 0) return false
  // After student strip, paraphrase/answer may be gone — keep original.
  return items.every((it) => isRecord(it) && typeof it.original === "string")
}

function itemsAreSpeakerRows(items: unknown): boolean {
  if (!Array.isArray(items) || items.length === 0) return false
  return items.every((it) => isRecord(it) && "speaker" in it)
}

function answersAreClassification(answers: unknown): boolean {
  if (!isRecord(answers)) return false
  const values = Object.values(answers)
  return values.length > 0 && values.every((v) => Array.isArray(v))
}

/**
 * Infer a dedicated UI renderer from the raw exercise shape.
 * Order matters: more specific shapes first.
 */
export function inferExerciseUiType(raw: BookExerciseRaw): BookExerciseUiType {
  if (raw.section_type === "test_practice" || raw.notes) return "listening-notes"
  if (raw.has_graph) return "graph-task"
  if (raw.has_image) return "image-prompt"
  if (typeof raw.passage === "string" && Array.isArray(raw.questions)) return "reading-tfng"
  if (typeof raw.summary === "string") return "summary-completion"
  if (typeof raw.text === "string" && Array.isArray(raw.words)) return "gap-fill-passage"
  if (Array.isArray(raw.paraphrases) || itemsAreParaphrasePairs(raw.items)) return "paraphrase-pairs"
  if (raw.table && isRecord(raw.table)) return "vocab-table"
  if (Array.isArray(raw.questions) && raw.questions.every((q) => typeof q === "string")) {
    return "discussion-questions"
  }
  if (typeof raw.topic === "string") return "speaking-topic"
  if (raw.speaker_1_expressions || raw.speaker_2_expressions) return "expression-notes"
  if (raw.audio_track && (raw.speaker_1 || raw.speaker_2)) return "listening-match"
  if (raw.audio_track && itemsAreSpeakerRows(raw.items)) return "listening-structured"
  if (Array.isArray(raw.sentences) && (raw.adjectives || raw.words)) return "sentence-wordbox"
  if (itemsAreFillBlanks(raw.items)) return "fill-blank-sentences"
  if (answersAreClassification(raw.answers) && Array.isArray(raw.items)) {
    const keys = Object.keys(raw.answers as object)
    if (keys.some((k) => k.endsWith("-") || k.includes("-"))) return "prefix-choice"
    return "classification"
  }
  if (
    Array.isArray(raw.items) &&
    raw.items.every((i) => typeof i === "string") &&
    Array.isArray(raw.answers) &&
    raw.answers.every((a) => typeof a === "string")
  ) {
    return "word-formation"
  }
  if (
    Array.isArray(raw.answers) &&
    raw.answers.every((a) => typeof a === "string") &&
    !raw.items &&
    !raw.questions
  ) {
    return "answer-list"
  }
  if (Array.isArray(raw.items) && raw.items.every((i) => typeof i === "string") && !raw.answers) {
    return "vocab-checklist"
  }
  if (typeof raw.instruction === "string" && Object.keys(raw).length <= 3) {
    return "instruction-only"
  }
  // Prefer checklist over a blank wall when we only have string items.
  if (Array.isArray(raw.items) && raw.items.every((i) => typeof i === "string")) {
    return "vocab-checklist"
  }
  return "instruction-only"
}

export function uiLabelFor(type: BookExerciseUiType): string {
  return BOOK_EXERCISE_UI_LABELS[type]
}

export function sectionDisplayLabel(sectionType: string, subtype?: string): string {
  if (sectionType === "test_practice") {
    return subtype ? `Test practice · ${subtype}` : "Test practice"
  }
  if (sectionType === "vocabulary") return "Vocabulary"
  if (sectionType === "reading") return "Reading"
  return sectionType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
