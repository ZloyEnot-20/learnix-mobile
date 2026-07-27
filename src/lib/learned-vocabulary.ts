import AsyncStorage from "@react-native-async-storage/async-storage"
import type { VocabDeck, VocabWord, TranslationLang } from "../types/vocabulary"
import { parseVocabHomeworkSlug, wordTranslation } from "../types/vocabulary"
import { clampToFixedLevel, primaryLevel } from "./utils"
import { analyticsApi } from "./api"
import { runPerfTrace } from "./perf"

const KEY_PREFIX = "learnix_learning_progress:"
export const CORRECT_TO_MASTER = 5
export const CORRECT_FOR_TYPED_REVIEW = 3
export const MASTERED_MAINTENANCE_DAYS = 45

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

export interface StudyWord extends LearnedWord {
  level: string
  wantToLearn: boolean
  correctCount: number
  addedAt: string
  masteredAt?: string
  /** Passed 45-day maintenance review — never show again. */
  permanentlyMastered?: boolean
  /** Last time this word was shown in vocabulary review (ISO). */
  lastReviewedAt?: string
  totalAttempts?: number
}

export interface VocabQuizResult {
  deckSlug: string
  deckTitle: string
  correct: number
  total: number
  completedAt: string
  source: "game" | "homework"
}

export interface VocabWordAnswer {
  term: string
  correct: boolean
  interactionType?: string
  deckSlug?: string
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

export interface LevelWordStats {
  level: string
  learned: number
  total: number
}

export interface ReviewAnswerResult {
  correctCount: number
  newlyMastered: boolean
  permanentlyRetired?: boolean
  maintenanceFailed?: boolean
  word: StudyWord
}

interface LearningProgress {
  words: LearnedWord[]
  studyWords: StudyWord[]
  vocabResults: VocabQuizResult[]
  gameResults: GameExerciseResult[]
}

const memory = new Map<string, LearningProgress>()
const hydratedFromServer = new Set<string>()

let syncTimer: ReturnType<typeof setTimeout> | null = null
const SYNC_DEBOUNCE_MS = 5000

function scheduleLearnSync(userId: string): void {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void syncLearnProgressToServer(userId)
  }, SYNC_DEBOUNCE_MS)
}

async function syncLearnProgressToServer(userId: string): Promise<void> {
  await runPerfTrace("sync_progress", async () => {
    const progress = await loadProgress(userId)
    await analyticsApi
      .syncLearn({
        studyWords: progress.studyWords.map((w) => ({
          term: w.term,
          deckSlug: w.deckSlug ?? "general",
          correctCount: w.correctCount,
          totalAttempts: w.totalAttempts ?? w.correctCount,
          incorrectCount: Math.max(
            0,
            (w.totalAttempts ?? w.correctCount) - w.correctCount,
          ),
          masteredAt: w.masteredAt,
          permanentlyMastered: w.permanentlyMastered ?? false,
          wantToLearn: w.wantToLearn,
          lastReviewedAt: w.lastReviewedAt,
        })),
        vocabResults: progress.vocabResults.map((r) => ({
          deckSlug: r.deckSlug,
          deckTitle: r.deckTitle,
          correct: r.correct,
          total: r.total,
          completedAt: r.completedAt,
        })),
      })
      .catch(() => {})
  })
}

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

function emptyProgress(): LearningProgress {
  return { words: [], studyWords: [], vocabResults: [], gameResults: [] }
}

function wordKey(word: Pick<StudyWord, "term" | "deckSlug">): string {
  return `${word.deckSlug ?? "general"}::${word.term.toLowerCase()}`
}

export function studyWordKey(word: Pick<StudyWord, "term" | "deckSlug">): string {
  return wordKey(word)
}

