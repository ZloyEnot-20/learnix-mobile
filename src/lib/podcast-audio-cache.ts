import { Directory, File, Paths } from "expo-file-system"

const CACHE_DIR_NAME = "podcast-audio"
const META_EXT = ".meta.json"

type ByteRange = { start: number; end: number }

type PodcastCacheMeta = {
  url: string
  totalBytes: number
  ranges: ByteRange[]
}

export type PodcastBufferedRange = { start: number; end: number }

export type PodcastDownloadSnapshot = {
  playbackUri: string
  isFullyCached: boolean
  ready: boolean
  totalBytes: number
  bufferedRanges: PodcastBufferedRange[]
}

type Listener = (snapshot: PodcastDownloadSnapshot) => void

const managers = new Map<string, PodcastAudioDownloadManager>()

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

function cachedAudioFile(url: string): File {
  const ext = extensionFromUrl(url)
  return new File(ensureCacheDir(), `${hashUrl(url)}.${ext}`)
}

function cachedMetaFile(url: string): File {
  const ext = extensionFromUrl(url)
  return new File(ensureCacheDir(), `${hashUrl(url)}.${ext}${META_EXT}`)
}

function mergeByteRanges(ranges: ByteRange[]): ByteRange[] {
  const sorted = ranges
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start)
  if (sorted.length === 0) return []

  const merged: ByteRange[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push({ ...current })
    }
  }
  return merged
}

function markDownloadedRange(ranges: ByteRange[], start: number, end: number): ByteRange[] {
  if (end <= start) return ranges
  return mergeByteRanges([...ranges, { start, end }])
}

function isByteBuffered(ranges: ByteRange[], byte: number): boolean {
  return ranges.some((range) => byte >= range.start && byte < range.end)
}

function isFullyDownloaded(ranges: ByteRange[], totalBytes: number): boolean {
  if (totalBytes <= 0) return false
  const merged = mergeByteRanges(ranges)
  return merged.length === 1 && merged[0].start === 0 && merged[0].end >= totalBytes
}

function rangesToRatios(ranges: ByteRange[], totalBytes: number): PodcastBufferedRange[] {
  if (totalBytes <= 0) return []
  return mergeByteRanges(ranges).map((range) => ({
    start: Math.max(0, Math.min(1, range.start / totalBytes)),
    end: Math.max(0, Math.min(1, range.end / totalBytes)),
  }))
}

function secondsToByte(seconds: number, durationSeconds: number, totalBytes: number): number {
  if (totalBytes <= 0 || durationSeconds <= 0) return 0
  const ratio = Math.max(0, Math.min(1, seconds / durationSeconds))
  return Math.floor(ratio * totalBytes)
}

function readMeta(url: string): PodcastCacheMeta | null {
  const metaFile = cachedMetaFile(url)
  if (!metaFile.exists) return null
  try {
    const parsed = JSON.parse(metaFile.textSync()) as PodcastCacheMeta
    if (!parsed || parsed.url !== url || !Array.isArray(parsed.ranges)) return null
    return {
      url,
      totalBytes: Math.max(0, parsed.totalBytes ?? 0),
      ranges: mergeByteRanges(parsed.ranges),
    }
  } catch {
    return null
  }
}

function writeMeta(url: string, meta: PodcastCacheMeta): void {
  const metaFile = cachedMetaFile(url)
  if (!metaFile.exists) {
    metaFile.create({ overwrite: true })
  }
  metaFile.write(JSON.stringify(meta))
}

class PodcastAudioDownloadManager {
  private listeners = new Set<Listener>()
  private abortController: AbortController | null = null
  private totalBytes = 0
  private ranges: ByteRange[] = []
  private ready = false
  private active = false

  constructor(private readonly url: string) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  start(): void {
    if (this.active) return
    this.active = true
    void this.bootstrap()
  }

