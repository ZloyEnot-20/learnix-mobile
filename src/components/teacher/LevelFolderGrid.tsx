import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { CEFR_ORDER } from "../../types/gamification"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { teacherColors, teacherShadow } from "../../theme/teacher-tokens"

const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  A1: { bg: "#DCFCE7", color: "#15803D" },
  A2: { bg: "#D1FAE5", color: "#047857" },
  B1: { bg: "#DBEAFE", color: "#1D4ED8" },
  B2: { bg: "#EDE9FE", color: "#6D28D9" },
  C1: { bg: "#FFEDD5", color: "#C2410C" },
  C2: { bg: "#FEE2E2", color: "#B91C1C" },
}

type LevelFolderGridProps = {
  selected: string | null
  onSelect: (level: string) => void
  counts?: Partial<Record<string, number>>
}

export function LevelFolderGrid({ selected, onSelect, counts }: LevelFolderGridProps) {
  return (
    <View style={styles.grid}>
      {CEFR_ORDER.map((level) => {
        const palette = LEVEL_COLORS[level] ?? { bg: colors.primaryLight, color: colors.primary }
        const active = selected === level
        const count = counts?.[level] ?? 0
        return (
          <Pressable
            key={level}
            onPress={() => onSelect(level)}
            style={({ pressed }) => [
              styles.folder,
              teacherShadow.card,
              active && styles.folderActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.levelBadge, { backgroundColor: palette.bg }]}>
              <Text style={[styles.levelText, { color: palette.color }]}>{level}</Text>
            </View>
            {count > 0 ? (
              <Text style={styles.count}>{count} items</Text>
            ) : (
              <Text style={styles.countMuted}>Level</Text>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  folder: {
    width: "31%",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  folderActive: {
    borderColor: teacherColors.accentDark,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  levelBadge: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  levelText: { ...typography.label, fontSize: 15 },
  count: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  countMuted: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
})