function localDateKey(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function wasReviewedToday(word: Pick<StudyWord, "lastReviewedAt">): boolean {
  if (!word.lastReviewedAt) return false
  return localDateKey(word.lastReviewedAt) === localDateKey(new Date())
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
}

export function isPermanentlyMastered(word: Pick<StudyWord, "permanentlyMastered">): boolean {
  return word.permanentlyMastered === true
}

export function isDueForMaintenanceReview(word: StudyWord): boolean {
  if (!isWordMastered(word) || isPermanentlyMastered(word)) return false
  if (!word.masteredAt) return false
  return daysSince(word.masteredAt) >= MASTERED_MAINTENANCE_DAYS
}

export function isEligibleForReview(word: StudyWord): boolean {
  if (isPermanentlyMastered(word)) return false
  if (wasReviewedToday(word)) return false
  if (word.wantToLearn && !isWordMastered(word)) return true
  if (isDueForMaintenanceReview(word)) return true
  return false
}

export function needsTypedReview(correctCount: number): boolean {
  return correctCount >= CORRECT_FOR_TYPED_REVIEW
}

export function matchesTypedTerm(input: string, term: string): boolean {
  return input.trim().toLowerCase() === term.trim().toLowerCase()
}

export function isWordMastered(word: Pick<StudyWord, "correctCount">): boolean {
  return word.correctCount >= CORRECT_TO_MASTER
}

function migrateLegacyWords(progress: LearningProgress): LearningProgress {
  if (progress.studyWords.length > 0) return progress

  const studyWords: StudyWord[] = (progress.words ?? []).map((w) => ({
    ...w,
    level: "A1",
    wantToLearn: false,
    correctCount: CORRECT_TO_MASTER,
    addedAt: w.learnedAt,
    masteredAt: w.learnedAt,
  }))

  return { ...progress, studyWords }
}

async function loadProgressLocal(userId: string): Promise<LearningProgress> {
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
    const progress = migrateLegacyWords({
      words: parsed.words ?? [],
      studyWords: parsed.studyWords ?? [],
      vocabResults: parsed.vocabResults ?? [],
      gameResults: parsed.gameResults ?? [],
    })
    memory.set(userId, progress)
    return progress
  } catch {
    const empty = emptyProgress()
    memory.set(userId, empty)
    return empty
  }
}

function toIsoDate(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return new Date(String(value)).toISOString()
}

/** Merge server-side word progress into local storage (server is source of truth). */
export async function hydrateProgressFromServer(userId: string): Promise<void> {
  const serverData = await analyticsApi.learnProgress().catch(() => null)
  if (!serverData?.words?.length) return

  const progress = await loadProgressLocal(userId)
  const byKey = new Map(progress.studyWords.map((w) => [wordKey(w), w]))

  for (const sw of serverData.words) {
    const key = wordKey({ term: sw.term, deckSlug: sw.deckSlug })
    const masteredAt = toIsoDate(sw.masteredAt)
    const lastReviewedAt = toIsoDate(sw.lastReviewedAt)
    const existing = byKey.get(key)

    if (existing) {
      existing.correctCount = Math.max(sw.correctCount ?? 0, existing.correctCount)
      existing.wantToLearn = existing.wantToLearn || (sw.wantToLearn ?? false)
      existing.permanentlyMastered =
        (existing.permanentlyMastered ?? false) || (sw.permanentlyMastered ?? false)

      const serverMasteredAt = masteredAt ? new Date(masteredAt).getTime() : 0
      const localMasteredAt = existing.masteredAt ? new Date(existing.masteredAt).getTime() : 0
      if (serverMasteredAt >= localMasteredAt && masteredAt) {
        existing.masteredAt = masteredAt
      }

      const serverLast = lastReviewedAt ? new Date(lastReviewedAt).getTime() : 0
      const localLast = existing.lastReviewedAt ? new Date(existing.lastReviewedAt).getTime() : 0
      if (serverLast >= localLast && lastReviewedAt) {
        existing.lastReviewedAt = lastReviewedAt
      }

      existing.totalAttempts = Math.max(
        sw.totalAttempts ?? 0,
        existing.totalAttempts ?? existing.correctCount,
      )
      continue
    }

    const now = new Date().toISOString()
    const studyWord: StudyWord = {
      term: sw.term,
      partOfSpeech: "",
      definition: "",
      example: "",
      translation: "",
      translationUz: "",
      deckSlug: sw.deckSlug,
      level: "A1",
      wantToLearn: sw.wantToLearn ?? false,
      correctCount: sw.correctCount ?? 0,
      addedAt: now,
      learnedAt: masteredAt ?? now,
      masteredAt,
      lastReviewedAt,
      permanentlyMastered: sw.permanentlyMastered ?? false,
      totalAttempts: sw.totalAttempts ?? 0,
    }
    progress.studyWords.push(studyWord)
    byKey.set(key, studyWord)
  }

  await saveProgress(userId, progress)
  scheduleLearnSync(userId)
}

