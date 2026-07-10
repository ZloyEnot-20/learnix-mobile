import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { StyleSheet, View } from "react-native"
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"

import { Skeleton } from "../ui/Skeleton"
import { spacing } from "../../theme/tokens"
import type { ListeningExamAudioHandle } from "./ListeningExamAudio"

type ListeningExamAudioSequenceProps = {
  audioUrls: string[]
  autoPlay?: boolean
}

function ListeningAudioSkeleton() {
  return (
    <View style={styles.skeletonRow} accessibilityLabel="Loading listening audio">
      {Array.from({ length: 24 }, (_, index) => (
        <Skeleton
          key={index}
          width={4}
          height={10 + (index % 4) * 4}
          borderRadius={2}
          style={styles.skeletonBar}
        />
      ))}
    </View>
  )
}

function ListeningExamAudioSequenceComponent(
  { audioUrls, autoPlay = true }: ListeningExamAudioSequenceProps,
  ref: React.ForwardedRef<ListeningExamAudioHandle>,
) {
  const player = useAudioPlayer(null, { updateInterval: 250 })
  const status = useAudioPlayerStatus(player)
  const [partIndex, setPartIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const autoPlayTriggeredRef = useRef(false)
  const currentUrl = audioUrls[partIndex]

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
    return <ListeningAudioSkeleton />
  }

  return null
}

export const ListeningExamAudioSequence = React.memo(
  forwardRef<ListeningExamAudioHandle, ListeningExamAudioSequenceProps>(
    ListeningExamAudioSequenceComponent,
  ),
)

const styles = StyleSheet.create({
  skeletonRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    minHeight: 28,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xs,
  },
  skeletonBar: {
    opacity: 0.85,
  },
})
