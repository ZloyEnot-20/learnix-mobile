import React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import type { HomeworkDateGroup } from "../../lib/teacher-homework-matrix"
import { teacherColors } from "../../theme/teacher-tokens"
import { colors, radius, spacing, typography } from "../../theme/tokens"

type HomeworkDateBadgeStripProps = {
  dates: HomeworkDateGroup[]
  selectedDateKey: string | null
  onSelect: (dateKey: string) => void
}

export function HomeworkDateBadgeStrip({
  dates,
  selectedDateKey,
  onSelect,
}: HomeworkDateBadgeStripProps) {
  if (dates.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No dates this month</Text>
      </View>
    )
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {dates.map((group) => {
        const active = group.dateKey === selectedDateKey
        return (
          <Pressable
            key={group.dateKey}
            onPress={() => onSelect(group.dateKey)}
            style={({ pressed }) => [
              styles.badge,
              active && styles.badgeActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.badgeDate, active && styles.badgeDateActive]}>
              {group.dateLabel}
            </Text>
            <Text style={[styles.badgeCount, active && styles.badgeCountActive]}>
              {group.columns.length} task{group.columns.length === 1 ? "" : "s"}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: spacing.sm,
    minWidth: 88,
    alignItems: "center",
  },
  badgeActive: {
    backgroundColor: teacherColors.accentLight,
  },
  badgeDateActive: {
    fontWeight: "800",
    color: teacherColors.accentDark,
  },
  badgeDate: {
    ...typography.label,
    color: colors.text,
    fontSize: 14,
  },
  badgeCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 10,
  },
  badgeCountActive: {
    color: teacherColors.accentDark,
    fontWeight: "600",
  },
  emptyWrap: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
  emptyText: { ...typography.caption, color: colors.textMuted },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
})
