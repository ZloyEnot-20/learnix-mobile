/**
 * Flatten Cambridge / DeepSeek structured note outlines into display lines.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export type FlattenedNoteLine = {
  heading?: string
  text: string
}

function titleCaseKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function isSimpleNotesBody(notes: unknown): boolean {
  if (!isRecord(notes)) return false
  const keys = Object.keys(notes).filter((k) => k !== "title" && k !== "body" && k !== "blanks")
  return Array.isArray(notes.body) && keys.length === 0
}

export function isStructuredNotes(notes: unknown): boolean {
  if (!isRecord(notes)) return false
  if (isSimpleNotesBody(notes)) return false
  return Object.keys(notes).some((k) => k !== "title" && k !== "blanks")
}

function walk(value: unknown, out: FlattenedNoteLine[], heading?: string): void {
  if (value == null) return
  if (typeof value === "string") {
    const t = value.trim()
    if (t) out.push(heading ? { heading, text: t } : { text: t })
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) walk(item, out, heading)
    return
  }
  if (isRecord(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (k === "blanks" || k === "title") continue
      walk(v, out, titleCaseKey(k))
    }
  }
}

export function flattenNotes(notes: unknown): FlattenedNoteLine[] {
  if (typeof notes === "string") {
    return notes
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ text }))
  }
  if (!isRecord(notes)) return []
  if (isSimpleNotesBody(notes)) {
    const body = Array.isArray(notes.body)
      ? notes.body.filter((x): x is string => typeof x === "string")
      : []
    return body.map((text) => ({ text }))
  }
  const out: FlattenedNoteLine[] = []
  walk(notes, out)
  return out
}

export function notesTitle(notes: unknown): string | undefined {
  if (!isRecord(notes)) return undefined
  return typeof notes.title === "string" ? notes.title : undefined
}
