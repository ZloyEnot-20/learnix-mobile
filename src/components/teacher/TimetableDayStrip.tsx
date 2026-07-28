import React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { teacherColors } from "../../theme/teacher-tokens"

type TimetableDayStripProps = {
  dates: string[]
  selected: string
  counts?: Record<string, number>
  onSelect: (date: string) => void
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function parseDate(iso: string): { day: string; weekday: string; num: number } {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  return {
    day: WEEKDAY_SHORT[dt.getDay()],
    weekday: WEEKDAY_SHORT[dt.getDay()],
    num: d,
  }
}

export function TimetableDayStrip({ dates, selected, counts, onSelect }: TimetableDayStripProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {dates.map((date) => {
        const { weekday, num } = parseDate(date)
        const active = date === selected
        const count = counts?.[date] ?? 0
        return (
          <Pressable
            key={date}
            onPress={() => onSelect(date)}
            style={[styles.chip, active && styles.chipActive]}
          >
            {count > 0 ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{count}</Text>
              </View>
            ) : null}
            <Text style={[styles.weekday, active && styles.textActive]}>{weekday}</Text>
            <Text style={[styles.num, active && styles.textActive]}>{num}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    width: 52,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: teacherColors.accent,
    borderColor: teacherColors.accentDark,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: teacherColors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeActive: { backgroundColor: colors.text },
  badgeText: { fontSize: 8, fontWeight: "800", color: "#fff" },
  badgeTextActive: { color: teacherColors.accentLight },
  weekday: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  num: { ...typography.label, color: colors.text, marginTop: 2 },
  textActive: { color: "#FFFFFF" },
})
