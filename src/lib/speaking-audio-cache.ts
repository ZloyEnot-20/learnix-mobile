import { Directory, File, Paths } from "expo-file-system"
import { formatFileSize } from "./speaking-limits"

const CACHE_DIR_NAME = "speaking-audio"
const inFlight = new Map<string, Promise<string>>()

function hashUrl(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0
  }
  return hash.toString(16)
}

function extensionFromUrl(url: string): string {
  const match = url.match(/\.(m4a|mp3|wav|aac|ogg|webm)(\?|$)/i)
  return match?.[1]?.toLowerCase() ?? "m4a"
}

function ensureCacheDir(): Directory {
  const dir = new Directory(Paths.cache, CACHE_DIR_NAME)
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true })
  }
  return dir
}

function cachedFileForUrl(url: string): File {
  const ext = extensionFromUrl(url)
  return new File(ensureCacheDir(), `${hashUrl(url)}.${ext}`)
}

export async function resolveSpeakingAudioUri(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return url

  const cached = cachedFileForUrl(url)
  if (cached.exists) return cached.uri

  const pending = inFlight.get(url)
  if (pending) return pending

  const task = (async () => {
    const dest = cachedFileForUrl(url)
    if (dest.exists) return dest.uri
    const file = await File.downloadFileAsync(url, dest, { idempotent: true })
    return file.uri
  })()

  inFlight.set(url, task)
  try {
    return await task
  } finally {
    inFlight.delete(url)
  }
}

export async function prefetchSpeakingAudio(urls: string[]): Promise<void> {
  const remote = urls.filter((url) => /^https?:\/\//i.test(url))
  await Promise.allSettled(remote.map((url) => resolveSpeakingAudioUri(url)))
}

export function getSpeakingAudioCacheSizeBytes(): number {
  const dir = new Directory(Paths.cache, CACHE_DIR_NAME)
  if (!dir.exists) return 0
  return dir.size ?? 0
}

export function formatSpeakingAudioCacheSize(): string {
  const bytes = getSpeakingAudioCacheSizeBytes()
  if (bytes <= 0) return "0 KB"
  return formatFileSize(bytes)
}

export function clearSpeakingAudioCache(): void {
  const dir = new Directory(Paths.cache, CACHE_DIR_NAME)
  if (dir.exists) dir.delete()
}
