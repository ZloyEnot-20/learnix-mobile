import React, { useEffect, useMemo, useRef } from "react"
import { Animated, Easing, StyleSheet, View } from "react-native"
import { colors } from "../../theme/tokens"

const BAR_COUNT = 12
const MIN_HEIGHT = 4
const MAX_HEIGHT = 22
const BAR_MULTIPLIERS = [0.55, 0.85, 0.65, 1, 0.75, 1.15, 0.7, 0.95, 0.6, 0.8, 1.05, 0.72]

/** Normalize expo-audio metering (dB, roughly -160…0) to 0…1. */
export function normalizeMetering(metering?: number): number {
  if (metering == null || !Number.isFinite(metering)) return 0.08
  const minDb = -60
  const maxDb = 0
  const clamped = Math.max(minDb, Math.min(maxDb, metering))
  return (clamped - minDb) / (maxDb - minDb)
}

type WaveformBarsProps = {
  level: number
  active?: boolean
}

export function WaveformBars({ level, active = true }: WaveformBarsProps) {
  const animatedLevel = useRef(new Animated.Value(level)).current

  useEffect(() => {
    if (!active) {
      animatedLevel.setValue(level)
      return
    }

    animatedLevel.stopAnimation()
    Animated.timing(animatedLevel, {
      toValue: level,
      duration: 16,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start()
  }, [level, active, animatedLevel])

  const bars = useMemo(
    () =>
      BAR_MULTIPLIERS.map((multiplier, index) => {
        const targetHeight = animatedLevel.interpolate({
          inputRange: [0, 1],
          outputRange: [MIN_HEIGHT, Math.max(MIN_HEIGHT, MAX_HEIGHT * multiplier)],
        })
        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: targetHeight,
                opacity: active ? 1 : 0.45,
              },
            ]}
          />
        )
      }),
    [animatedLevel, active],
  )

  return (
    <View style={styles.container} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars}
    </View>
  )
}

const PLAYBACK_BAR_HEIGHTS = [6, 12, 8, 14, 10, 16, 9, 13, 7, 11, 15, 8]
const COMPACT_PLAYBACK_BAR_HEIGHTS = [6, 10, 7, 12, 8, 14, 9, 11, 7, 13]
const PLAYBACK_CYCLE_MS = 425
const PLAYBACK_STAGGER_MS = 70

type PlaybackWaveformBarsProps = {
  active: boolean
  variant?: "default" | "compact"
}

/** Animated bars for audio playback (no live metering available). */
export function PlaybackWaveformBars({
  active,
  variant = "default",
}: PlaybackWaveformBarsProps) {
  const heights = variant === "compact" ? COMPACT_PLAYBACK_BAR_HEIGHTS : PLAYBACK_BAR_HEIGHTS
  const boost = variant === "compact" ? 6 : 10
  const animatedValues = useRef(heights.map(() => new Animated.Value(0))).current

  useEffect(() => {
    if (!active) {
      animatedValues.forEach((value) => {
        value.stopAnimation()
        value.setValue(0)
      })
      return
    }

    const loops = animatedValues.map((value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: PLAYBACK_CYCLE_MS,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: PLAYBACK_CYCLE_MS,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      ),
    )

    const staggered = Animated.stagger(PLAYBACK_STAGGER_MS, loops)
    staggered.start()

    return () => {
      staggered.stop()
      animatedValues.forEach((value) => value.stopAnimation())
    }
  }, [active, animatedValues])

  return (
    <View
      style={variant === "compact" ? styles.playbackCompactContainer : styles.playbackContainer}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {heights.map((baseHeight, index) => {
        if (!active) {
          return (
            <View
              key={index}
              style={[
                styles.bar,
                variant === "compact" && styles.barCompact,
                { height: baseHeight, opacity: 0.45 },
              ]}
            />
          )
        }

        const height = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [baseHeight, baseHeight + boost],
        })
        const opacity = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.55, 1],
        })

        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              variant === "compact" && styles.barCompact,
              { height, opacity },
            ]}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
    height: MAX_HEIGHT,
    marginBottom: 12,
  },
  playbackContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 26,
  },
  playbackCompactContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 16,
  },
  bar: {
    width: 3,
    borderRadius: 999,
    backgroundColor: colors.primary,
    opacity: 0.75,
  },
  barCompact: {
    width: 3,
    borderRadius: 2,
  },
})
