import React, { useEffect, useRef } from "react"
import {
  LayoutAnimation,
  Platform,
  UIManager,
  type StyleProp,
  type ViewStyle,
  View,
} from "react-native"
import { animation } from "../../theme/tokens"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type CollapsibleProps = {
  expanded: boolean
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  duration?: number
}

function animateExpand(duration: number) {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      duration,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ),
  )
}

export function Collapsible({
  expanded,
  children,
  style,
  duration = animation.tabSwitchDuration,
}: CollapsibleProps) {
  const prevExpanded = useRef(expanded)

  useEffect(() => {
    if (prevExpanded.current === expanded) return
    animateExpand(duration)
    prevExpanded.current = expanded
  }, [duration, expanded])

  if (!expanded) return null

  return <View style={style}>{children}</View>
}
