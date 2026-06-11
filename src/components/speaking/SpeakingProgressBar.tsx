import React, { useEffect, useRef, useState } from "react"
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { colors } from "../../theme/tokens"

type SpeakingProgressBarProps = {
  progress: number
  playing?: boolean
  onSeek?: (ratio: number) => void
  style?: StyleProp<ViewStyle>
  fillStyle?: StyleProp<ViewStyle>
}

export function SpeakingProgressBar({
  progress,
  playing = false,
  onSeek,
  style,
  fillStyle,
}: SpeakingProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0)
  const animatedProgress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, progress))
    Animated.timing(animatedProgress, {
      toValue: clamped,
      duration: playing ? 90 : 0,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start()
  }, [progress, playing, animatedProgress])

  const fillWidth =
    trackWidth > 0
      ? animatedProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, trackWidth],
        })
      : 0

  return (
    <Pressable
      onPress={
        onSeek
          ? (e) => {
              if (!trackWidth) return
              onSeek(Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth)))
            }
          : undefined
      }
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={[styles.track, style]}
    >
      <Animated.View style={[styles.fill, fillStyle, { width: fillWidth }]} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#dbeafe",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
})
