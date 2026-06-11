import AsyncStorage from "@react-native-async-storage/async-storage"
import type { GrammarExercise } from "../types/grammar"
import type { TopicMeta, VocabDeck } from "../types/vocabulary"

const STORAGE_KEY = "learnix_games_content"

export type GamesContentSnapshot = {
  exercises: GrammarExercise[]
  topicMetas: TopicMeta[]
  vocabDecks: VocabDeck[]
  cachedAt: number
}

let memory: GamesContentSnapshot | null = null

export async function loadGamesContentCache(): Promise<GamesContentSnapshot | null> {
  if (memory) return memory

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as GamesContentSnapshot
    if (!Array.isArray(parsed.exercises) || !Array.isArray(parsed.vocabDecks)) {
      return null
    }

    memory = {
      exercises: parsed.exercises,
      topicMetas: parsed.topicMetas ?? [],
      vocabDecks: parsed.vocabDecks,
      cachedAt: parsed.cachedAt ?? 0,
    }
    return memory
  } catch {
    return null
  }
}

export async function saveGamesContentCache(
  exercises: GrammarExercise[],
  topicMetas: TopicMeta[],
  vocabDecks: VocabDeck[],
): Promise<void> {
  const snapshot: GamesContentSnapshot = {
    exercises,
    topicMetas,
    vocabDecks,
    cachedAt: Date.now(),
  }
  memory = snapshot
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export async function clearGamesContentCache(): Promise<void> {
  memory = null
  await AsyncStorage.removeItem(STORAGE_KEY)
}
