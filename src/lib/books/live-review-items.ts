import { formatAnswerKeyList } from "./gap-text"
import type { LiveStudentProgress } from "./types"

export type LiveReviewItem = {
  id: string
  label: string
  given: string
  expected: string
  ok: boolean | null
}

/** Build per-item review rows from graded score or the published answer key. */
export function buildLiveReviewItems(
  me: LiveStudentProgress | null | undefined,
  answerKey: unknown,
): LiveReviewItem[] | undefined {
  if (me?.scoreDetail?.items?.length) {
    return me.scoreDetail.items.map((item) => ({
      id: item.id,
      label: item.label ?? item.id,
      given: item.given,
      expected: item.expected,
      ok: item.ok ?? null,
    }))
  }

  const fallback = formatAnswerKeyList(answerKey)
  if (!fallback.length) return undefined

  return fallback.map((expected, i) => ({
    id: String(i + 1),
    label: `#${i + 1}`,
    given: "—",
    expected,
    ok: null,
  }))
}
