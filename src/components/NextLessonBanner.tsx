import React, { useEffect, useRef, useState } from "react"
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { pickRandomLessonPhrase, type LessonSchedule } from "../lib/lesson-schedule"
import { useLessonCountdown } from "../hooks/useLessonCountdown"
import { LessonCountdownText } from "./LessonCountdownText"
import { LessonScheduleDisplay } from "./LessonScheduleDisplay"
import { colors, radius, shadow, spacing, typography } from "../theme/tokens"
import { Skeleton } from "./ui/Skeleton"

const LESSON_ICON_COLOR = "#01AEF9"

interface NextLessonBannerProps {
  schedule: LessonSchedule | null
  loading?: boolean
  onLayout?: (event: LayoutChangeEvent) => void
}

export function NextLessonBanner({ schedule, loading, onLayout }: NextLessonBannerProps) {
  const [activePhrase, setActivePhrase] = useState(() => pickRandomLessonPhrase())
  const wasDuringLesson = useRef(false)
  const { duringLesson, countdownMs, hasSchedule } = useLessonCountdown(schedule)

  useEffect(() => {
    if (duringLesson && !wasDuringLesson.current) {
      setActivePhrase(pickRandomLessonPhrase())
    }
    wasDuringLesson.current = duringLesson
  }, [duringLesson])

  if (loading) {
    return (
      <View style={styles.wrap} onLayout={onLayout}>
        <View style={styles.card}>
          <Skeleton width={44} height={44} borderRadius={12} />
          <View style={styles.textCol}>
            <Skeleton width="70%" height={16} />
            <Skeleton width="50%" height={12} style={styles.gapSm} />
          </View>
        </View>
      </View>
    )
  }

  if (!hasSchedule) return null

  if (duringLesson) {
    return (
      <View style={styles.wrap} onLayout={onLayout}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={activePhrase.icon} size={24} color={LESSON_ICON_COLOR} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{activePhrase.text}</Text>
            <Text style={styles.subtitle}>Lesson in progress</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={24} color={LESSON_ICON_COLOR} />
        </View>
        <View style={styles.textCol}>
          <LessonCountdownText
            ms={countdownMs}
            prefix="Next lesson in "
            primaryStyle={styles.title}
          />
          <LessonScheduleDisplay schedule={schedule} size="xs" style={styles.subtitleSchedule} />
        </View>
      </View>
    </View>
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
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, minWidth: 0 },
  title: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitleSchedule: {
    marginTop: 4,
  },
  gapSm: { marginTop: spacing.sm },
})
