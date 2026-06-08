import React, { useEffect, useRef } from "react"
import { Animated, type StyleProp, type ViewStyle } from "react-native"
import { animation } from "../../theme/tokens"

type FadeInDownProps = {
  children: React.ReactNode
  /** Stagger index — each step adds 100ms delay */
  index?: number
  delay?: number
  style?: StyleProp<ViewStyle>
}

export function FadeInDown({
  children,
  index = 0,
  delay = 0,
  style,
}: FadeInDownProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(14)).current

  useEffect(() => {
    const totalDelay = delay + index * animation.fadeInDownStagger
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: animation.fadeInDownDuration,
        delay: totalDelay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: animation.fadeInDownDuration,
        delay: totalDelay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [delay, index, opacity, translateY])

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  )
}
