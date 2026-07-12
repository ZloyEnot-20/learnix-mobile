import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"

const ICON = "#01AEF9"

/** Home entry — opens the live lesson for the student's group (no code). */
export function JoinLiveLessonBanner() {
  return (
    <Pressable
      style={styles.wrap}
      onPress={() => router.push("/live-lesson" as never)}
      accessibilityRole="button"
      accessibilityLabel="Open live lesson"
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="radio-outline" size={24} color={ICON} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>Live lesson</Text>
          <Text style={styles.subtitle}>Join if your teacher started a class</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.section },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: "700", color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary },
})
