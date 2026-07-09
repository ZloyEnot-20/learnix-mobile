import type { LanguageSkillKey, LanguageSkillProfile, StudentLanguageProfile } from "../types/language-profile"

/** Learnix internal level (1–9) → CEFR label. Mirrors backend CEFR_TO_TOPIC_LEVEL bands. */
const LEARNIX_TO_CEFR = ["", "A1", "A2", "A2", "B1", "B1", "B2", "B2", "C1", "C2"] as const

export const CEFR_LEVEL_COLORS: Record<string, string> = {
  A1: "#10B981",
  A2: "#84CC16",
  B1: "#0EA5E9",
  B2: "#F59E0B",
  C1: "#F43F5E",
  C2: "#A855F7",
}

export const PROFILE_SKILL_ROWS: {
  key: LanguageSkillKey
  label: string
  icon: string
}[] = [
  { key: "grammar", label: "Grammar", icon: "school-outline" },
  { key: "vocabulary", label: "Vocabulary", icon: "book-outline" },
  { key: "reading", label: "Reading", icon: "reader-outline" },
  { key: "writing", label: "Writing", icon: "create-outline" },
  { key: "speaking", label: "Speaking", icon: "mic-outline" },
]

export function learnixLevelToCefr(level: number): string {
  const clamped = Math.max(1, Math.min(9, Math.round(level)))
  return LEARNIX_TO_CEFR[clamped] ?? "A1"
}

export function cefrBackground(level: string): string {
  const color = CEFR_LEVEL_COLORS[level] ?? "#9CA3AF"
  return `${color}22`
}

export function skillCefrLabel(skill: LanguageSkillProfile | undefined): string | null {
  if (!skill?.hasData || !skill.level) return null
  return learnixLevelToCefr(skill.level)
}

export function buildSkillDisplayRows(profile: StudentLanguageProfile | null) {
  return PROFILE_SKILL_ROWS.map((row) => {
    const skill = profile?.[row.key]
    return {
      ...row,
      cefr: skillCefrLabel(skill),
      hasData: Boolean(skill?.hasData),
    }
  })
}
