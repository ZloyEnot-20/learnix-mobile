import React, { useEffect, useRef, useState } from "react"
import { Animated, Easing, type StyleProp, type ViewStyle, View } from "react-native"
import { animation } from "../../theme/tokens"

type CollapsibleProps = {
  expanded: boolean
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  duration?: number
}

export function Collapsible({
  expanded,
  children,
  style,
  duration = animation.tabSwitchDuration,
}: CollapsibleProps) {
  const height = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current
  const contentHeight = useRef(0)
  const [showContent, setShowContent] = useState(expanded)

  const animateTo = (toHeight: number, toOpacity: number) => {
    Animated.parallel([
      Animated.timing(height, {
        toValue: toHeight,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: toOpacity,
        duration: toOpacity > 0 ? duration : duration * 0.7,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }

  useEffect(() => {
    if (expanded) {
      setShowContent(true)
      animateTo(contentHeight.current, 1)
    } else {
      animateTo(0, 0)
      const timeout = setTimeout(() => setShowContent(false), duration)
      return () => clearTimeout(timeout)
    }
  }, [expanded, duration])

  return (
    <Animated.View style={[{ height, overflow: "hidden" }, style]}>
      {showContent ? (
        <Animated.View style={{ opacity }}>
          <View
            onLayout={(event) => {
              const measured = Math.ceil(event.nativeEvent.layout.height)
              if (measured <= 0 || measured === contentHeight.current) return
              contentHeight.current = measured
              if (expanded) {
                animateTo(measured, 1)
              }
            }}
          >
            {children}
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  )
}
