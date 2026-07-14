import type { BookExerciseRaw } from "./types"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

/** Short headwords / phrases as in a printed word box — not MC stems or full sentences. */
function looksLexical(s: string): boolean {
  const t = s.trim()
  if (!t || t.length > 72) return false
  if (/^[A-Z]\.\s/.test(t) && t.length > 40) return false
  const words = t.split(/\s+/).filter(Boolean)
  return words.length <= 8
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
  // DeepSeek field names used in units (e.g. U8 services / circles)
  "services",
  "illustrations",
  "positive",
  "negative",
  "serious",
] as const

function addFlatObjectLists(
  add: (arr: string[]) => void,
  obj: unknown,
  opts?: { lexicalOnly?: boolean },
) {
  if (!isRecord(obj)) return
  for (const vals of Object.values(obj)) {
    const list = asStringArray(vals)
    if (list.length === 0) continue
    if (opts?.lexicalOnly) {
      const lexical = list.filter(looksLexical)
      if (lexical.length >= Math.ceil(list.length * 0.6)) add(lexical)
    } else {
      add(list)
    }
  }
}

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

  // circle1 / circle2 / circle3 (U8 collocation circles)
  for (const key of Object.keys(raw)) {
    if (/^circle\d+$/i.test(key)) add(asStringArray((raw as Record<string, unknown>)[key]))
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

  addFlatObjectLists(add, (raw as { categories?: unknown }).categories, { lexicalOnly: true })
  addFlatObjectLists(add, (raw as { columns?: unknown }).columns, { lexicalOnly: true })

  const table = (raw as { table?: unknown }).table
  if (isRecord(table) && !Array.isArray(table)) {
    addFlatObjectLists(add, table, { lexicalOnly: true })
  }

  const items = (raw as { items?: unknown }).items
  if (Array.isArray(items) && items.length > 0 && items.every((i) => typeof i === "string")) {
    const list = asStringArray(items)
    const lexical = list.filter(looksLexical)
    if (lexical.length >= Math.ceil(list.length * 0.7)) add(lexical)
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
