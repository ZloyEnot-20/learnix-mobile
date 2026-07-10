import { Directory, File, Paths } from "expo-file-system"

const CACHE_DIR_NAME = "waveform-audio"
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
  return match?.[1]?.toLowerCase() ?? "mp3"
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

/** Simform waveform expects a plain filesystem path, not a `file://` URI. */
export function toNativeWaveformPath(uri: string): string {
  if (!uri.startsWith("file://")) return uri
  return decodeURIComponent(uri.replace(/^file:\/\//, ""))
}

export async function resolveAudioWaveformUri(url: string): Promise<string> {
  if (!url.trim()) {
    throw new Error("AUDIO_NOT_FOUND")
  }

  if (!/^https?:\/\//i.test(url)) {
    return toNativeWaveformPath(url)
  }

  const cached = cachedFileForUrl(url)
  if (cached.exists) {
    return toNativeWaveformPath(cached.uri)
  }

  const pending = inFlight.get(url)
  if (pending) return pending

  const task = (async () => {
    const dest = cachedFileForUrl(url)
    if (dest.exists) return toNativeWaveformPath(dest.uri)

    try {
      const file = await File.downloadFileAsync(url, dest, { idempotent: true })
      if (!file.exists || (file.size ?? 0) <= 0) {
        throw new Error("AUDIO_NOT_FOUND")
      }
      return toNativeWaveformPath(file.uri)
    } catch (error) {
      dest.exists && dest.delete()
      if (error instanceof Error && /network|fetch|timeout|offline/i.test(error.message)) {
        throw new Error("NETWORK_ERROR")
      }
      throw error
    }
  })()

  inFlight.set(url, task)
  try {
    return await task
  } finally {
    inFlight.delete(url)
  }
}

export async function prefetchAudioWaveform(urls: string[]): Promise<void> {
  const remote = urls.filter((url) => /^https?:\/\//i.test(url))
  await Promise.allSettled(remote.map((url) => resolveAudioWaveformUri(url)))
}
