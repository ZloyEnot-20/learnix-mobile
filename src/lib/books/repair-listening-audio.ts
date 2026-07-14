/**
 * Repair / display helpers for Cambridge listening markers (e.g. "D??").
 */

export function parseListeningTrack(v: unknown): number | null {
  if (v == null) return null
  const s = String(v).trim()
  const m = s.match(/^D?0*(\d+)$/i)
  if (!m) return null
  return Number(m[1])
}

/** Never show "D??" — return null if broken. */
export function displayListeningTrack(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || /\?/.test(s)) return null
  const n = parseListeningTrack(s)
  if (n == null) return s
  return /^D/i.test(s) ? `D${String(n).padStart(2, "0")}` : String(n).padStart(2, "0")
}
