import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { colors, spacing, typography } from "../../theme/tokens"

type AdminSectionTitleProps = {
  title: string
}

export function AdminSectionTitle({ title }: AdminSectionTitleProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginLeft: spacing.screen, justifyContent: "center" },
  title: { ...typography.label, fontSize: 17, color: colors.text },
})
