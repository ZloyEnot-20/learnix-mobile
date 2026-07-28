import React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { teacherShadow } from "../../theme/teacher-tokens"

/** Shared size so group cards can stay slightly larger. */
export const SERVICE_CARD_SIZE = 96

export type TeacherServiceItem = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  bg: string
  color: string
  onPress: () => void
}

type TeacherServiceGridProps = {
  title?: string
  items: TeacherServiceItem[]
}

export function TeacherServiceGrid({ title = "Services", items }: TeacherServiceGridProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            style={({ pressed }) => [styles.tile, teacherShadow.tile, pressed && styles.pressed]}
          >
            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={26} color={item.color} />
            </View>
            <Text style={styles.tileLabel} numberOfLines={2}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  title: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  scroll: { marginHorizontal: -spacing.screen },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
  },
  tile: {
    width: SERVICE_CARD_SIZE,
    height: SERVICE_CARD_SIZE,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  tileLabel: {
    ...typography.caption,
    color: colors.text,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
})
