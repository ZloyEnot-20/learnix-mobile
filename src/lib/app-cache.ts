import { Directory, File, Paths } from "expo-file-system"
import { clearImageCache, prefetchRemoteImages } from "./image-cache"
import {
  clearPodcastAudioCache,
  getPodcastAudioCacheSizeBytes,
  prefetchPodcastAudio,
} from "./podcast-audio-cache"
import {
  clearSpeakingAudioCache,
  getSpeakingAudioCacheSizeBytes,
  prefetchSpeakingAudio,
} from "./speaking-audio-cache"
import { formatFileSize } from "./speaking-limits"

const SPEAKING_DIR = "speaking-audio"
const PODCAST_DIR = "podcast-audio"

export type CacheCategoryId = "speaking" | "podcasts" | "images"

export type CacheBreakdownEntry = {
  id: CacheCategoryId
  label: string
  description: string
  bytes: number
  color: string
}

const CACHE_CATEGORIES: Omit<CacheBreakdownEntry, "bytes">[] = [
  {
    id: "images",
    label: "Images",
    description: "Profile photos and other pictures",
    color: "#F59E0B",
  },
  {
    id: "podcasts",
    label: "Podcasts",
    description: "Downloaded podcast audio",
    color: "#10B981",
  },
  {
    id: "speaking",
    label: "Voice",
    description: "Speaking exercise recordings",
    color: "#0369A1",
  },
]

function getImagesAndOtherCacheSizeBytes(): number {
  const root = new Directory(Paths.cache)
  if (!root.exists) return 0

  let total = 0
  for (const entry of root.list()) {
    if (entry.name === SPEAKING_DIR || entry.name === PODCAST_DIR) continue
    if (entry instanceof Directory) {
      total += entry.size ?? 0
    } else if (entry instanceof File) {
      total += entry.size ?? 0
    }
  }
  return total
}

export function getAppCacheBreakdown(): CacheBreakdownEntry[] {
  const bytesById: Record<CacheCategoryId, number> = {
    speaking: getSpeakingAudioCacheSizeBytes(),
    podcasts: getPodcastAudioCacheSizeBytes(),
    images: getImagesAndOtherCacheSizeBytes(),
  }

  return CACHE_CATEGORIES.map((category) => ({
    ...category,
    bytes: bytesById[category.id],
  }))
}

export function getAppCacheSizeBytes(): number {
  return getAppCacheBreakdown().reduce((sum, entry) => sum + entry.bytes, 0)
}

export function formatAppCacheSize(): string {
  const bytes = getAppCacheSizeBytes()
  if (bytes <= 0) return "0 KB"
  return formatFileSize(bytes)
}

export function formatCacheBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB"
  return formatFileSize(bytes)
}

async function clearImagesAndOtherCache(): Promise<void> {
  await clearImageCache()

  const root = new Directory(Paths.cache)
  if (!root.exists) return

  for (const entry of root.list()) {
    if (entry.name === SPEAKING_DIR || entry.name === PODCAST_DIR) continue
    entry.delete()
  }
}

export async function clearCacheCategory(id: CacheCategoryId): Promise<void> {
  switch (id) {
    case "speaking":
      clearSpeakingAudioCache()
      break
    case "podcasts":
      clearPodcastAudioCache()
      break
    case "images":
      await clearImagesAndOtherCache()
      break
  }
}

export async function clearAppCache(): Promise<void> {
  await Promise.all(CACHE_CATEGORIES.map((category) => clearCacheCategory(category.id)))
}

export function prefetchAppMediaAssets(opts: {
  podcastAudioUrls?: (string | null | undefined)[]
  speakingAudioUrls?: (string | null | undefined)[]
  imageUrls?: (string | null | undefined)[]
}): void {
  prefetchPodcastAudio(
    (opts.podcastAudioUrls ?? []).filter((url): url is string => !!url),
  )
  void prefetchSpeakingAudio(
    (opts.speakingAudioUrls ?? []).filter((url): url is string => !!url),
  )
  void prefetchRemoteImages((opts.imageUrls ?? []).filter((url): url is string => !!url))
}

export function prefetchPodcastEpisodes(podcasts: { audioUrl: string }[]): void {
  prefetchAppMediaAssets({
    podcastAudioUrls: podcasts.map((episode) => episode.audioUrl),
  })
}
