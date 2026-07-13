/**
 * Parse Cambridge-style numbered gaps in a passage/summary:
 * "who were the 1 of colonial times" → gap index 0 for "1".
 * Only treats contiguous integers starting at 1 as gaps (not years).
 */

export type GapSegment =
  | { type: "text"; text: string }
  | { type: "gap"; index: number; marker: string }

export function parseNumberedGaps(text: string, expectedCount?: number): {
  segments: GapSegment[]
  gapCount: number
} {
  if (!text) return { segments: [], gapCount: 0 }

  // Underscore blanks first: _____ 
  if (/_{2,}/.test(text)) {
    const parts = text.split(/(_{2,})/)
    let gap = 0
    const segments: GapSegment[] = []
    for (const part of parts) {
      if (/^_{2,}$/.test(part)) {
        segments.push({ type: "gap", index: gap++, marker: part })
      } else if (part) {
        segments.push({ type: "text", text: part })
      }
    }
    return { segments, gapCount: gap }
  }

  const re = /\b(\d{1,2})\b/g
  const hits: Array<{ n: number; start: number; end: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const n = Number(m[1])
    if (n >= 1 && n <= 30) {
      hits.push({ n, start: m.index, end: m.index + m[0].length })
    }
  }

  if (!hits.length) {
    return { segments: [{ type: "text", text }], gapCount: 0 }
  }

  const unique = [...new Set(hits.map((h) => h.n))].sort((a, b) => a - b)
  const maxN = expectedCount && expectedCount > 0 ? expectedCount : unique[unique.length - 1]
  const valid = new Set<number>()
  for (let i = 1; i <= maxN; i++) {
    if (!unique.includes(i)) break
    valid.add(i)
  }
  if (valid.size === 0 || !valid.has(1)) {
    return { segments: [{ type: "text", text }], gapCount: 0 }
  }

  const gapHits = hits.filter((h) => valid.has(h.n))
  // Prefer first occurrence of each number
  const seen = new Set<number>()
  const ordered: typeof gapHits = []
  for (const h of gapHits) {
    if (seen.has(h.n)) continue
    seen.add(h.n)
    ordered.push(h)
  }
  ordered.sort((a, b) => a.start - b.start)

  const segments: GapSegment[] = []
  let cursor = 0
  for (const h of ordered) {
    if (h.start > cursor) {
      segments.push({ type: "text", text: text.slice(cursor, h.start) })
    }
    segments.push({ type: "gap", index: h.n - 1, marker: String(h.n) })
    cursor = h.end
  }
  if (cursor < text.length) {
    segments.push({ type: "text", text: text.slice(cursor) })
  }

  return { segments, gapCount: valid.size }
}

export function formatAnswerKeyList(answerKey: unknown): string[] {
  if (Array.isArray(answerKey)) return answerKey.map((a) => String(a ?? ""))
  if (answerKey && typeof answerKey === "object" && !Array.isArray(answerKey)) {
    const vals = Object.values(answerKey as Record<string, unknown>)
    if (vals.every((v) => Array.isArray(v))) {
      // buckets — flatten as "word → bucket"
      const rows: string[] = []
      for (const [bucket, words] of Object.entries(answerKey as Record<string, unknown>)) {
        if (!Array.isArray(words)) continue
        for (const w of words) rows.push(`${w} → ${bucket}`)
      }
      return rows
    }
    return Object.entries(answerKey as Record<string, unknown>).map(
      ([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`,
    )
  }
  if (answerKey == null) return []
  return [String(answerKey)]
}
