import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from "expo-audio"
import { SpeakingProgressBar } from "../speaking/SpeakingProgressBar"
import { Skeleton } from "../ui/Skeleton"
import { useKeepAwakeWhile } from "../../hooks/useKeepAwakeWhile"
import { colors, radius, spacing } from "../../theme/tokens"
import type { AudioWaveformPlayerHandle, AudioWaveformPlayerProps } from "./audio-waveform-player-types"

const PLAYBACK_UPDATE_INTERVAL_MS = 50

type LoadState = "idle" | "downloading" | "ready" | "error"
type PlayerErrorKind = "not_found" | "network" | "unknown"

type PlayerError = {
  kind: PlayerErrorKind
  message: string
}

let activeExpoPlayer: AudioPlayer | null = null

function runExpoPlayerAction(player: AudioPlayer, action: (player: AudioPlayer) => void) {
  try {
    action(player)
  } catch {
    // Native player may already be released during unmount.
  }
}

function pauseExpoPlayer(player: AudioPlayer) {
  runExpoPlayerAction(player, (current) => {
    current.pause()
  })
}

function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"
  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

function mapDownloadError(error: unknown): PlayerError {
  if (error instanceof Error) {
    if (error.message === "AUDIO_NOT_FOUND") {
      return { kind: "not_found", message: "Audio file not found." }
    }
    if (error.message === "NETWORK_ERROR") {
      return { kind: "network", message: "Network error while loading audio." }
    }
  }
  return { kind: "unknown", message: "Could not load audio." }
}

const WaveformSkeleton = React.memo(function WaveformSkeleton() {
  return (
    <View style={styles.waveformSkeletonRow}>
      {Array.from({ length: 28 }, (_, index) => (
        <Skeleton
          key={index}
          width={3}
          height={8 + (index % 5) * 3}
          borderRadius={2}
          style={styles.waveformSkeletonBar}
        />
      ))}
    </View>
  )
})

