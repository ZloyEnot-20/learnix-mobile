import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"

import { Skeleton } from "../ui/Skeleton"
import { useKeepAwakeWhile } from "../../hooks/useKeepAwakeWhile"
import { colors, radius, spacing } from "../../theme/tokens"
import {
  ListeningExamAudioTrack,
  type ListeningExamAudioHandle,
} from "./ListeningExamAudio"

type ListeningExamAudioSequenceProps = {
  audioUrls: string[]
  autoPlay?: boolean
  style?: StyleProp<ViewStyle>
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

function ListeningExamAudioSequenceComponent(
  { audioUrls, autoPlay = true, style }: ListeningExamAudioSequenceProps,
  ref: React.ForwardedRef<ListeningExamAudioHandle>,
) {
  const player = useAudioPlayer(null, { updateInterval: 250 })
  const status = useAudioPlayerStatus(player)
  const [partIndex, setPartIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const autoPlayTriggeredRef = useRef(false)
  const currentUrl = audioUrls[partIndex]

  useKeepAwakeWhile(Boolean(status.playing))

  useEffect(() => {
    let cancelled = false
    autoPlayTriggeredRef.current = false
    setReady(false)

    if (!currentUrl) return

    void (async () => {
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
        if (cancelled) return
        player.replace({ uri: currentUrl })
        if (cancelled) return
        setReady(true)
      } catch {
        if (!cancelled) setReady(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentUrl, player])

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

  useEffect(() => {
    if (!status.didJustFinish) return
    if (partIndex >= audioUrls.length - 1) return
    setPartIndex((index) => index + 1)
  }, [audioUrls.length, partIndex, status.didJustFinish])

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
      setPartIndex(0)
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
      currentSeconds={status.currentTime ?? 0}
      durationSeconds={status.duration ?? 0}
      playing={Boolean(status.playing)}
      style={style}
    />
  )
}

export const ListeningExamAudioSequence = React.memo(
  forwardRef<ListeningExamAudioHandle, ListeningExamAudioSequenceProps>(
    ListeningExamAudioSequenceComponent,
  ),
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
