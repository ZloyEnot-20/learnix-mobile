import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  FinishMode,
  PlayerState,
  Waveform,
  useAudioPlayer,
  type IWaveformRef,
  type PlaybackSpeedType,
} from "@simform_solutions/react-native-audio-waveform"
import { resolveAudioWaveformUri } from "../../lib/audio-waveform-cache"
import { useKeepAwakeWhile } from "../../hooks/useKeepAwakeWhile"
import { Skeleton } from "../ui/Skeleton"
import { colors, radius, spacing } from "../../theme/tokens"
import type { AudioWaveformPlayerHandle, AudioWaveformPlayerProps } from "./audio-waveform-player-types"

const PLAYBACK_SPEED: PlaybackSpeedType = 1.0

type LoadState = "idle" | "downloading" | "ready" | "error"
type PlayerErrorKind = "not_found" | "network" | "waveform" | "unknown"

type PlayerError = {
  kind: PlayerErrorKind
  message: string
}

let activeWaveformRef: React.RefObject<IWaveformRef | null> | null = null

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00"
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
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

function mapWaveformError(error: Error): PlayerError {
  const message = error.message.toLowerCase()
  if (message.includes("network") || message.includes("fetch")) {
    return { kind: "network", message: "Network error while building waveform." }
  }
  if (message.includes("not found") || message.includes("no such file")) {
    return { kind: "not_found", message: "Audio file not found." }
  }
  return { kind: "waveform", message: "Could not generate waveform." }
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

const StaticWaveform = React.memo(function StaticWaveform({
  localPath,
  playbackSpeed,
  candleWidth,
  candleSpace,
  waveformRef,
  onPlayerStateChange,
  onCurrentProgressChange,
  onChangeWaveformLoadState,
  onError,
}: {
  localPath: string
  playbackSpeed: PlaybackSpeedType
  candleWidth: number
  candleSpace: number
  waveformRef: React.RefObject<IWaveformRef | null>
  onPlayerStateChange: (state: PlayerState) => void
  onCurrentProgressChange: (currentProgress: number, songDuration: number) => void
  onChangeWaveformLoadState: (loading: boolean) => void
  onError: (error: Error) => void
}) {
  return (
    <Waveform
      ref={waveformRef}
      mode="static"
      path={localPath}
      candleWidth={candleWidth}
      candleSpace={candleSpace}
      playbackSpeed={playbackSpeed}
      waveColor={colors.border}
      scrubColor={colors.primary}
      containerStyle={styles.waveformContainer}
      onPlayerStateChange={onPlayerStateChange}
      onCurrentProgressChange={onCurrentProgressChange}
      onChangeWaveformLoadState={onChangeWaveformLoadState}
      onError={onError}
    />
  )
})

function AudioWaveformPlayerNativeComponent(
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
  const { width: screenWidth } = useWindowDimensions()
  const waveformRef = useRef<IWaveformRef>(null)
  const autoPlayTriggeredRef = useRef(false)
  const { stopPlayersAndExtractors } = useAudioPlayer()

  const [loadState, setLoadState] = useState<LoadState>("idle")
  const [localPath, setLocalPath] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<PlayerError | null>(null)
  const [waveformError, setWaveformError] = useState<PlayerError | null>(null)
  const [waveformLoading, setWaveformLoading] = useState(true)
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.stopped)
  const [currentMs, setCurrentMs] = useState(0)
  const [totalMs, setTotalMs] = useState(() => (duration ? duration * 1000 : 0))
  const [retryToken, setRetryToken] = useState(0)

  const candleWidth = screenWidth < 360 ? 2 : 3
  const candleSpace = 2

  const isLoading = loadState === "downloading" || (loadState === "ready" && waveformLoading)
  const error = downloadError ?? waveformError

  useKeepAwakeWhile(playerState === PlayerState.playing)

  const resolveSource = useCallback(async (url: string, cancelled: () => boolean) => {
    setLoadState("downloading")
    setDownloadError(null)
    setWaveformError(null)
    setWaveformLoading(true)
    setLocalPath(null)

    try {
      const path = await resolveAudioWaveformUri(url)
      if (cancelled()) return
      setLocalPath(path)
      setLoadState("ready")
    } catch (cause) {
      if (cancelled()) return
      setDownloadError(mapDownloadError(cause))
      setLoadState("error")
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    autoPlayTriggeredRef.current = false
    setPlayerState(PlayerState.stopped)
    setCurrentMs(0)
    setTotalMs(duration ? duration * 1000 : 0)

    void resolveSource(audioUrl, () => cancelled)

    return () => {
      cancelled = true
    }
  }, [audioUrl, duration, resolveSource, retryToken])

  useEffect(() => {
    return () => {
      if (activeWaveformRef === waveformRef) {
        activeWaveformRef = null
      }
      void stopPlayersAndExtractors()
    }
  }, [stopPlayersAndExtractors])

  const startPlayback = useCallback(async () => {
    if (!waveformRef.current || isLoading || error) return

    if (
      activeWaveformRef?.current &&
      activeWaveformRef !== waveformRef &&
      activeWaveformRef.current.currentState === PlayerState.playing
    ) {
      await activeWaveformRef.current.pausePlayer()
    }

    activeWaveformRef = waveformRef

    if (waveformRef.current.currentState === PlayerState.paused) {
      await waveformRef.current.resumePlayer({ finishMode: FinishMode.stop })
      return
    }

    await waveformRef.current.startPlayer({ finishMode: FinishMode.stop })
  }, [error, isLoading])

  const pausePlayback = useCallback(async () => {
    if (waveformRef.current?.currentState === PlayerState.playing) {
      await waveformRef.current.pausePlayer()
    }
  }, [])

  const stopPlayback = useCallback(async () => {
    if (waveformRef.current) {
      await waveformRef.current.stopPlayer()
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      play: startPlayback,
      pause: pausePlayback,
      stop: stopPlayback,
    }),
    [pausePlayback, startPlayback, stopPlayback],
  )

  const handlePlayerStateChange = useCallback(
    (state: PlayerState) => {
      setPlayerState(state)
      if (state === PlayerState.playing) {
        onPlay?.()
      } else if (state === PlayerState.paused || state === PlayerState.stopped) {
        onPause?.()
      }
    },
    [onPause, onPlay],
  )

  const handleWaveformLoadState = useCallback((loading: boolean) => {
    setWaveformLoading(loading)
  }, [])

  useEffect(() => {
    if (!autoPlay || autoPlayTriggeredRef.current || waveformLoading || error || !localPath) return

    const tryAutoPlay = () => {
      if (!waveformRef.current || autoPlayTriggeredRef.current) return false
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
  }, [autoPlay, error, localPath, startPlayback, waveformLoading])

  const handleWaveformError = useCallback((waveError: Error) => {
    setWaveformError(mapWaveformError(waveError))
    setLoadState("error")
  }, [])

  const handleProgressChange = useCallback((currentProgress: number, songDuration: number) => {
    setCurrentMs(currentProgress)
    if (songDuration > 0) {
      setTotalMs(songDuration)
    }
  }, [])

  useEffect(() => {
    if (isPlaying === undefined || isLoading || error) return

    const sync = async () => {
      if (isPlaying) {
        await startPlayback()
      } else {
        await pausePlayback()
      }
    }

    void sync()
  }, [error, isLoading, isPlaying, pausePlayback, startPlayback])

  const togglePlayback = useCallback(() => {
    if (playerState === PlayerState.playing) {
      void pausePlayback()
      return
    }
    void startPlayback()
  }, [pausePlayback, playerState, startPlayback])

  const timeLabel = useMemo(() => {
    if (totalMs > 0) {
      return formatDurationMs(playerState === PlayerState.playing ? currentMs : totalMs)
    }
    if (duration) {
      return formatDurationMs(duration * 1000)
    }
    return "0:00"
  }, [currentMs, duration, playerState, totalMs])

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
        accessibilityLabel={playerState === PlayerState.playing ? "Pause audio" : "Play audio"}
      >
        <Ionicons
          name={playerState === PlayerState.playing ? "pause" : "play"}
          size={18}
          color={colors.primaryDark}
        />
      </Pressable>

      <View style={styles.waveformSlot}>
        {isLoading || !localPath ? (
          <WaveformSkeleton />
        ) : (
          <StaticWaveform
            localPath={localPath}
            playbackSpeed={PLAYBACK_SPEED}
            candleWidth={candleWidth}
            candleSpace={candleSpace}
            waveformRef={waveformRef}
            onPlayerStateChange={handlePlayerStateChange}
            onCurrentProgressChange={handleProgressChange}
            onChangeWaveformLoadState={handleWaveformLoadState}
            onError={handleWaveformError}
          />
        )}
      </View>

      <Text style={styles.timeText}>{timeLabel}</Text>
    </View>
  )
}

export const AudioWaveformPlayerNative = React.memo(
  forwardRef<AudioWaveformPlayerHandle, AudioWaveformPlayerProps>(
    AudioWaveformPlayerNativeComponent,
  ),
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
  waveformContainer: {
    flex: 1,
    minHeight: 36,
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
