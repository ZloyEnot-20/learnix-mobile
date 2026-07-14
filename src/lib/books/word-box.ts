import type { BookExerciseRaw } from "./types"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

const BOX_FIELDS = [
  "nouns",
  "words",
  "word_bank",
  "word_box",
  "adjectives",
  "adverbs",
  "phrases",
  "idioms",
  "phrasal_verbs",
  "advantages",
  "places",
  "ideas",
] as const

/** Collect lexical box items as shown in the printed book. */
export function collectWordBoxItems(raw: BookExerciseRaw | Record<string, unknown>): string[] {
  const out = new Set<string>()
  const add = (arr: string[]) => {
    for (const w of arr) {
      const t = w.trim()
      if (t) out.add(t)
    }
  }

  for (const key of BOX_FIELDS) {
    add(asStringArray(raw[key]))
  }

  const verbs = (raw as { verbs?: unknown }).verbs
  if (Array.isArray(verbs) && verbs.every((v) => typeof v === "string")) {
    add(asStringArray(verbs))
  }

  add(asStringArray((raw as { words_a?: unknown }).words_a))
  add(asStringArray((raw as { words_b?: unknown }).words_b))

  const lists = (raw as { lists?: unknown }).lists
  if (Array.isArray(lists)) {
    for (const row of lists) {
      if (typeof row === "string") out.add(row)
      else if (isRecord(row)) add(asStringArray(row.items ?? row.words ?? row.list))
    }
  }

  const idioms = (raw as { idioms?: unknown }).idioms
  if (Array.isArray(idioms)) {
    for (const row of idioms) {
      if (typeof row === "string") out.add(row)
      else if (isRecord(row) && typeof row.idiom === "string") out.add(row.idiom.trim())
    }
  }

  return [...out]
}

/** True when the box is a cue list to annotate (not a tap-to-select checklist). */
export function isCueWordBox(raw: BookExerciseRaw | Record<string, unknown>): boolean {
  if (
    Array.isArray((raw as { nouns?: unknown }).nouns) &&
    asStringArray((raw as { nouns?: unknown }).nouns).length > 0
  ) {
    return true
  }
  const instruction = typeof raw.instruction === "string" ? raw.instruction : ""
  return /describe these nouns|note the adjectives|note .+ you hear|which describe these|for these nouns/i.test(
    instruction,
  )
}
