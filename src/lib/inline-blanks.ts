/**
 * Keep fill-in blanks inline with surrounding words.
 * Scraped HTML often yields orphan lines like:
 *   "…with some\n[8]\ninto a digester"
 * which must become:
 *   "…with some [8] into a digester"
 *
 * Do NOT glue a new list/sentence that starts with a capital letter
 * after a blank unless the text before the blank ends in a determiner
 * (the / a / some / …).
 */

const BLANK_ONLY = /^\[\d+\]$/
const ENDS_WITH_BLANK = /\[\d+\]\s*$/

/** Last word before [N] that strongly implies the blank continues mid-phrase. */
const DETERMINER_LAST = new Set([
  "the",
  "a",
  "an",
  "some",
  "any",
  "much",
  "many",
  "few",
  "more",
  "most",
  "their",
  "its",
  "his",
  "her",
  "our",
  "my",
  "your",
  "this",
  "that",
  "these",
  "those",
  "no",
  "each",
  "every",
  "other",
  "another",
  "such",
])

function isArrowLine(line: string): boolean {
  return line === "→" || line === "↓"
}

function lastWordBeforeBlank(text: string): string {
  const before = text.replace(/\s*\[\d+\]\s*$/, "").trim()
  const parts = before.split(/\s+/)
  const last = parts[parts.length - 1] ?? ""
  return last.toLowerCase().replace(/[.,;:!?]+$/g, "")
}

/** Subject-like starts that usually begin a new list item / clause, not a blank tail. */
const NEW_CLAUSE_START = new Set([
  "they",
  "he",
  "she",
  "we",
  "you",
  "i",
  "there",
  "this",
  "that",
  "these",
  "those",
])

/** Verbs that often leave the blank mid-predicate before a possessive/object. */
const SOFT_CONTINUE_LAST = new Set([
  "have",
  "has",
  "had",
  "keep",
  "leave",
  "use",
  "place",
  "put",
  "make",
  "take",
  "give",
  "get",
  "find",
  "need",
  "spend",
  "bring",
  "still",
])

function firstWord(line: string): string {
  return (line.split(/\s+/)[0] ?? "").toLowerCase().replace(/[.,;:!?]+$/g, "")
}

function shouldTakeFollowingLine(mergedWithBlank: string, nextLine: string): boolean {
  if (!nextLine || isArrowLine(nextLine) || BLANK_ONLY.test(nextLine)) return false
  const last = lastWordBeforeBlank(mergedWithBlank)
  if (DETERMINER_LAST.has(last) || SOFT_CONTINUE_LAST.has(last)) return true
  if (!/^[a-z(]/.test(nextLine)) return false
  if (NEW_CLAUSE_START.has(firstWord(nextLine))) return false
  return true
}

/**
 * Join `[N]` placeholders that sat alone on a line (or at EOL) with
 * neighbouring text so blanks never force a stylistic line break mid-phrase.
 */
export function normalizeInlineBlankContent(content: string): string {
  if (!content.trim()) return content

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const firstPass: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!BLANK_ONLY.test(line)) {
      firstPass.push(line)
      continue
    }

    const prev =
      firstPass.length > 0 && !isArrowLine(firstPass[firstPass.length - 1])
        ? firstPass.pop()!
        : null
    const withBlank = [prev, line].filter(Boolean).join(" ")
    const candidate = lines[i + 1]
    if (candidate && shouldTakeFollowingLine(withBlank, candidate)) {
      firstPass.push(`${withBlank} ${candidate}`)
      i += 1
    } else {
      firstPass.push(withBlank)
    }
  }

  const secondPass: string[] = []
  for (let i = 0; i < firstPass.length; i++) {
    const line = firstPass[i]
    const next = firstPass[i + 1]
    if (next && ENDS_WITH_BLANK.test(line) && shouldTakeFollowingLine(line, next)) {
      secondPass.push(`${line} ${next}`)
      i += 1
      continue
    }
    secondPass.push(line)
  }

  return secondPass.join("\n")
}
