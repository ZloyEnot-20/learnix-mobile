import AsyncStorage from "@react-native-async-storage/async-storage"
import type { VocabDeck, VocabWord } from "../types/vocabulary"

const KEY_PREFIX = "learnix_learning_progress:"

export interface LearnedWord {
  term: string
  partOfSpeech: string
  definition: string
  example: string
  translation: string
  translationUz: string
  deckSlug?: string
  deckTitle?: string
  learnedAt: string
}

export interface VocabQuizResult {
  deckSlug: string
  deckTitle: string
  correct: number
  total: number
  completedAt: string
  source: "game" | "homework"
}

export interface GameExerciseResult {
  slug: string
  title: string
  topic: string
  correctCount: number
  totalQuestions: number
  completedAt: string
}

interface LearningProgress {
  words: LearnedWord[]
  vocabResults: VocabQuizResult[]
  gameResults: GameExerciseResult[]
}

const memory = new Map<string, LearningProgress>()

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

function emptyProgress(): LearningProgress {
  return { words: [], vocabResults: [], gameResults: [] }
}

function wordKey(word: Pick<LearnedWord, "term" | "deckSlug">): string {
  return `${word.deckSlug ?? "general"}::${word.term.toLowerCase()}`
}

async function loadProgress(userId: string): Promise<LearningProgress> {
  const cached = memory.get(userId)
  if (cached) return cached

  try {
    const raw = await AsyncStorage.getItem(storageKey(userId))
    if (!raw) {
      const empty = emptyProgress()
      memory.set(userId, empty)
      return empty
    }
    const parsed = JSON.parse(raw) as LearningProgress
    const progress: LearningProgress = {
      words: parsed.words ?? [],
      vocabResults: parsed.vocabResults ?? [],
      gameResults: parsed.gameResults ?? [],
    }
    memory.set(userId, progress)
    return progress
  } catch {
    const empty = emptyProgress()
    memory.set(userId, empty)
    return empty
  }
}

async function saveProgress(userId: string, progress: LearningProgress): Promise<void> {
  memory.set(userId, progress)
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(progress))
}

export async function recordVocabDeckCompletion(
  userId: string,
  deck: VocabDeck,
  correct: number,
  total: number,
  source: "game" | "homework",
): Promise<void> {
  const progress = await loadProgress(userId)
  const now = new Date().toISOString()
  const existing = new Set(progress.words.map((w) => wordKey(w)))

  for (const word of deck.words) {
    const entry = toLearnedWord(word, deck, now)
    const key = wordKey(entry)
    if (existing.has(key)) continue
    existing.add(key)
    progress.words.push(entry)
  }

  progress.vocabResults.unshift({
    deckSlug: deck.slug,
    deckTitle: deck.title,
    correct,
    total,
    completedAt: now,
    source,
  })
  progress.vocabResults = progress.vocabResults.slice(0, 100)

  await saveProgress(userId, progress)
}

export async function recordGameExerciseResult(
  userId: string,
  result: Omit<GameExerciseResult, "completedAt">,
): Promise<void> {
  const progress = await loadProgress(userId)
  progress.gameResults.unshift({
    ...result,
    completedAt: new Date().toISOString(),
  })
  progress.gameResults = progress.gameResults.slice(0, 100)
  await saveProgress(userId, progress)
}

function toLearnedWord(word: VocabWord, deck: VocabDeck, learnedAt: string): LearnedWord {
  return {
    term: word.term,
    partOfSpeech: word.partOfSpeech,
    definition: word.definition,
    example: word.example,
    translation: word.translation,
    translationUz: word.translationUz,
    deckSlug: deck.slug,
    deckTitle: deck.title,
    learnedAt,
  }
}

export async function getLearnedWordCount(userId: string): Promise<number> {
  const progress = await loadProgress(userId)
  return progress.words.length
}

export async function pickRandomLearnedWords(
  userId: string,
  count: number,
): Promise<LearnedWord[]> {
  const progress = await loadProgress(userId)
  if (progress.words.length === 0) return []

  const pool = [...progress.words]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.min(count, pool.length))
}

export interface VocabularyReviewPreview {
  totalCount: number
  previewWords: LearnedWord[]
}

export async function getVocabularyReviewPreview(
  userId: string,
  previewCount = 5,
): Promise<VocabularyReviewPreview | null> {
  const progress = await loadProgress(userId)
  if (progress.words.length === 0) return null

  const previewWords = await pickRandomLearnedWords(userId, previewCount)
  return {
    totalCount: progress.words.length,
    previewWords,
  }
}
