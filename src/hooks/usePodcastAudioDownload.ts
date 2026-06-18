import { useCallback, useEffect, useState } from "react"
import {
  getPodcastAudioDownloadManager,
  type PodcastDownloadSnapshot,
} from "../lib/podcast-audio-cache"

const INITIAL_SNAPSHOT: PodcastDownloadSnapshot = {
  playbackUri: "",
  isFullyCached: false,
  ready: false,
  totalBytes: 0,
  bufferedRanges: [],
}

export function usePodcastAudioDownload(audioUrl: string) {
  const [snapshot, setSnapshot] = useState<PodcastDownloadSnapshot>(() => ({
    ...INITIAL_SNAPSHOT,
    playbackUri: audioUrl,
  }))

  useEffect(() => {
    if (!audioUrl) return

    const manager = getPodcastAudioDownloadManager(audioUrl)
    const unsubscribe = manager.subscribe((next) => {
      setSnapshot(next)
    })
    manager.start()

    return () => {
      unsubscribe()
    }
  }, [audioUrl])

  const redirectDownload = useCallback(
    (seconds: number, durationSeconds: number) => {
      if (!audioUrl) return
      getPodcastAudioDownloadManager(audioUrl).redirectFromSeconds(seconds, durationSeconds)
    },
    [audioUrl],
  )

  return {
    playbackUri: snapshot.playbackUri || audioUrl,
    isFullyCached: snapshot.isFullyCached,
    ready: snapshot.ready,
    totalBytes: snapshot.totalBytes,
    bufferedRanges: snapshot.bufferedRanges,
    redirectDownload,
  }
}
