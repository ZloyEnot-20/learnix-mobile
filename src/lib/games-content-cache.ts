import AsyncStorage from "@react-native-async-storage/async-storage"
import type { GrammarExerciseSummary } from "../types/grammar"
import type { PodcastSummary } from "../types/podcast"
import type { TopicMeta, VocabDeckSummary } from "../types/vocabulary"

const STORAGE_KEY = "learnix_games_content_v2"
const TTL_MS = 24 * 60 * 60_000

export type GamesContentSnapshot = {
  exerciseSummaries: GrammarExerciseSummary[]
  topicMetas: TopicMeta[]
  vocabSummaries: VocabDeckSummary[]
  podcastSummaries: PodcastSummary[]
  cachedAt: number
}

let memory: GamesContentSnapshot | null = null

function isFresh(snapshot: GamesContentSnapshot): boolean {
  return Date.now() - snapshot.cachedAt <= TTL_MS
}

export async function loadGamesContentCache(): Promise<GamesContentSnapshot | null> {
  if (memory && isFresh(memory)) return memory

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as GamesContentSnapshot
    if (
      !Array.isArray(parsed.vocabSummaries) ||
      !Array.isArray(parsed.podcastSummaries) ||
      !isFresh(parsed)
    ) {
      return null
    }

    memory = {
      exerciseSummaries: parsed.exerciseSummaries ?? [],
      topicMetas: parsed.topicMetas ?? [],
      vocabSummaries: parsed.vocabSummaries,
      podcastSummaries: parsed.podcastSummaries,
      cachedAt: parsed.cachedAt ?? 0,
    }
    return memory
  } catch {
    return null
  }
}

export async function saveGamesContentCache(snapshot: GamesContentSnapshot): Promise<void> {
  memory = snapshot
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export async function clearGamesContentCache(): Promise<void> {
  memory = null
  await AsyncStorage.removeItem(STORAGE_KEY)
}