export async function ensureLearningProgressHydrated(
  userId: string,
  force = false,
): Promise<void> {
  if (!force && hydratedFromServer.has(userId)) return
  hydratedFromServer.add(userId)
  try {
    await hydrateProgressFromServer(userId)
  } catch {
    hydratedFromServer.delete(userId)
  }
}

/** Clear in-memory progress cache (e.g. on logout). */
export function resetLearningProgressCache(userId?: string): void {
  if (userId) {
    memory.delete(userId)
    hydratedFromServer.delete(userId)
    return
  }
  memory.clear()
  hydratedFromServer.clear()
}

async function loadProgress(userId: string): Promise<LearningProgress> {
  await ensureLearningProgressHydrated(userId)
  return loadProgressLocal(userId)
}

async function saveProgress(userId: string, progress: LearningProgress): Promise<void> {
  memory.set(userId, progress)
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(progress))
}

function upsertWordForReview(
  progress: LearningProgress,
  word: VocabWord,
  deck: VocabDeck,
  now: string,
): void {
  const key = wordKey({ term: word.term, deckSlug: deck.slug })
  const idx = progress.studyWords.findIndex((w) => wordKey(w) === key)

  if (idx >= 0) {
    const existing = progress.studyWords[idx]
    if (isWordMastered(existing)) return
    progress.studyWords[idx] = { ...existing, wantToLearn: true }
    return
  }

  progress.studyWords.push(toStudyWord(word, deck, now))
}

function addDeckWordsToReview(progress: LearningProgress, deck: VocabDeck): void {
  const now = new Date().toISOString()
  for (const word of deck.words) {
    upsertWordForReview(progress, word, deck, now)
  }
}

/** Queue all deck words for daily review (homework assignment, quiz completion, etc.). */
export async function addDeckToDailyReview(userId: string, deck: VocabDeck): Promise<void> {
  const progress = await loadProgress(userId)
  addDeckWordsToReview(progress, deck)
  await saveProgress(userId, progress)
  notifyHomeVocabPreviewChanged(userId)
  scheduleLearnSync(userId)
}

interface VocabularyHomeworkEntry {
  homework: { subject: string; exerciseSlug?: string }
  submission: { status: string }
}

/** Ensure words from assigned vocabulary homework appear in daily review. */
export async function syncPendingVocabularyHomeworkToReview(
  userId: string,
  entries: VocabularyHomeworkEntry[],
): Promise<void> {
  const deckSlugs = new Set<string>()
  for (const { homework, submission } of entries) {
    if (homework.subject !== "vocabulary") continue
    if (submission.status === "submitted" || submission.status === "graded") continue
    const deckSlug = parseVocabHomeworkSlug(homework.exerciseSlug)
    if (deckSlug) deckSlugs.add(deckSlug)
  }
  if (deckSlugs.size === 0) return

  await ensureLearningProgressHydrated(userId, true)

  const { exercisesApi } = await import("./api")
  await Promise.all(
    [...deckSlugs].map(async (slug) => {
      const deck = await exercisesApi.vocabDeck(slug).catch(() => null)
      if (deck) await addDeckToDailyReview(userId, deck)
    }),
  )
}

function studyWordFromDeckWord(word: VocabWord, deck: VocabDeck): StudyWord {
  const now = new Date().toISOString()
  return {
    term: word.term,
    partOfSpeech: word.partOfSpeech,
    definition: word.definition,
    example: word.example,
    translation: word.translation,
    translationUz: word.translationUz,
    deckSlug: deck.slug,
    deckTitle: deck.title,
    level: clampToFixedLevel(primaryLevel([deck.level])),
    wantToLearn: false,
    correctCount: 0,
    addedAt: now,
    learnedAt: now,
  }
}

