import type { BookExerciseRaw } from "./types"
import { collectWordBoxItems, isCueWordBox } from "./word-box"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function expandJobsMatching(
  jobs: unknown[],
  answers?: unknown,
): { left: Array<Record<string, unknown>>; right: Array<Record<string, unknown>> } {
  const rows = jobs.filter(isRecord)
  const left = rows.map((j, i) => ({
    number: j.number ?? i + 1,
    text: String(j.job ?? j.name ?? j.term ?? ""),
  }))

  const ansMap = isRecord(answers) ? answers : null
  const letterToDef: Record<string, string> = {}
  if (ansMap) {
    for (const j of rows) {
      const num = String(j.number ?? "")
      const letter = String(ansMap[num] ?? "").trim().toLowerCase()
      if (letter && /^[a-z]$/.test(letter)) {
        letterToDef[letter] = String(j.definition ?? j.meaning ?? "")
      }
    }
  }
  const letters = Object.keys(letterToDef).sort()
  const right =
    letters.length === rows.length
      ? letters.map((letter) => ({ letter, text: letterToDef[letter] }))
      : rows.map((j, i) => ({
          letter: String.fromCharCode(97 + i),
          text: String(j.definition ?? j.meaning ?? ""),
        }))

  return { left, right }
}

/**
 * Map DeepSeek / source book JSON shapes onto the fields existing renderers understand.
 * Does not invent content — only renames / aliases.
 * `answers` is the unit answer-key slice for this exercise (used to letter-order match options).
 */
export function normalizeBookExercise(raw: BookExerciseRaw, answers?: unknown): BookExerciseRaw {
  const out: BookExerciseRaw = { ...raw }

  if (out.audio != null && out.audio_track == null) {
    out.audio_track = out.audio
  }
  // Drop broken OCR markers so UI never shows "D??"
  for (const key of ["audio_track", "audio"] as const) {
    const v = out[key]
    if (v == null) continue
    if (/\?/.test(String(v))) {
      delete out[key]
    }
  }
  if (out.speaker1 != null && out.speaker_1 == null) {
    out.speaker_1 = out.speaker1
  }
  if (out.speaker2 != null && out.speaker_2 == null) {
    out.speaker_2 = out.speaker2
  }
  if (out.word_bank != null && out.words == null) {
    out.words = out.word_bank
  }
  if (out.adverbs != null && out.adjectives == null) {
    out.adjectives = out.adverbs
  }

  const box = collectWordBoxItems(out)
  if (box.length > 0 && asStringArray(out.words).length === 0) {
    out.words = box
  }
  if (asStringArray(out.phrases).length > 0 && asStringArray(out.words).length === 0) {
    out.words = asStringArray(out.phrases)
  }

  if (Array.isArray(out.sentences) && out.sentences.length > 0) {
    out.sentences = out.sentences.map((s, i) => {
      if (typeof s === "string") return { sentence: s, number: i + 1 }
      if (!isRecord(s)) return s
      if (typeof s.text === "string" && s.sentence == null) {
        return { ...s, sentence: s.text }
      }
      return s
    })

    const first = out.sentences[0]
    if (isRecord(first) && typeof first.sentence === "string") {
      if (!Array.isArray(out.items) || out.items.length === 0) {
        out.items = out.sentences.map((s, i) => {
          if (!isRecord(s)) return { sentence: String(s) }
          return {
            sentence: String(s.sentence ?? s.text ?? ""),
            ...(s.answer != null ? { answer: s.answer } : {}),
            number: s.number ?? i + 1,
          }
        })
      }
    }
  }

  if ((Array.isArray(out.positive) || Array.isArray(out.negative)) && !out.table) {
    out.table = {
      ...(Array.isArray(out.positive) ? { Positive: out.positive } : {}),
      ...(Array.isArray(out.negative) ? { Negative: out.negative } : {}),
    }
    if (!Array.isArray(out.items) || out.items.length === 0) {
      out.items = [...asStringArray(out.positive), ...asStringArray(out.negative)]
    }
  }

  if (Array.isArray(out.matches) && out.matches.length > 0 && !Array.isArray(out.paraphrases)) {
    out.paraphrases = out.matches.map((m) => {
      if (!isRecord(m)) return { original: String(m) }
      return {
        original: String(m.word ?? m.left ?? m.term ?? m.begin ?? ""),
        paraphrase: String(
          m.definition ?? m.match ?? m.right ?? m.meaning ?? m.end ?? "",
        ),
      }
    })
  }

  if (
    Array.isArray(out.jobs) &&
    out.jobs.length > 0 &&
    (!Array.isArray(out.left) || out.left.length === 0) &&
    (!Array.isArray(out.beginnings) || out.beginnings.length === 0)
  ) {
    const { left, right } = expandJobsMatching(out.jobs, answers)
    out.left = left
    out.right = right
    out.beginnings = left
    out.endings = right
  }

  if (
    Array.isArray(out.meanings) &&
    out.meanings.every((m) => typeof m === "string") &&
    (!Array.isArray(out.items) || out.items.length === 0)
  ) {
    out.items = asStringArray(out.meanings)
    if (!Array.isArray(out.right) || out.right.length === 0) {
      out.right = asStringArray(out.meanings)
    }
  }

  const cueBox = isCueWordBox(out)
  if (
    !cueBox &&
    Array.isArray(out.adjectives) &&
    (!Array.isArray(out.items) || out.items.length === 0) &&
    (!Array.isArray(out.sentences) || out.sentences.length === 0)
  ) {
    out.items = asStringArray(out.adjectives)
  }
  if (
    !cueBox &&
    Array.isArray(out.words) &&
    (!Array.isArray(out.items) || out.items.length === 0) &&
    (!Array.isArray(out.sentences) || out.sentences.length === 0) &&
    typeof out.text !== "string" &&
    typeof out.passage !== "string" &&
    !Array.isArray(out.answers)
  ) {
    out.items = asStringArray(out.words)
  }

  if (
    isRecord(out.categories) &&
    Array.isArray(out.words) &&
    !out.answers &&
    !out.table
  ) {
    out.answers = out.categories
    out.items = asStringArray(out.words)
  }

  if (Array.isArray(out.collocations) && out.collocations.length > 0) {
    const bank: string[] = []
    const sentences: Array<Record<string, unknown>> = []
    for (const c of out.collocations) {
      if (!isRecord(c)) continue
      const noun = String(c.noun ?? c.word ?? "")
      const opts = Array.isArray(c.options) ? c.options.map(String) : []
      for (const o of opts) if (!bank.includes(o)) bank.push(o)
      sentences.push({
        sentence: noun ? `${noun}: ______` : "______",
        number: c.number,
      })
    }
    if (bank.length && (!Array.isArray(out.words) || out.words.length === 0)) {
      out.words = bank
    }
    if (sentences.length && (!Array.isArray(out.sentences) || out.sentences.length === 0)) {
      out.sentences = sentences
      out.items = sentences.map((s, i) => ({
        sentence: String(s.sentence ?? ""),
        number: s.number ?? i + 1,
      }))
    }
  }

  if (typeof out.passage === "string" && Array.isArray(out.words) && typeof out.text !== "string") {
    out.text = out.passage
  }

  return out
}
