/** Detect / expand odd-one-out and description↔label matching shapes from DeepSeek JSON. */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

export function isOddOneOutLists(raw: Record<string, unknown>): boolean {
  if (!Array.isArray(raw.lists) || raw.lists.length === 0) return false
  const lists = raw.lists
  const groupish = lists.every(
    (row) =>
      isRecord(row) &&
      Array.isArray(row.items) &&
      row.items.length >= 3 &&
      row.items.every((x) => typeof x === "string"),
  )
  if (!groupish) return false
  const instruction = typeof raw.instruction === "string" ? raw.instruction : ""
  if (/odd\s*one\s*out|cross\s*out|which .+ (is )?different|does not belong/i.test(instruction)) {
    return true
  }
  return lists.some((row) => isRecord(row) && row.answer != null)
}

export type OddOneOutGroup = {
  items: string[]
  answer?: string
}

export function getOddOneOutGroups(raw: Record<string, unknown>): OddOneOutGroup[] {
  if (!Array.isArray(raw.lists)) return []
  return raw.lists
    .filter(isRecord)
    .map((row) => ({
      items: asStringArray(row.items),
      ...(row.answer != null ? { answer: String(row.answer) } : {}),
    }))
    .filter((g) => g.items.length > 0)
}

export function expandSemanticMatches(
  matches: unknown[],
  answers?: unknown,
): { left: Array<Record<string, unknown>>; right: Array<Record<string, unknown>> } | null {
  const rows = matches.filter(isRecord)
  if (rows.length === 0) return null

  const first = rows[0]
  const leftKey =
    first.description != null
      ? "description"
      : first.heading != null
        ? "heading"
        : first.prompt != null
          ? "prompt"
          : first.left != null
            ? "left"
            : null
  const rightKey =
    first.animal != null
      ? "animal"
      : first.answer != null && leftKey === "heading"
        ? "answer"
        : first.right != null
          ? "right"
          : first.match != null && leftKey === "description"
            ? "match"
            : null

  if (
    (first.word != null && (first.definition != null || first.meaning != null)) ||
    (first.word != null && first.answer != null && leftKey == null)
  ) {
    return null
  }
  if (!leftKey || !rightKey) return null

  const left = rows.map((row, i) => ({
    number: row.number ?? i + 1,
    text: String(row[leftKey] ?? ""),
  }))

  const targets = rows.map((row) => {
    const raw = String(row[rightKey] ?? "")
    const stripped = raw.replace(/^[a-z]\.\s*/i, "").trim()
    return stripped || raw
  })

  const ansMap = isRecord(answers) ? answers : null
  const letterToText: Record<string, string> = {}
  if (ansMap) {
    for (let i = 0; i < rows.length; i++) {
      const num = String(rows[i].number ?? i + 1)
      const letter = String(ansMap[num] ?? "").trim().toLowerCase()
      if (/^[a-z]$/.test(letter)) letterToText[letter] = targets[i]
    }
  }

  const letters = Object.keys(letterToText).sort()
  const right =
    letters.length === rows.length
      ? letters.map((letter) => ({ letter, text: letterToText[letter] }))
      : targets.map((text, i) => ({
          letter: String.fromCharCode(97 + i),
          text,
        }))

  return { left, right }
}

export function matchesToParaphrases(matches: unknown[]): Array<Record<string, unknown>> | null {
  const rows = matches.filter(isRecord)
  if (rows.length === 0) return null
  const first = rows[0]
  if (first.word == null) return null
  if (first.definition != null || first.meaning != null) {
    return rows.map((m) => ({
      original: String(m.word ?? ""),
      paraphrase: String(m.definition ?? m.meaning ?? m.answer ?? ""),
    }))
  }
  if (first.answer != null && typeof first.answer === "string") {
    return rows.map((m) => ({
      original: String(m.word ?? m.heading ?? ""),
      paraphrase: String(m.answer ?? ""),
    }))
  }
  return null
}
