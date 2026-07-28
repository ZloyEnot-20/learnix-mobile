import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { subjectFolderMeta, teacherColors, teacherShadow } from "../../theme/teacher-tokens"

type HomeworkListRowProps = {
  title: string
  subtitle: string
  subject: string
  badge?: string
  badgeColor?: string
  badgeBg?: string
  selected?: boolean
  selectionMode?: boolean
  onPress: () => void
  onPreview?: () => void
  assignedPreviously?: boolean
}

export function HomeworkListRow({
  title,
  subtitle,
  subject,
  badge,
  badgeColor,
  badgeBg,
  selected = false,
  selectionMode = false,
  onPress,
  onPreview,
  assignedPreviously = false,
}: HomeworkListRowProps) {
  const meta = subjectFolderMeta[subject] ?? {
    icon: "document-text",
    bg: colors.primaryLight,
    color: colors.primary,
    label: subject,
  }

  return (
    <View
      style={[
        styles.row,
        teacherShadow.tile,
        selectionMode && styles.rowSelection,
        selectionMode && selected && styles.rowSelected,
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.rowPressable, pressed && styles.pressed]}
      >
        {selectionMode ? (
          <View style={[styles.selector, selected && styles.selectorSelected]}>
            {selected ? (
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            ) : null}
          </View>
        ) : (
          <View style={[styles.stripe, { backgroundColor: meta.color }]} />
        )}
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons
            name={meta.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={meta.color}
          />
        </View>
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={assignedPreviously ? 2 : 1}>
            {subtitle}
            {assignedPreviously ? (
              <Text style={styles.previouslyAssigned}> · Assigned previously</Text>
            ) : null}
          </Text>
        </View>
        {badge ? (
          <View style={[styles.badge, badgeBg ? { backgroundColor: badgeBg } : null]}>
            <Text style={[styles.badgeText, badgeColor ? { color: badgeColor } : null]}>{badge}</Text>
          </View>
        ) : !onPreview && !selectionMode ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        ) : null}
      </Pressable>
      {onPreview ? (
        <Pressable
          onPress={onPreview}
          hitSlop={8}
          style={({ pressed }) => [styles.previewBtn, pressed && styles.pressed]}
          accessibilityLabel="Preview test"
        >
          <Ionicons name="eye-outline" size={20} color={teacherColors.accent} />
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
    overflow: "hidden",
    minHeight: 68,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  rowSelection: {
    borderColor: colors.borderLight,
  },
  rowSelected: {
    backgroundColor: teacherColors.accentLight,
    borderColor: teacherColors.accentMuted,
  },
  stripe: { width: 4, alignSelf: "stretch" },
  selector: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
    backgroundColor: colors.card,
  },
  selectorSelected: {
    borderColor: teacherColors.accentDark,
    backgroundColor: teacherColors.accentDark,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  main: { flex: 1, minWidth: 0, paddingVertical: spacing.sm },
  title: { ...typography.label, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  previouslyAssigned: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
  badge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  badgeText: { ...typography.caption, color: colors.warning, fontWeight: "700" },
  previewBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  pressed: { opacity: 0.88 },
})
