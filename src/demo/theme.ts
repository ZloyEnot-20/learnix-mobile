export const PURPLE = {
  deep: "#4A2C7A",
  mid: "#6B3FA0",
  soft: "#EDE4F7",
  wash: "#F7F2FC",
  line: "#C4A8E0",
  note: "#5B3A8C",
  pageBg: "#E8E0F0",
}

export function normalizePhrase(v: string) {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
}

export function answersMatch(given: string, accepted: string | string[]) {
  const g = normalizePhrase(given)
  if (!g) return false
  const list = Array.isArray(accepted) ? accepted : [accepted]
  return list.some((a) => {
    const parts = a.split("/").map((p) => normalizePhrase(p.replace(/^\(|\)$/g, "")))
    return parts.some((p) => p === g || g.includes(p) || p.includes(g))
  })
}