/** Pool for multiple-choice distractors (review words + all vocab deck words). */
export function buildDistractorPool(
  progress: LearningProgress,
  decks: VocabDeck[] = [],
): StudyWord[] {
  const seen = new Set<string>()
  const pool: StudyWord[] = []

  const add = (word: StudyWord) => {
    const key = wordKey(word)
    if (seen.has(key)) return
    seen.add(key)
    pool.push(word)
  }

  for (const word of progress.studyWords) add(word)

  for (const deck of decks) {
    for (const word of deck.words) {
      add(studyWordFromDeckWord(word, deck))
    }
  }

  return pool
}

function studyWordToVocab(word: StudyWord): VocabWord {
  return {
    id: word.term,
    term: word.term,
    partOfSpeech: word.partOfSpeech as VocabWord["partOfSpeech"],
    definition: word.definition,
    example: word.example,
    translation: word.translation,
    translationUz: word.translationUz,
  }
}

export function buildReviewOptionWords(
  word: StudyWord,
  pool: StudyWord[],
): StudyWord[] {
  const targetKey = wordKey(word)
  const chosen: StudyWord[] = [word]
  const usedKeys = new Set<string>([targetKey])

  const sameDeck = pool.filter(
    (candidate) => candidate.deckSlug === word.deckSlug && wordKey(candidate) !== targetKey,
  )
  const otherDeck = pool.filter(
    (candidate) => candidate.deckSlug !== word.deckSlug && wordKey(candidate) !== targetKey,
  )
  const candidates = shuffleStudyWords([...sameDeck, ...otherDeck])

  for (const candidate of candidates) {
    if (chosen.length >= 4) break
    const key = wordKey(candidate)
    if (usedKeys.has(key)) continue
    usedKeys.add(key)
    chosen.push(candidate)
  }

  return shuffleStudyWords(chosen)
}

export function buildReviewOptions(
  word: StudyWord,
  pool: StudyWord[],
  lang: TranslationLang,
): string[] {
  return buildReviewOptionWords(word, pool).map((option) =>
    wordTranslation(studyWordToVocab(option), lang),
  )
}

function toStudyWord(word: VocabWord, deck: VocabDeck, now: string): StudyWord {
  return {
    term: word.term,
    partOfSpeech: word.partOfSpeech,
    definition: word.definition,
    example: word.example,
    translation: word.translation,
    translationUz: word.translationUz,
    deckSlug: deck.slug,
    deckTitle: deck.title,
    level: clampToFixedLevel(primaryLevel([deck.level])),
    wantToLearn: true,
    correctCount: 0,
    addedAt: now,
    learnedAt: now,
  }
}

export async function toggleWantToLearn(
  userId: string,
  word: VocabWord,
  deck: VocabDeck,
): Promise<boolean> {
  const progress = await loadProgress(userId)
  const now = new Date().toISOString()
  const key = wordKey({ term: word.term, deckSlug: deck.slug })
  const idx = progress.studyWords.findIndex((w) => wordKey(w) === key)

  if (idx >= 0) {
    const next = !progress.studyWords[idx].wantToLearn
    progress.studyWords[idx] = { ...progress.studyWords[idx], wantToLearn: next }
    await saveProgress(userId, progress)
    notifyHomeVocabPreviewChanged(userId)
    return next
  }

  progress.studyWords.push(toStudyWord(word, deck, now))
  await saveProgress(userId, progress)
  notifyHomeVocabPreviewChanged(userId)
  return true
}

export async function getWantToLearn(
  userId: string,
  term: string,
  deckSlug: string,
): Promise<boolean> {
  const progress = await loadProgress(userId)
  const key = wordKey({ term, deckSlug })
  const record = progress.studyWords.find((w) => wordKey(w) === key)
  return record?.wantToLearn ?? false
}