  redirectFromSeconds(seconds: number, durationSeconds: number): void {
    if (!/^https?:\/\//i.test(this.url)) return
    const targetByte = secondsToByte(seconds, durationSeconds, this.totalBytes)
    if (isByteBuffered(this.ranges, targetByte)) return
    this.cancelDownload()
    void this.downloadFromByte(targetByte)
  }

  dispose(): void {
    this.listeners.clear()
    this.active = false
  }

  cancel(): void {
    this.cancelDownload()
    this.active = false
  }

  private snapshot(): PodcastDownloadSnapshot {
    const audioFile = cachedAudioFile(this.url)
    const fullyCached =
      audioFile.exists && isFullyDownloaded(this.ranges, this.totalBytes)
    return {
      playbackUri: fullyCached ? audioFile.uri : this.url,
      isFullyCached: fullyCached,
      ready: this.ready,
      totalBytes: this.totalBytes,
      bufferedRanges: rangesToRatios(this.ranges, this.totalBytes),
    }
  }

  private emit(): void {
    const next = this.snapshot()
    for (const listener of this.listeners) {
      listener(next)
    }
  }

  private cancelDownload(): void {
    this.abortController?.abort()
    this.abortController = null
  }

  private persistProgress(startByte: number, writtenEnd: number): void {
    this.ranges = markDownloadedRange(this.ranges, startByte, writtenEnd)
    writeMeta(this.url, {
      url: this.url,
      totalBytes: this.totalBytes,
      ranges: this.ranges,
    })
    this.emit()
  }

  private async writeResponseToFile(
    response: Response,
    handle: ReturnType<File["open"]>,
    startByte: number,
    controller: AbortController,
  ): Promise<number> {
    const reader = response.body?.getReader()

    if (reader) {
      let writtenEnd = startByte
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (controller.signal.aborted) {
          handle.close()
          return writtenEnd
        }
        if (!value || value.byteLength === 0) continue
        handle.writeBytes(value)
        writtenEnd = handle.offset ?? writtenEnd
        this.persistProgress(startByte, writtenEnd)
      }
      return writtenEnd
    }

    const buffer = await response.arrayBuffer()
    if (controller.signal.aborted) {
      handle.close()
      return startByte
    }

    const bytes = new Uint8Array(buffer)
    const chunkSize = 256 * 1024
    let writtenEnd = startByte

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      if (controller.signal.aborted) {
        handle.close()
        return writtenEnd
      }
      const slice = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
      handle.writeBytes(slice)
      writtenEnd = startByte + offset + slice.length
      this.persistProgress(startByte, writtenEnd)
    }

    return writtenEnd
  }

  private async bootstrap(): Promise<void> {
    if (!/^https?:\/\//i.test(this.url)) {
      this.ready = true
      this.emit()
      return
    }

    const audioFile = cachedAudioFile(this.url)
    const savedMeta = readMeta(this.url)

    if (savedMeta) {
      this.totalBytes = savedMeta.totalBytes
      this.ranges = savedMeta.ranges
    } else if (audioFile.exists && audioFile.size > 0) {
      this.totalBytes = audioFile.size
      this.ranges = [{ start: 0, end: audioFile.size }]
      writeMeta(this.url, { url: this.url, totalBytes: this.totalBytes, ranges: this.ranges })
    }

    if (audioFile.exists && isFullyDownloaded(this.ranges, this.totalBytes)) {
      this.ready = true
      this.emit()
      return
    }

    try {
      if (this.totalBytes <= 0) {
        this.totalBytes = await probeTotalBytes(this.url)
      }
    } catch {
      this.ready = true
      this.emit()
      return
    }

    this.ready = true
    this.emit()

    const startByte = this.nextDownloadStartByte()
    if (startByte == null) return
    void this.downloadFromByte(startByte)
  }

  private nextDownloadStartByte(): number | null {
    if (this.totalBytes > 0 && isFullyDownloaded(this.ranges, this.totalBytes)) {
      return null
    }
    const merged = mergeByteRanges(this.ranges)
    if (merged.length === 0) return 0
    const last = merged[merged.length - 1]
    if (last.end >= this.totalBytes && this.totalBytes > 0) return null
    return last.end
  }

  private async downloadFromByte(startByte: number): Promise<void> {
    if (!/^https?:\/\//i.test(this.url)) return
    if (this.totalBytes > 0 && startByte >= this.totalBytes) return

    this.cancelDownload()
    const controller = new AbortController()
    this.abortController = controller

    const audioFile = cachedAudioFile(this.url)
    if (!audioFile.exists) {
      audioFile.create({ overwrite: true })
    }

    try {
      const headers: Record<string, string> = {}
      if (startByte > 0) {
        headers.Range = `bytes=${startByte}-`
      }

      const response = await fetch(this.url, { headers, signal: controller.signal })
      if (controller.signal.aborted) return

      if (!response.ok && response.status !== 206) {
        throw new Error(`Download failed with status ${response.status}`)
      }

      if (startByte > 0 && response.status !== 206) {
        return
      }

      const parsedTotal = parseTotalBytes(response, startByte)
      if (parsedTotal > 0) {
        this.totalBytes = parsedTotal
      }

      const handle = audioFile.open()
      handle.offset = startByte

      const writtenEnd = await this.writeResponseToFile(
        response,
        handle,
        startByte,
        controller,
      )
      if (controller.signal.aborted) return
      handle.close()

      if (this.totalBytes <= 0 && writtenEnd > 0) {
        if (response.status === 200 || writtenEnd > startByte) {
          this.totalBytes = Math.max(writtenEnd, this.totalBytes)
          writeMeta(this.url, {
            url: this.url,
            totalBytes: this.totalBytes,
            ranges: this.ranges,
          })
          this.emit()
        }
      }

      if (this.totalBytes > 0 && isFullyDownloaded(this.ranges, this.totalBytes)) {
        this.emit()
        return
      }

      const nextStart = this.nextDownloadStartByte()
      if (nextStart != null && !controller.signal.aborted) {
        void this.downloadFromByte(nextStart)
      }
    } catch (error) {
      if (controller.signal.aborted) return
      if (__DEV__) {
        console.warn("[podcast-audio-cache] download failed", error)
      }
    } finally {
      if (this.abortController === controller) {
        this.abortController = null
      }
    }
  }
}

