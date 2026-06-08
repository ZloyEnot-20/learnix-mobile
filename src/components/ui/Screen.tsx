import React from "react"
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, spacing } from "../../theme/tokens"

type ScreenProps = {
  children: React.ReactNode
  scroll?: boolean
  padded?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  refreshControl?: React.ReactElement<RefreshControlProps>
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  contentStyle,
  refreshControl,
}: ScreenProps) {
  const insets = useSafeAreaInsets()
  const pad = padded ? spacing.screen : 0

  if (scroll) {
    return (
      <ScrollView
        style={[styles.base, style]}
        contentContainerStyle={[
          { paddingHorizontal: pad, paddingBottom: insets.bottom + spacing.lg },
          contentStyle,
        ]}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    )
  }

  return (
    <View
      style={[
        styles.base,
        { paddingHorizontal: pad, paddingBottom: insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: colors.background },
})
