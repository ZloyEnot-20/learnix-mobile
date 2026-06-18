import React from "react"
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import {
  formatLessonScheduleTime,
  hasValidLessonSchedule,
  sortWeekdays,
  WEEKDAY_BADGE_STYLES,
  WEEKDAY_LABELS,
  type LessonSchedule,
} from "../lib/lesson-schedule"
import { colors, typography } from "../theme/tokens"

interface WeekdayBadgeProps {
  day: number
  size?: "xs" | "sm"
}

function WeekdayBadge({ day, size = "sm" }: WeekdayBadgeProps) {
  const palette = WEEKDAY_BADGE_STYLES[day] ?? WEEKDAY_BADGE_STYLES[1]
  return (
    <View
      style={[
        styles.badge,
        size === "xs" ? styles.badgeXs : styles.badgeSm,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          size === "xs" ? styles.badgeTextXs : styles.badgeTextSm,
          { color: palette.color },
        ]}
      >
        {WEEKDAY_LABELS[day] ?? WEEKDAY_LABELS[1]}
      </Text>
    </View>
  )
}

interface LessonScheduleDisplayProps {
  schedule: LessonSchedule | null | undefined
  size?: "xs" | "sm"
  showTime?: boolean
  /** inline — badges and time in one row; stacked — time below badges (better in narrow hero rows) */
  layout?: "inline" | "stacked"
  style?: StyleProp<ViewStyle>
}

export function LessonScheduleDisplay({
  schedule,
  size = "sm",
  showTime = true,
  layout = "inline",
  style,
}: LessonScheduleDisplayProps) {
  if (!hasValidLessonSchedule(schedule)) return null
  const time = formatLessonScheduleTime(schedule)
  const days = sortWeekdays(schedule!.weekdays)
  const stacked = layout === "stacked"

  return (
    <View style={[stacked ? styles.rowStacked : styles.row, style]}>
      <View style={[styles.badges, stacked && styles.badgesStacked]}>
        {days.map((day) => (
          <WeekdayBadge key={day} day={day} size={size} />
        ))}
      </View>
      {showTime && time ? (
        <Text
          style={[
            styles.time,
            size === "xs" ? styles.timeXs : styles.timeSm,
            stacked && styles.timeStacked,
          ]}
        >
          {time}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  rowStacked: {
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  badgesStacked: {
    justifyContent: "center",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 18,
  },
  badgeXs: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    minHeight: 16,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  badgeTextXs: {
    fontSize: 9,
    lineHeight: 11,
  },
  badgeTextSm: {
    fontSize: 10,
    lineHeight: 12,
  },
  time: {
    ...typography.caption,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  timeStacked: {
    textAlign: "center",
  },
  timeXs: {
    fontSize: 10,
  },
  timeSm: {
    fontSize: 12,
  },
})