export async function recordReviewAnswer(
  userId: string,
  term: string,
  deckSlug: string | undefined,
  correct: boolean,
): Promise<ReviewAnswerResult | null> {
  const progress = await loadProgress(userId)
  const key = wordKey({ term, deckSlug })
  const idx = progress.studyWords.findIndex((w) => wordKey(w) === key)
  if (idx < 0) return null

  const record = progress.studyWords[idx]
  const wasMastered = isWordMastered(record)
  const isMaintenance = wasMastered && !isPermanentlyMastered(record) && isDueForMaintenanceReview(record)
  const now = new Date().toISOString()
  const totalAttempts = (record.totalAttempts ?? record.correctCount) + 1

  if (isMaintenance) {
    if (correct) {
      progress.studyWords[idx] = {
        ...record,
        permanentlyMastered: true,
        lastReviewedAt: now,
        totalAttempts,
      }
    } else {
      progress.studyWords[idx] = {
        ...record,
        correctCount: 0,
        masteredAt: undefined,
        wantToLearn: true,
        lastReviewedAt: now,
        totalAttempts,
      }
    }

    await saveProgress(userId, progress)
    notifyHomeVocabPreviewChanged(userId)

    void analyticsApi
      .recordVocabWord({
        term,
        deckSlug: deckSlug ?? "general",
        correct,
        interactionType: needsTypedReview(record.correctCount) ? "typed" : "multiple_choice",
      })
      .catch(() => {})

    scheduleLearnSync(userId)

    return {
      correctCount: progress.studyWords[idx].correctCount,
      newlyMastered: false,
      permanentlyRetired: correct,
      maintenanceFailed: !correct,
      word: progress.studyWords[idx],
    }
  }

  const nextCount = correct ? record.correctCount + 1 : record.correctCount
  const newlyMastered = !wasMastered && nextCount >= CORRECT_TO_MASTER

  progress.studyWords[idx] = {
    ...record,
    correctCount: nextCount,
    masteredAt: newlyMastered ? now : record.masteredAt,
    learnedAt: newlyMastered ? now : record.learnedAt,
    lastReviewedAt: now,
    totalAttempts,
  }

  await saveProgress(userId, progress)
  notifyHomeVocabPreviewChanged(userId)

  void analyticsApi
    .recordVocabWord({
      term,
      deckSlug: deckSlug ?? "general",
      correct,
      interactionType: needsTypedReview(record.correctCount) ? "typed" : "multiple_choice",
    })
    .catch(() => {})

  scheduleLearnSync(userId)

  return {
    correctCount: nextCount,
    newlyMastered,
    word: progress.studyWords[idx],
  }
}

