import React, { useEffect, useRef } from "react"
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native"
import { colors } from "../../theme/tokens"

type SpinnerProps = {
  size?: number
  style?: ViewStyle
}

export function Spinner({ size = 32, style }: SpinnerProps) {
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [spin])

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  const stroke = Math.max(3, Math.round(size * 0.1))

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            transform: [{ rotate }],
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  ring: {
    borderColor: "transparent",
    borderTopColor: colors.brand,
    borderRightColor: colors.brand,
  },
})
