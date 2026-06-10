import React, { useEffect, useRef } from "react"
import { Animated, type StyleProp, type ViewStyle } from "react-native"
import { animation } from "../../theme/tokens"

type FadeInDownProps = {
  children: React.ReactNode
  /** Stagger index — each step adds 100ms delay */
  index?: number
  delay?: number
  duration?: number
  distance?: number
  style?: StyleProp<ViewStyle>
}

export function FadeInDown({
  children,
  index = 0,
  delay = 0,
  duration = animation.fadeInDownDuration,
  distance = 14,
  style,
}: FadeInDownProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(distance)).current

  useEffect(() => {
    const totalDelay = delay + index * animation.fadeInDownStagger
    opacity.setValue(0)
    translateY.setValue(distance)
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay: totalDelay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay: totalDelay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [delay, distance, duration, index, opacity, translateY])

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  )
}