async function probeTotalBytes(url: string): Promise<number> {
  const head = await fetch(url, { method: "HEAD" })
  if (head.ok) {
    const length = head.headers.get("Content-Length")
    if (length) {
      const parsed = Number.parseInt(length, 10)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }

  const response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } })
  const fromRange = parseTotalBytes(response, 0)
  if (fromRange > 0) return fromRange

  const fullLength = response.headers.get("Content-Length")
  if (fullLength) {
    const parsed = Number.parseInt(fullLength, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return -1
}

function parseTotalBytes(response: Response, startByte: number): number {
  const contentRange = response.headers.get("Content-Range")
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)\s*$/)
    if (match) {
      const parsed = Number.parseInt(match[1], 10)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }

  const contentLength = response.headers.get("Content-Length")
  if (contentLength) {
    const parsed = Number.parseInt(contentLength, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return startByte > 0 ? startByte + parsed : parsed
    }
  }

  return -1
}

export function getPodcastAudioDownloadManager(url: string): PodcastAudioDownloadManager {
  const existing = managers.get(url)
  if (existing) return existing
  const manager = new PodcastAudioDownloadManager(url)
  managers.set(url, manager)
  return manager
}

export function releasePodcastAudioDownloadManager(url: string): void {
  const manager = managers.get(url)
  if (!manager) return
  manager.dispose()
  managers.delete(url)
}

export function getPodcastAudioCacheSizeBytes(): number {
  const dir = new Directory(Paths.cache, CACHE_DIR_NAME)
  if (!dir.exists) return 0
  return dir.size ?? 0
}

export function clearPodcastAudioCache(): void {
  for (const manager of managers.values()) {
    manager.cancel()
    manager.dispose()
  }
  managers.clear()

  const dir = new Directory(Paths.cache, CACHE_DIR_NAME)
  if (dir.exists) dir.delete()
}

export function prefetchPodcastAudio(urls: string[]): void {
  const remote = urls.filter((url) => /^https?:\/\//i.test(url))
  for (const url of remote) {
    const manager = getPodcastAudioDownloadManager(url)
    manager.start()
  }
}

export function isSecondsBuffered(
  snapshot: PodcastDownloadSnapshot,
  seconds: number,
  durationSeconds: number,
): boolean {
  if (snapshot.isFullyCached) return true
  if (snapshot.totalBytes <= 0 || durationSeconds <= 0) return false
  const byte = secondsToByte(seconds, durationSeconds, snapshot.totalBytes)
  const ranges = snapshot.bufferedRanges.map((range) => ({
    start: Math.floor(range.start * snapshot.totalBytes),
    end: Math.ceil(range.end * snapshot.totalBytes),
  }))
  return isByteBuffered(ranges, byte)
}
