export interface LanguageSkillProfile {
  score: number
  confidence: number
  level: number
  hasData: boolean
  dimensions?: {
    grammar: number
    vocabulary: number
    fluency: number
    pronunciation: number
  }
}

export interface StudentLanguageProfile {
  studentId: string
  orgId: string
  grammar: LanguageSkillProfile
  vocabulary: LanguageSkillProfile
  speaking: LanguageSkillProfile
  reading: LanguageSkillProfile
  listening: LanguageSkillProfile
  writing: LanguageSkillProfile
  overall: {
    score: number
    level: number
    confidence: number
  }
  lastComputedAt?: string
}

export type LanguageSkillKey = "grammar" | "vocabulary" | "reading" | "writing" | "speaking"
