/** Parse `YYYY-MM-DD` into a local Date (no timezone shift). */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1, 12, 0, 0, 0)
}

/** Format a Date as `YYYY-MM-DD`. */
export function formatYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Display label e.g. "3 Aug 2026". */
export function formatYmdLabel(ymd: string): string {
  const date = parseYmd(ymd)
  if (Number.isNaN(date.getTime())) return ymd
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
