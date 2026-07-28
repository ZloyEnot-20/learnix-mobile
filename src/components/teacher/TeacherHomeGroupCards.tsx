import React, { memo } from "react"
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { percentColors } from "../../lib/teacher-homework"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { teacherColors, teacherShadow } from "../../theme/teacher-tokens"
import { SERVICE_CARD_SIZE } from "./TeacherServiceGrid"
import type { TeacherGroupInfo } from "./TeacherGroupInfoModal"

/** Slightly larger than service tiles. */
export const GROUP_CARD_SIZE = SERVICE_CARD_SIZE + 28

export const GROUP_CARD_PALETTES = [
  { bg: teacherColors.blueBg, color: teacherColors.blue },
  { bg: teacherColors.purpleBg, color: teacherColors.purple },
  { bg: teacherColors.greenBg, color: teacherColors.greenDark },
  { bg: teacherColors.orangeBg, color: teacherColors.orange },
  { bg: teacherColors.pinkBg, color: teacherColors.pink },
]

type TeacherHomeGroupCardsProps = {
  groups: TeacherGroupInfo[]
  onPress: (group: TeacherGroupInfo) => void
  /** When rendered inside a bottom sheet, avoid nesting horizontal scroll in vertical scroll. */
  embedded?: boolean
}

function TeacherHomeGroupCardsInner({ groups, onPress, embedded = false }: TeacherHomeGroupCardsProps) {
  if (groups.length === 0) {
    return (
      <View style={[styles.emptyCard, teacherShadow.card]}>
        <Ionicons name="school-outline" size={28} color={colors.textMuted} />
        <Text style={styles.emptyText}>No groups assigned yet</Text>
      </View>
    )
  }

  return (
    <FlatList
      horizontal
      data={groups}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, embedded && styles.scrollEmbedded]}
      contentContainerStyle={[styles.row, embedded && styles.rowEmbedded]}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      renderItem={({ item: group }) => {
        const percent = group.averagePercent
        const score = percent != null ? percentColors(percent) : null
        return (
          <Pressable
            onPress={() => onPress(group)}
            style={({ pressed }) => [
              styles.card,
              teacherShadow.tile,
              { backgroundColor: group.accentBg },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.name, { color: group.accentColor }]} numberOfLines={2}>
              {group.name}
            </Text>
            {score ? (
              <Text style={[styles.percent, { color: score.bg }]}>{percent}%</Text>
            ) : (
              <Text style={[styles.percentEmpty, { color: group.accentColor }]}>—</Text>
            )}
          </Pressable>
        )
      }}
    />
  )
}

export const TeacherHomeGroupCards = memo(TeacherHomeGroupCardsInner)

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -spacing.screen },
  scrollEmbedded: { marginHorizontal: 0, flexGrow: 0 },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
  },
  rowEmbedded: { paddingHorizontal: 0 },
  card: {
    width: GROUP_CARD_SIZE,
    height: GROUP_CARD_SIZE,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  name: {
    ...typography.label,
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
    textAlign: "center",
  },
  percent: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
    textAlign: "center",
  },
  percentEmpty: {
    ...typography.h2,
    textAlign: "center",
    opacity: 0.7,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.sm },
})
