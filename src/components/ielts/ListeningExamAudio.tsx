import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"

import { SpeakingProgressBar } from "../speaking/SpeakingProgressBar"
import { Skeleton } from "../ui/Skeleton"
import { useKeepAwakeWhile } from "../../hooks/useKeepAwakeWhile"
import { colors, radius, spacing } from "../../theme/tokens"

export type ListeningExamAudioHandle = {
  pause: () => Promise<void>
  stop: () => Promise<void>
}

type ListeningExamAudioProps = {
  audioUri: string
  autoPlay?: boolean
  style?: StyleProp<ViewStyle>
}

function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${minutes}:${String(secs).padStart(2, "0")}`
}

function ListeningAudioSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.playerRoot, style]} accessibilityLabel="Loading listening audio">
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
      <Skeleton width={72} height={14} borderRadius={4} />
    </View>
  )
}

function safeSeconds(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0
}

/** Read-only progress bar: shows timings, no seek or pause controls. */
export function ListeningExamAudioTrack({
  currentSeconds,
  durationSeconds,
  playing,
  style,
}: {
  currentSeconds: number
  durationSeconds: number
  playing: boolean
  style?: StyleProp<ViewStyle>
}) {
  const safeCurrent = safeSeconds(currentSeconds)
  const safeDuration = safeSeconds(durationSeconds)
  const progress = safeDuration > 0 ? Math.min(1, safeCurrent / safeDuration) : 0
  const currentLabel = formatDurationSeconds(safeCurrent)
  const durationLabel = formatDurationSeconds(safeDuration)

  return (
    <View
      style={[styles.playerRoot, style]}
      accessibilityLabel={`Listening audio ${currentLabel} of ${durationLabel}`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: Math.max(1, Math.floor(safeDuration)),
        now: Math.floor(safeCurrent),
      }}
    >
      <View style={styles.progressSlot}>
        <SpeakingProgressBar
          progress={progress}
          playing={playing}
          style={styles.progressTrack}
        />
      </View>
      <Text style={styles.timeText}>
        {currentLabel} / {durationLabel}
      </Text>
    </View>
  )
}

function ListeningExamAudioComponent(
  { audioUri, autoPlay = true, style }: ListeningExamAudioProps,
  ref: React.ForwardedRef<ListeningExamAudioHandle>,
) {
  const player = useAudioPlayer(null, { updateInterval: 250 })
  const status = useAudioPlayerStatus(player)
  const [ready, setReady] = useState(false)
  const autoPlayTriggeredRef = useRef(false)

  useKeepAwakeWhile(Boolean(status.playing))

  useEffect(() => {
    let cancelled = false
    autoPlayTriggeredRef.current = false
    setReady(false)

    void (async () => {
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
        if (cancelled) return
        player.replace({ uri: audioUri })
        if (cancelled) return
        setReady(true)
      } catch {
        if (!cancelled) setReady(false)
      }
    })()

    return () => {
      cancelled = true
      try {
        player.pause()
      } catch {
        // Player may already be released.
      }
    }
  }, [audioUri, player])

  useEffect(() => {
    if (!autoPlay || !ready || autoPlayTriggeredRef.current) return
    autoPlayTriggeredRef.current = true
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).then(() => {
      try {
        player.play()
      } catch {
        // Ignore playback race on unmount.
      }
    })
  }, [autoPlay, player, ready])

  const pause = useCallback(async () => {
    try {
      player.pause()
    } catch {
      // Ignore pause errors during teardown.
    }
  }, [player])

  const stop = useCallback(async () => {
    try {
      player.pause()
      player.seekTo(0)
    } catch {
      // Ignore stop errors during teardown.
    }
  }, [player])

  useImperativeHandle(ref, () => ({ pause, stop }), [pause, stop])

  if (!ready && !status.playing) {
    return <ListeningAudioSkeleton style={style} />
  }

  return (
    <ListeningExamAudioTrack
      currentSeconds={safeSeconds(status.currentTime)}
      durationSeconds={safeSeconds(status.duration)}
      playing={Boolean(status.playing)}
      style={style}
    />
  )
}

export const ListeningExamAudio = React.memo(
  forwardRef<ListeningExamAudioHandle, ListeningExamAudioProps>(ListeningExamAudioComponent),
)

const styles = StyleSheet.create({
  playerRoot: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 0,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  progressSlot: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    minHeight: 20,
  },
  progressTrack: {
    width: "100%",
  },
  timeText: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  waveformSkeletonRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    minHeight: 20,
    paddingVertical: 2,
  },
  waveformSkeletonBar: {
    alignSelf: "flex-end",
  },
})
