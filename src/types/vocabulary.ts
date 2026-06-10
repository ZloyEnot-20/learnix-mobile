export type PartOfSpeech = "noun" | "verb" | "adjective" | "adverb" | "phrase"
export type TranslationLang = "ru" | "uz"

export interface VocabWord {
  id: string
  term: string
  partOfSpeech: PartOfSpeech
  definition: string
  example: string
  translation: string
  translationUz: string
}

export interface VocabDeck {
  slug: string
  title: string
  description: string
  level: string
  words: VocabWord[]
}

export function wordTranslation(word: VocabWord, lang: TranslationLang): string {
  if (lang === "uz") return word.translationUz || word.translation
  return word.translation
}

export const VOCAB_SLUG_PREFIX = "vocab:"

export function parseVocabHomeworkSlug(slug: string | undefined): string | null {
  if (!slug) return null
  return slug.startsWith(VOCAB_SLUG_PREFIX) ? slug.slice(VOCAB_SLUG_PREFIX.length) : null
}

export interface TopicMeta {
  topic: string
  title: string
  description: string
  category: "grammar" | "vocabulary" | "speaking"
  levels: string[]
  comingSoon?: boolean
}

export interface TopicSummary extends TopicMeta {
  exerciseCount: number
  questionCount: number
}
