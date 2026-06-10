import AsyncStorage from "@react-native-async-storage/async-storage"
import type { VocabDeck, VocabWord } from "../types/vocabulary"
import { analyticsApi } from "./api"

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
  passed?: boolean
  completedAt: string
}

export type TopicProgressStatus = "not_started" | "in_progress" | "completed"

export interface TopicProgress {
  topic: string
  completedRounds: number
  totalRounds: number
  passedRounds: number
  status: TopicProgressStatus
  bestScorePct: number | null
}

export interface DeckProgress {
  deckSlug: string
  wordsLearned: number
  totalWords: number
  quizAttempts: number
  lastScorePct: number | null
  completed: boolean
}

export type GameHistoryEntry =
  | {
      kind: "exercise"
      id: string
      title: string
      subtitle: string
      route: string
      correctCount: number
      totalQuestions: number
      passed: boolean
      completedAt: string
    }
  | {
      kind: "vocab"
      id: string
      title: string
      subtitle: string
      route: string
      correctCount: number
      totalQuestions: number
      passed: boolean
      completedAt: string
    }

export interface LearningProgressSummary {
  wordsLearned: number
  topicsCompleted: number
  topicsInProgress: number
  decksCompleted: number
  totalGameSessions: number
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

  void analyticsApi
    .recordVocab({
      deckSlug: deck.slug,
      deckTitle: deck.title,
      correct,
      total,
      source,
      words: deck.words.map((w) => ({
        term: w.term,
        partOfSpeech: w.partOfSpeech,
        definition: w.definition,
        deckSlug: deck.slug,
        deckTitle: deck.title,
      })),
    })
    .catch(() => {})
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

export async function getLearningProgress(userId: string): Promise<LearningProgress> {
  return loadProgress(userId)
}

function scorePct(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * 100)
}

function isExercisePassed(
  result: Pick<GameExerciseResult, "correctCount" | "totalQuestions" | "passed">,
  passingScore?: number,
): boolean {
  if (result.passed != null) return result.passed
  if (passingScore != null) return result.correctCount >= passingScore
  return scorePct(result.correctCount, result.totalQuestions) >= 70
}

export function buildTopicProgressMap(
  gameResults: GameExerciseResult[],
  exercises: { topic: string; slug: string; passingScore: number }[],
): Map<string, TopicProgress> {
  const byTopic = new Map<string, { slug: string; passingScore: number }[]>()
  for (const ex of exercises) {
    const list = byTopic.get(ex.topic) ?? []
    list.push({ slug: ex.slug, passingScore: ex.passingScore })
    byTopic.set(ex.topic, list)
  }

  const map = new Map<string, TopicProgress>()
  for (const [topic, rounds] of byTopic) {
    const totalRounds = rounds.length
    const bestBySlug = new Map<string, GameExerciseResult>()
    for (const result of gameResults) {
      if (result.topic !== topic) continue
      const prev = bestBySlug.get(result.slug)
      if (!prev || scorePct(result.correctCount, result.totalQuestions) > scorePct(prev.correctCount, prev.totalQuestions)) {
        bestBySlug.set(result.slug, result)
      }
    }

    let passedRounds = 0
    let bestScorePct: number | null = null
    for (const round of rounds) {
      const best = bestBySlug.get(round.slug)
      if (!best) continue
      const pct = scorePct(best.correctCount, best.totalQuestions)
      bestScorePct = bestScorePct == null ? pct : Math.max(bestScorePct, pct)
      if (isExercisePassed(best, round.passingScore)) passedRounds += 1
    }

    const completedRounds = bestBySlug.size
    let status: TopicProgressStatus = "not_started"
    if (passedRounds >= totalRounds && totalRounds > 0) status = "completed"
    else if (completedRounds > 0) status = "in_progress"

    map.set(topic, {
      topic,
      completedRounds,
      totalRounds,
      passedRounds,
      status,
      bestScorePct,
    })
  }

  return map
}

export function buildDeckProgressMap(
  progress: LearningProgress,
  decks: { slug: string; words: unknown[] }[],
): Map<string, DeckProgress> {
  const map = new Map<string, DeckProgress>()

  for (const deck of decks) {
    const wordsLearned = progress.words.filter((w) => w.deckSlug === deck.slug).length
    const attempts = progress.vocabResults.filter(
      (r) => r.deckSlug === deck.slug && r.source === "game",
    )
    const last = attempts[0]
    map.set(deck.slug, {
      deckSlug: deck.slug,
      wordsLearned,
      totalWords: deck.words.length,
      quizAttempts: attempts.length,
      lastScorePct: last ? scorePct(last.correct, last.total) : null,
      completed: attempts.length > 0,
    })
  }

  return map
}

export function buildLearningProgressSummary(
  progress: LearningProgress,
  topicProgress: Map<string, TopicProgress>,
): LearningProgressSummary {
  let topicsCompleted = 0
  let topicsInProgress = 0
  for (const item of topicProgress.values()) {
    if (item.status === "completed") topicsCompleted += 1
    else if (item.status === "in_progress") topicsInProgress += 1
  }

  const deckSlugs = new Set(
    progress.vocabResults.filter((r) => r.source === "game").map((r) => r.deckSlug),
  )

  return {
    wordsLearned: progress.words.length,
    topicsCompleted,
    topicsInProgress,
    decksCompleted: deckSlugs.size,
    totalGameSessions:
      progress.gameResults.length +
      progress.vocabResults.filter((r) => r.source === "game").length,
  }
}

export function buildGameHistory(progress: LearningProgress): GameHistoryEntry[] {
  const items: GameHistoryEntry[] = []

  for (const result of progress.gameResults) {
    const pct = scorePct(result.correctCount, result.totalQuestions)
    items.push({
      kind: "exercise",
      id: `exercise-${result.slug}-${result.completedAt}`,
      title: result.title,
      subtitle: `Grammar · ${pct}%`,
      route: `/exercise/${result.topic}/${result.slug}`,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      passed: isExercisePassed(result),
      completedAt: result.completedAt,
    })
  }

  for (const result of progress.vocabResults) {
    if (result.source !== "game") continue
    const pct = scorePct(result.correct, result.total)
    items.push({
      kind: "vocab",
      id: `vocab-${result.deckSlug}-${result.completedAt}`,
      title: result.deckTitle,
      subtitle: `Vocabulary · ${pct}%`,
      route: `/vocabulary/${result.deckSlug}`,
      correctCount: result.correct,
      totalQuestions: result.total,
      passed: pct >= 70,
      completedAt: result.completedAt,
    })
  }

  return items.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  )
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