export async function recordVocabDeckCompletion(
  userId: string,
  deck: VocabDeck,
  correct: number,
  total: number,
  source: "game" | "homework",
  wordAnswers: VocabWordAnswer[] = [],
): Promise<void> {
  const progress = await loadProgress(userId)
  const now = new Date().toISOString()

  addDeckWordsToReview(progress, deck)

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
  notifyHomeVocabPreviewChanged(userId)

  void analyticsApi
    .recordVocab({
      deckSlug: deck.slug,
      deckTitle: deck.title,
      correct,
      total,
      source,
      totalWords: deck.words.length,
      wordAnswers,
      words: deck.words.map((w) => ({
        term: w.term,
        partOfSpeech: w.partOfSpeech,
        definition: w.definition,
        deckSlug: deck.slug,
        deckTitle: deck.title,
      })),
    })
    .catch(() => {})

  scheduleLearnSync(userId)
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

function masteredWords(progress: LearningProgress): StudyWord[] {
  return progress.studyWords.filter(isWordMastered)
}

export function buildDeckProgressMap(
  progress: LearningProgress,
  decks: { slug: string; words?: unknown[]; wordCount?: number }[],
): Map<string, DeckProgress> {
  const map = new Map<string, DeckProgress>()

  for (const deck of decks) {
    const totalWords = deck.wordCount ?? deck.words?.length ?? 0
    const wordsLearned = progress.studyWords.filter(
      (w) => w.deckSlug === deck.slug && isWordMastered(w),
    ).length
    const attempts = progress.vocabResults.filter(
      (r) => r.deckSlug === deck.slug && r.source === "game",
    )
    const last = attempts[0]
    map.set(deck.slug, {
      deckSlug: deck.slug,
      wordsLearned,
      totalWords: totalWords,
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
    wordsLearned: masteredWords(progress).length,
    topicsCompleted,
    topicsInProgress,
    decksCompleted: deckSlugs.size,
    totalGameSessions:
      progress.gameResults.length +
      progress.vocabResults.filter((r) => r.source === "game").length,
  }
}

export function buildWordsLearnedByLevel(
  progress: LearningProgress,
  decks: { slug: string; level: string; words?: unknown[]; wordCount?: number }[],
): LevelWordStats[] {
  const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
  const totals = new Map<string, number>()
  const learned = new Map<string, number>()

  for (const level of CEFR_LEVELS) {
    totals.set(level, 0)
    learned.set(level, 0)
  }

  for (const deck of decks) {
    const level = clampToFixedLevel(primaryLevel([deck.level]))
    totals.set(level, (totals.get(level) ?? 0) + (deck.wordCount ?? deck.words?.length ?? 0))
  }

  for (const word of progress.studyWords) {
    if (!isWordMastered(word)) continue
    const level = clampToFixedLevel(primaryLevel([word.level]))
    learned.set(level, (learned.get(level) ?? 0) + 1)
  }

  return CEFR_LEVELS.map((level) => ({
    level,
    learned: learned.get(level) ?? 0,
    total: totals.get(level) ?? 0,
  }))
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

export async function getLearnedWordCount(userId: string): Promise<number> {
  const progress = await loadProgress(userId)
  return masteredWords(progress).length
}

export function peekWordsLearned(userId: string): number | null {
  const progress = memory.get(userId)
  if (!progress) return null
  return buildLearningProgressSummary(progress, new Map()).wordsLearned
}

function shuffleStudyWords<T>(items: T[]): T[] {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

function pendingReviewWords(progress: LearningProgress): StudyWord[] {
  return progress.studyWords.filter((w) => {
    if (isPermanentlyMastered(w)) return false
    if (w.wantToLearn && !isWordMastered(w)) return true
    if (isDueForMaintenanceReview(w)) return true
    return false
  })
}

function dueReviewWords(progress: LearningProgress): StudyWord[] {
  return pendingReviewWords(progress).filter(isEligibleForReview)
}

export async function pickReviewWords(
  userId: string,
  maxCount?: number,
): Promise<StudyWord[]> {
  const progress = await loadProgress(userId)
  const due = dueReviewWords(progress)
  if (due.length === 0) return []
  const shuffled = shuffleStudyWords(due)
  if (maxCount == null) return shuffled
  return shuffled.slice(0, Math.min(maxCount, due.length))
}

export interface ReviewAvailability {
  dueWords: StudyWord[]
  reviewedTodayCount: number
}

export async function getReviewAvailability(userId: string): Promise<ReviewAvailability> {
  const progress = await loadProgress(userId)
  const pending = pendingReviewWords(progress)
  const dueWords = shuffleStudyWords(dueReviewWords(progress))
  return {
    dueWords,
    reviewedTodayCount: pending.length - dueWords.length,
  }
}

/** @deprecated Use pickReviewWords */
export async function pickRandomLearnedWords(
  userId: string,
  count: number,
): Promise<StudyWord[]> {
  return pickReviewWords(userId, count)
}

export type VocabularyReviewStatus = "ready" | "done_today" | "all_complete"

export interface VocabularyReviewPreview {
  status: VocabularyReviewStatus
  totalCount: number
  previewWords: StudyWord[]
}

function hasReviewHistory(progress: LearningProgress): boolean {
  return progress.studyWords.some(
    (w) =>
      w.wantToLearn ||
      w.correctCount > 0 ||
      w.lastReviewedAt != null ||
      isDueForMaintenanceReview(w),
  )
}

export function buildVocabularyReviewPreview(
  progress: LearningProgress,
  previewCount = 5,
): VocabularyReviewPreview | null {
  if (!hasReviewHistory(progress)) return null

  const pending = pendingReviewWords(progress)
  const due = dueReviewWords(progress)

  if (due.length > 0) {
    return {
      status: "ready",
      totalCount: due.length,
      previewWords: shuffleStudyWords(due).slice(0, previewCount),
    }
  }

  if (pending.length > 0) {
    return {
      status: "done_today",
      totalCount: pending.length,
      previewWords: [],
    }
  }

  return {
    status: "all_complete",
    totalCount: 0,
    previewWords: [],
  }
}

export async function getVocabularyReviewPreview(
  userId: string,
  previewCount = 5,
): Promise<VocabularyReviewPreview | null> {
  const progress = await loadProgress(userId)
  return buildVocabularyReviewPreview(progress, previewCount)
}

function notifyHomeVocabPreviewChanged(userId: string): void {
  void import("./home-screen-sync").then(({ syncHomeVocabPreview }) => syncHomeVocabPreview(userId))
}
