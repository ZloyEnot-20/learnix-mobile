import React, { useEffect, useRef } from "react"
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { colors, radius, spacing } from "../../theme/tokens"

type SkeletonProps = {
  width?: number | `${number}%`
  height?: number
  borderRadius?: number
  circle?: boolean
  style?: StyleProp<ViewStyle>
}

export function Skeleton({
  width,
  height = 14,
  borderRadius = 8,
  circle = false,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current
  const flat = StyleSheet.flatten(style)
  const isFlexChild =
    flat?.flex === 1 ||
    flat?.flexGrow === 1 ||
    (typeof flat?.flex === "number" && flat.flex > 0)

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  const r = circle && typeof height === "number" ? height / 2 : borderRadius
  const resolvedWidth = isFlexChild ? width : (width ?? "100%")

  return (
    <Animated.View
      style={[
        styles.bone,
        { height, borderRadius: r, opacity },
        resolvedWidth !== undefined && { width: resolvedWidth },
        style,
      ]}
    />
  )
}

export function SkeletonCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.borderLight,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
})
