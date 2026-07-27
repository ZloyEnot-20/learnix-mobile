import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { LessonWithGroup } from "../../lib/teacher-lessons"
import { formatLessonDate } from "../../lib/teacher-lessons"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"

type LessonCardProps = {
  lesson: LessonWithGroup
  onPress?: () => void
  actionLabel?: string
}

export function TeacherLessonCard({ lesson, onPress, actionLabel }: LessonCardProps) {
  const content = (
    <>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {lesson.groupName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatLessonDate(lesson.date)}
            {lesson.groupScheduleLabel ? ` · ${lesson.groupScheduleLabel}` : ""}
          </Text>
          {lesson.topic ? (
            <Text style={styles.topic} numberOfLines={1}>
              {lesson.topic}
            </Text>
          ) : null}
        </View>
        {lesson.attendanceMarked ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Marked</Text>
          </View>
        ) : null}
      </View>
      {actionLabel && onPress ? (
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      ) : null}
    </>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    )
  }

  return <View style={[styles.card, shadow.card]}>{content}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.85 },
  top: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  main: { flex: 1, minWidth: 0 },
  title: { ...typography.label, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  topic: { ...typography.bodySm, color: colors.textMuted, marginTop: 4 },
  badge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { ...typography.caption, color: colors.success, fontWeight: "700" },
  actionRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  actionText: { ...typography.label, color: colors.primary, fontSize: 13 },
})
