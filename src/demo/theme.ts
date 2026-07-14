/** Academic English textbook page tokens (matches web textbook-theme). */
export const TEXTBOOK = {
  pageBg: "#f0f2f5",
  content: "#ffffff",
  text: "#1a1a1a",
  heading: "#2c3e50",
  headingAccent: "#2980b9",
  accent: "#3498db",
  accentSoft: "#d6eaf8",
  accentWash: "#eaf2f8",
  accentDeep: "#1a5276",
  correct: "#27ae60",
  correctSoft: "#e8f8f5",
  correctDeep: "#0e6655",
  orangeSoft: "#fdebd0",
  orange: "#a04000",
  tipSoft: "#fef9e7",
  tip: "#f1c40f",
  tipBorder: "#f9e79f",
  tipText: "#7d6608",
  audio: "#e74c3c",
  muted: "#7f8c8d",
  mutedSoft: "#ecf0f1",
  border: "#dce1e6",
  borderAlt: "#e8eaed",
  exerciseBg: "#f8f9fa",
  type: {
    unitTitle: 22,
    unitSubtitle: 14,
    section: 16,
    body: 13,
    bodyLh: 19,
    instruction: 13,
    instructionLh: 19,
    caption: 11,
    chip: 12,
    exLabel: 13,
  },
  space: {
    pagePadX: 14,
    pagePadY: 14,
    exercisePadY: 10,
    exercisePadX: 12,
    exerciseGap: 14,
    sectionMb: 12,
  },
} as const

/** @deprecated Prefer TEXTBOOK — aliased so existing PURPLE.* refs keep compiling. */
export const PURPLE = {
  deep: TEXTBOOK.heading,
  mid: TEXTBOOK.headingAccent,
  soft: TEXTBOOK.accentSoft,
  wash: TEXTBOOK.pageBg,
  line: TEXTBOOK.border,
  note: TEXTBOOK.muted,
  pageBg: TEXTBOOK.pageBg,
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
