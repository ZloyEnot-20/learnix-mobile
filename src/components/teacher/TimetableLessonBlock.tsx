import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { LessonWithGroup } from "../../lib/teacher-lessons"
import { formatLessonDate } from "../../lib/teacher-lessons"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { teacherColors, teacherShadow } from "../../theme/teacher-tokens"

const LESSON_COLORS = [
  teacherColors.accent,
  teacherColors.green,
  teacherColors.blue,
  teacherColors.purple,
  teacherColors.orange,
]

function colorForGroup(groupId: string): string {
  let hash = 0
  for (let i = 0; i < groupId.length; i += 1) hash = (hash + groupId.charCodeAt(i)) % LESSON_COLORS.length
  return LESSON_COLORS[hash] ?? teacherColors.accent
}

type TimetableLessonBlockProps = {
  lesson: LessonWithGroup
  timeLabel?: string
  onPress?: () => void
}

export function TimetableLessonBlock({ lesson, timeLabel, onPress }: TimetableLessonBlockProps) {
  const color = colorForGroup(lesson.groupId)
  const content = (
    <>
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.groupName} numberOfLines={1}>
            {lesson.groupName}
          </Text>
          {lesson.attendanceMarked ? (
            <Ionicons name="checkmark-circle" size={16} color={teacherColors.green} />
          ) : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {timeLabel ?? lesson.groupScheduleLabel ?? formatLessonDate(lesson.date)}
        </Text>
        {lesson.topic && lesson.topic !== "Lesson" ? (
          <Text style={styles.topic} numberOfLines={1}>
            {lesson.topic}
          </Text>
        ) : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, teacherShadow.tile, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    )
  }

  return <View style={[styles.card, teacherShadow.tile]}>{content}</View>
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
    overflow: "hidden",
    minHeight: 72,
  },
  stripe: { width: 5, alignSelf: "stretch" },
  body: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  top: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupName: { ...typography.label, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  topic: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  pressed: { opacity: 0.88 },
})
