import React from "react"
import { StyleSheet, View } from "react-native"
import { BackButton } from "./BackButton"
import { spacing } from "../../theme/tokens"

type ScreenBackBarProps = {
  onPress?: () => void
}

/** Fixed back control — place above scrollable content, not inside ScrollView. */
export function ScreenBackBar({ onPress }: ScreenBackBarProps) {
  return (
    <View style={styles.bar}>
      <BackButton onPress={onPress} />
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
})
