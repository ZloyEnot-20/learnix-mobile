import type { BookExerciseRaw } from "./types"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

/**
 * Map DeepSeek / source book JSON shapes onto the fields existing renderers understand.
 * Does not invent content — only renames / aliases.
 */
export function normalizeBookExercise(raw: BookExerciseRaw): BookExerciseRaw {
  const out: BookExerciseRaw = { ...raw }

  if (out.audio != null && out.audio_track == null) {
    out.audio_track = out.audio
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
    Array.isArray(out.adjectives) &&
    (!Array.isArray(out.items) || out.items.length === 0) &&
    (!Array.isArray(out.sentences) || out.sentences.length === 0)
  ) {
    out.items = asStringArray(out.adjectives)
  }
  if (
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

  // collocations[{ noun, options }] → matching-style word bank + sentences
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

  // text + words for gap-fill; allow passage alias
  if (typeof out.passage === "string" && Array.isArray(out.words) && typeof out.text !== "string") {
    out.text = out.passage
  }

  return out
}
