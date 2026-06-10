import React, { useEffect, useRef } from "react"
import { Animated, type StyleProp, type ViewStyle } from "react-native"

type HighlightPulseProps = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** Pulse cycles on mount; stops after this count. */
  cycles?: number
}

export function HighlightPulse({ children, style, cycles = 3 }: HighlightPulseProps) {
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 550, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 550, useNativeDriver: true }),
    ])

    const loop = Animated.loop(pulse, { iterations: cycles })
    loop.start()
    return () => loop.stop()
  }, [cycles, scale])

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  )
}
