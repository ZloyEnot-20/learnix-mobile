import type { BookExerciseRaw, BookExerciseUiType } from "./types"
import { BOOK_EXERCISE_UI_LABELS } from "./types"
import { collectWordBoxItems, isCueWordBox } from "./word-box"
import { isListeningTableShape } from "./listening-table"
import { isOddOneOutLists } from "./match-shapes"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function itemsAreFillBlanks(items: unknown): boolean {
  if (!Array.isArray(items) || items.length === 0) return false
  return items.every((it) => isRecord(it) && typeof it.sentence === "string")
}

function itemsAreParaphrasePairs(items: unknown): boolean {
  if (!Array.isArray(items) || items.length === 0) return false
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

function questionsAreMcq(questions: unknown): boolean {
  if (!Array.isArray(questions) || questions.length === 0) return false
  return questions.every(
    (q) =>
      isRecord(q) &&
      Array.isArray(q.options) &&
      q.options.length > 0 &&
      (typeof q.text === "string" || typeof q.statement === "string"),
  )
}

function questionsAreShortAnswer(questions: unknown): boolean {
  if (!Array.isArray(questions) || questions.length === 0) return false
  if (questions.every((q) => typeof q === "string")) return false
  return questions.every(
    (q) =>
      isRecord(q) &&
      (typeof q.text === "string" || typeof q.statement === "string") &&
      !Array.isArray(q.options),
  )
}

function isTfngStyle(questions: unknown): boolean {
  if (!Array.isArray(questions) || questions.length === 0) return false
  return questions.some((q) => {
    if (!isRecord(q)) return false
    const a = String(q.answer ?? "").toLowerCase()
    return /^(true|false|not\s*given|yes|no)$/i.test(a)
  })
}

function hasMatchingPairs(raw: BookExerciseRaw): boolean {
  return (
    (Array.isArray(raw.beginnings) && Array.isArray(raw.endings)) ||
    (Array.isArray(raw.people) && Array.isArray(raw.statements)) ||
    (Array.isArray(raw.left) && Array.isArray(raw.right))
  )
}

export function inferExerciseUiType(raw: BookExerciseRaw): BookExerciseUiType {
  if (raw.section_type === "test_practice" || raw.notes) return "listening-notes"
  if (raw.has_graph) return "graph-task"
  if (raw.has_image) return "image-prompt"

  if (questionsAreMcq(raw.questions)) return "multiple-choice"

  if (questionsAreShortAnswer(raw.questions)) {
    if (isTfngStyle(raw.questions)) return "reading-tfng"
    return "short-answer"
  }

  if (hasMatchingPairs(raw)) return "matching-pairs"

  if (isOddOneOutLists(raw)) return "odd-one-out"

  if (typeof raw.summary === "string") return "summary-completion"
  if (typeof raw.text === "string" && Array.isArray(raw.words)) return "gap-fill-passage"
  if (typeof raw.passage === "string" && Array.isArray(raw.words) && !raw.questions) {
    return "gap-fill-passage"
  }
  // Numbered gaps in a passage (e.g. "1. ______ … 2. ______") even without an inline word bank
  if (
    typeof raw.passage === "string" &&
    !raw.questions &&
    /(?:\d+[.)]\s*)?_{2,}/.test(raw.passage)
  ) {
    return "gap-fill-passage"
  }

  if (Array.isArray(raw.paraphrases) || itemsAreParaphrasePairs(raw.items)) {
    return "paraphrase-pairs"
  }
  if (isListeningTableShape(raw)) return "listening-table"
  if (raw.table && isRecord(raw.table) && !Array.isArray((raw.table as { rows?: unknown }).rows)) {
    return "vocab-table"
  }

  if (Array.isArray(raw.questions) && raw.questions.every((q) => typeof q === "string")) {
    return "discussion-questions"
  }

  if (typeof raw.topic === "string") return "speaking-topic"
  if (raw.speaker_1_expressions || raw.speaker_2_expressions) return "expression-notes"
  if (raw.audio_track && (raw.speaker_1 || raw.speaker_2)) return "listening-match"
  if (raw.audio_track && itemsAreSpeakerRows(raw.items)) return "listening-structured"

  if (Array.isArray(raw.sentences) && (raw.adjectives || raw.words || raw.adverbs)) {
    return "sentence-wordbox"
  }

  // Sentences with blanks (_____), with or without an inline word bank
  if (
    Array.isArray(raw.sentences) &&
    raw.sentences.some(
      (s) =>
        isRecord(s) &&
        typeof (s.sentence ?? s.text) === "string" &&
        /_{2,}|\.{3,}|…/.test(String(s.sentence ?? s.text)),
    )
  ) {
    return "sentence-wordbox"
  }

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

  // Word box (nouns / phrases / idioms…) before checklist — cue banks must not become checklists
  {
    const box = collectWordBoxItems(raw)
    if (
      box.length > 0 &&
      !raw.questions &&
      !raw.passage &&
      !raw.summary &&
      !(Array.isArray(raw.sentences) && raw.sentences.length > 0)
    ) {
      if (
        isCueWordBox(raw) ||
        (Array.isArray(raw.nouns) && raw.nouns.length > 0) ||
        ((raw.audio_track || raw.audio) &&
          (Array.isArray(raw.phrases) ||
            Array.isArray(raw.idioms) ||
            Array.isArray(raw.phrasal_verbs) ||
            Array.isArray(raw.nouns)))
      ) {
        return "word-box-notes"
      }
    }
  }

  if (Array.isArray(raw.items) && raw.items.every((i) => typeof i === "string") && !raw.answers) {
    return "vocab-checklist"
  }

  {
    const box = collectWordBoxItems(raw)
    if (
      box.length > 0 &&
      !raw.questions &&
      !raw.passage &&
      !raw.summary &&
      !(Array.isArray(raw.sentences) && raw.sentences.length > 0) &&
      typeof raw.instruction === "string"
    ) {
      return "word-box-notes"
    }
  }

  if (typeof raw.passage === "string" && !raw.questions) return "passage-read"

  if (typeof raw.instruction === "string" && Object.keys(raw).length <= 3) {
    return "instruction-only"
  }

  if (Array.isArray(raw.items) && raw.items.every((i) => typeof i === "string")) {
    return "vocab-checklist"
  }

  return "instruction-only"
}

export function uiLabelFor(type: BookExerciseUiType): string {
  return BOOK_EXERCISE_UI_LABELS[type]
}

export function sectionDisplayLabel(
  sectionType: string,
  subtype?: string,
  title?: string,
): string {
  const cleaned = typeof title === "string" ? title.trim() : ""
  if (cleaned) return cleaned
  if (sectionType === "test_practice") {
    return subtype ? `Test practice · ${subtype}` : "Test practice"
  }
  if (sectionType === "vocabulary") return "Vocabulary"
  if (sectionType === "reading") return "Reading"
  return sectionType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
