import React from "react"
import { StyleSheet, Text, type TextStyle } from "react-native"
import { splitCountdown } from "../lib/lesson-schedule"

const COUNTDOWN_SECONDS_COLOR = "#01AEF9"

interface LessonCountdownTextProps {
  ms: number
  primaryStyle?: TextStyle
  prefix?: string
  secondsStyle?: TextStyle
}

export function LessonCountdownText({
  ms,
  primaryStyle,
  prefix,
  secondsStyle,
}: LessonCountdownTextProps) {
  const { primary, secondsLabel } = splitCountdown(ms)

  return (
    <Text style={primaryStyle}>
      {prefix}
      {primary}{" "}
      <Text style={[styles.seconds, secondsStyle]}>{secondsLabel}</Text>
    </Text>
  )
}

const styles = StyleSheet.create({
  seconds: {
    fontSize: 13,
    fontWeight: "600",
    color: COUNTDOWN_SECONDS_COLOR,
    fontVariant: ["tabular-nums"],
  },
})
