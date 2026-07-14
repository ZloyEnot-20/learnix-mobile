/**
 * True when learners must inflect / derive word forms rather than
 * picking the lemma from the box as-is (so blanks must be typed).
 */
export function requiresTypedWordForms(instruction: unknown): boolean {
  if (typeof instruction !== "string") return false
  return (
    /(?:may\s+need\s+to\s+|need\s+to\s+)?change\s+the\s+form/i.test(instruction) ||
    /correct\s+form\s+of\s+the\s+words/i.test(instruction) ||
    /form\s+of\s+the\s+words?\s+in\s+the\s+box/i.test(instruction)
  )
}