function AudioExpoPlayerComponent(
  {
    audioUrl,
    duration,
    isPlaying,
    onPlay,
    onPause,
    autoPlay = false,
    style,
  }: AudioWaveformPlayerProps,
  ref: React.ForwardedRef<AudioWaveformPlayerHandle>,
) {
  const player = useAudioPlayer(null, { updateInterval: PLAYBACK_UPDATE_INTERVAL_MS })
  const status = useAudioPlayerStatus(player)
  const autoPlayTriggeredRef = useRef(false)

  const [loadState, setLoadState] = useState<LoadState>("idle")
  const [downloadError, setDownloadError] = useState<PlayerError | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  const isLoading = loadState === "downloading"
  const error = downloadError
  const durationSeconds = status.duration ?? duration ?? 0
  const currentSeconds = status.currentTime ?? 0
  const progress = durationSeconds > 0 ? Math.min(1, currentSeconds / durationSeconds) : 0

  useKeepAwakeWhile(Boolean(status.playing))

  useEffect(() => {
    let cancelled = false
    autoPlayTriggeredRef.current = false
    setLoadState("downloading")
    setDownloadError(null)

    void (async () => {
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
        if (cancelled) return
        runExpoPlayerAction(player, (current) => {
          current.replace({ uri: audioUrl })
        })
        if (cancelled) return
        setLoadState("ready")
      } catch (cause) {
        if (cancelled) return
        setDownloadError(mapDownloadError(cause))
        setLoadState("error")
      }
    })()

    return () => {
      cancelled = true
      if (activeExpoPlayer === player) {
        activeExpoPlayer = null
      }
    }
  }, [audioUrl, player, retryToken])

  const startPlayback = useCallback(async () => {
    if (loadState !== "ready" || error) return

    if (
      activeExpoPlayer &&
      activeExpoPlayer !== player &&
      activeExpoPlayer.playing
    ) {
      pauseExpoPlayer(activeExpoPlayer)
    }

    activeExpoPlayer = player
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    runExpoPlayerAction(player, (current) => {
      current.play()
    })
  }, [error, loadState, player])

  const pausePlayback = useCallback(async () => {
    pauseExpoPlayer(player)
  }, [player])

  const stopPlayback = useCallback(async () => {
    runExpoPlayerAction(player, (current) => {
      current.pause()
      current.seekTo(0)
    })
  }, [player])

  useImperativeHandle(
    ref,
    () => ({
      play: startPlayback,
      pause: pausePlayback,
      stop: stopPlayback,
    }),
    [pausePlayback, startPlayback, stopPlayback],
  )

  useEffect(() => {
    if (status.playing) {
      onPlay?.()
    } else {
      onPause?.()
    }
  }, [onPause, onPlay, status.playing])

  useEffect(() => {
    if (!autoPlay || autoPlayTriggeredRef.current || loadState !== "ready" || error) return

    const tryAutoPlay = () => {
      if (autoPlayTriggeredRef.current) return true
      if (!status.isLoaded && !player.isLoaded) return false
      autoPlayTriggeredRef.current = true
      void startPlayback()
      return true
    }

    if (tryAutoPlay()) return

    const interval = setInterval(() => {
      if (tryAutoPlay()) clearInterval(interval)
    }, 100)

    const timeout = setTimeout(() => clearInterval(interval), 8000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [autoPlay, error, loadState, player, startPlayback, status.isLoaded])

  useEffect(() => {
    if (isPlaying === undefined || loadState !== "ready" || error) return
    if (isPlaying) {
      void startPlayback()
    } else {
      void pausePlayback()
    }
  }, [error, isPlaying, loadState, pausePlayback, startPlayback])

  const togglePlayback = useCallback(() => {
    if (status.playing) {
      void pausePlayback()
      return
    }
    void startPlayback()
  }, [pausePlayback, startPlayback, status.playing])

  const seek = useCallback(
    (ratio: number) => {
      if (!durationSeconds) return
      runExpoPlayerAction(player, (current) => {
        void current.seekTo(Math.max(0, Math.min(durationSeconds, ratio * durationSeconds)))
      })
    },
    [durationSeconds, player],
  )

  const timeLabel = useMemo(() => {
    if (durationSeconds > 0) {
      return formatDurationSeconds(status.playing ? currentSeconds : durationSeconds)
    }
    if (duration) {
      return formatDurationSeconds(duration)
    }
    return "0:00"
  }, [currentSeconds, duration, durationSeconds, status.playing])

  if (error) {
    return (
      <View style={[styles.root, styles.errorRoot, style]}>
        <Ionicons
          name={
            error.kind === "network"
              ? "cloud-offline-outline"
              : error.kind === "not_found"
                ? "musical-notes-outline"
                : "alert-circle-outline"
          }
          size={18}
          color={colors.error}
        />
        <Text style={styles.errorText}>{error.message}</Text>
        <Pressable onPress={() => setRetryToken((value) => value + 1)} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={[styles.root, style]}>
      <Pressable
        onPress={togglePlayback}
        disabled={isLoading}
        style={[styles.playButton, isLoading && styles.playButtonDisabled]}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? "Pause audio" : "Play audio"}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={18}
          color={colors.primaryDark}
        />
      </Pressable>

      <View style={styles.waveformSlot}>
        {isLoading ? (
          <WaveformSkeleton />
        ) : (
          <SpeakingProgressBar
            progress={progress}
            playing={status.playing}
            onSeek={durationSeconds > 0 ? seek : undefined}
            style={styles.progressTrack}
          />
        )}
      </View>

      <Text style={styles.timeText}>{timeLabel}</Text>
    </View>
  )
}

export const AudioExpoPlayer = React.memo(
  forwardRef<AudioWaveformPlayerHandle, AudioWaveformPlayerProps>(AudioExpoPlayerComponent),
)

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonDisabled: {
    opacity: 0.6,
  },
  waveformSlot: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    minHeight: 36,
  },
  progressTrack: {
    width: "100%",
  },
  waveformSkeletonRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    minHeight: 28,
    paddingVertical: 4,
  },
  waveformSkeletonBar: {
    alignSelf: "flex-end",
  },
  timeText: {
    minWidth: 40,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  errorRoot: {
    justifyContent: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.errorBg,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
})
