import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { colors } from "../../theme/tokens"

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

type BufferedRange = { start: number; end: number }

type SpeakingProgressBarProps = {
  progress: number
  playing?: boolean
  bufferedRanges?: BufferedRange[]
  onSeek?: (ratio: number) => void
  onSeekPreview?: (ratio: number | null) => void
  style?: StyleProp<ViewStyle>
  fillStyle?: StyleProp<ViewStyle>
  bufferedFillStyle?: StyleProp<ViewStyle>
}

export function SpeakingProgressBar({
  progress,
  playing = false,
  bufferedRanges,
  onSeek,
  onSeekPreview,
  style,
  fillStyle,
  bufferedFillStyle,
}: SpeakingProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const animatedProgress = useRef(new Animated.Value(0)).current
  const seekingRef = useRef(false)

  const applySeekRatio = (ratio: number) => {
    const clamped = clampRatio(ratio)
    animatedProgress.setValue(clamped)
    onSeekPreview?.(clamped)
    return clamped
  }

  useEffect(() => {
    if (seekingRef.current) return
    const clamped = clampRatio(progress)
    Animated.timing(animatedProgress, {
      toValue: clamped,
      duration: playing ? 120 : 0,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start()
  }, [progress, playing, animatedProgress])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!onSeek,
        onStartShouldSetPanResponderCapture: () => !!onSeek,
        onMoveShouldSetPanResponder: () => !!onSeek,
        onMoveShouldSetPanResponderCapture: () => !!onSeek,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          if (!onSeek || !trackWidth) return
          seekingRef.current = true
          setIsSeeking(true)
          applySeekRatio(evt.nativeEvent.locationX / trackWidth)
        },
        onPanResponderMove: (evt) => {
          if (!onSeek || !trackWidth) return
          applySeekRatio(evt.nativeEvent.locationX / trackWidth)
        },
        onPanResponderRelease: (evt) => {
          if (!onSeek || !trackWidth) return
          const ratio = applySeekRatio(evt.nativeEvent.locationX / trackWidth)
          seekingRef.current = false
          setIsSeeking(false)
          onSeek(ratio)
        },
        onPanResponderTerminate: () => {
          seekingRef.current = false
          setIsSeeking(false)
          onSeekPreview?.(null)
        },
      }),
    [onSeek, onSeekPreview, trackWidth, animatedProgress],
  )

  const fillWidth =
    trackWidth > 0
      ? animatedProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, trackWidth],
        })
      : 0

  return (
    <View
      {...(onSeek ? panResponder.panHandlers : undefined)}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={[styles.hitArea, onSeek && styles.hitAreaSeekable, style]}
      accessibilityRole={onSeek ? "adjustable" : undefined}
    >
      <View style={styles.track}>
        {trackWidth > 0
          ? bufferedRanges?.map((range, index) => {
              const start = clampRatio(range.start)
              const end = clampRatio(range.end)
              if (end <= start) return null
              return (
                <View
                  key={`${start}-${end}-${index}`}
                  style={[
                    styles.bufferedFill,
                    bufferedFillStyle,
                    {
                      left: start * trackWidth,
                      width: Math.max(2, (end - start) * trackWidth),
                    },
                  ]}
                />
              )
            })
          : null}
        <Animated.View style={[styles.fill, fillStyle, { width: fillWidth }]} />
      </View>
      {isSeeking ? <View style={styles.seekingOverlay} pointerEvents="none" /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  hitArea: {
    justifyContent: "center",
  },
  hitAreaSeekable: {
    minHeight: 32,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#dbeafe",
    overflow: "hidden",
    position: "relative",
  },
  bufferedFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#93c5fd",
    zIndex: 1,
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
    zIndex: 2,
  },
  seekingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
})
