import React, { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { CORRECT_FOR_TYPED_REVIEW, CORRECT_TO_MASTER } from "../lib/learned-vocabulary"
import { BottomSheet } from "./ui/BottomSheet"
import { colors, radius, spacing } from "../theme/tokens"

/** Green gradient bottom → top (fill color by mastery level). */
export const WORD_MASTERY_LEVELS = [
  {
    level: 1,
    title: "Exposure",
    color: "#15803D",
    description: "Word added. One correct answer starts filling the battery.",
  },
  {
    level: 2,
    title: "Recognition",
    color: "#16A34A",
    description: "You recognize the word and pick the right translation.",
  },
  {
    level: 3,
    title: "Association",
    color: "#22C55E",
    description: "You reliably match the word with its meaning.",
  },
  {
    level: 4,
    title: "Active recall",
    color: "#4ADE80",
    description: `After ${CORRECT_FOR_TYPED_REVIEW} correct answers, type the English word from memory.`,
  },
  {
    level: 5,
    title: "Mastered",
    color: "#BEF264",
    description: "Fully learned — stays in your long-term vocabulary.",
  },
] as const

const LEVEL_COLORS = Object.fromEntries(
  WORD_MASTERY_LEVELS.map((l) => [l.level, l.color]),
) as Record<number, string>

const DEFAULT_BATTERY_HEIGHT = 28

interface WordMasteryBarProps {
  progress: number
  maxLevel?: number
  /** Match the height of the word text beside the battery. */
  height?: number
}

function BatteryIcon({
  progress,
  maxLevel,
  height,
}: {
  progress: number
  maxLevel: number
  height: number
}) {
  const clamped = Math.min(Math.max(progress, 0), maxLevel)
  const capHeight = Math.max(2, Math.round(height * 0.1))
  const bodyHeight = height - capHeight - 1
  const bodyWidth = Math.max(14, Math.round(height * 0.48))
  const capWidth = Math.max(7, Math.round(bodyWidth * 0.38))
  const inset = 1
  const segmentGap = 1
  const borderRadius = 1
  const segmentRadius = 0

  const levels = Array.from({ length: maxLevel }, (_, i) => maxLevel - i)

  return (
    <View style={[styles.battery, { height, width: bodyWidth }]}>
      <View
        style={[
          styles.cap,
          {
            width: capWidth,
            height: capHeight,
            borderRadius: 1,
          },
        ]}
      />
      <View
        style={[
          styles.body,
          {
            width: bodyWidth,
            height: bodyHeight,
            borderRadius,
            padding: inset,
            gap: segmentGap,
          },
        ]}
      >
        {levels.map((level) => {
          const filled = clamped >= level
          return (
            <View
              key={level}
              style={[
                styles.segment,
                {
                  borderRadius: segmentRadius,
                  backgroundColor: filled ? LEVEL_COLORS[level] : colors.borderLight,
                },
              ]}
            />
          )
        })}
      </View>
    </View>
  )
}

function MasteryInfoSheet({
  visible,
  onClose,
  currentProgress,
}: {
  visible: boolean
  onClose: () => void
  currentProgress: number
}) {
  const clamped = Math.min(Math.max(currentProgress, 0), CORRECT_TO_MASTER)

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Mastery levels">
      <View style={styles.sheetContent}>
        <Text style={styles.sheetIntro}>
          Five levels — fill each segment to fully master a word.
        </Text>

        {WORD_MASTERY_LEVELS.map((item) => {
          const achieved = clamped >= item.level
          const isCurrent = !achieved && clamped === item.level - 1

          return (
            <View
              key={item.level}
              style={[
                styles.levelRow,
                achieved && styles.levelRowAchieved,
                isCurrent && styles.levelRowCurrent,
              ]}
            >
              <View style={[styles.levelBadge, { backgroundColor: achieved ? item.color : `${item.color}55` }]}>
                <Text style={[styles.levelBadgeText, achieved && styles.levelBadgeTextAchieved]}>
                  {item.level}
                </Text>
              </View>
              <View style={styles.levelCopy}>
                <View style={styles.levelTitleRow}>
                  <Text style={styles.levelTitle}>{item.title}</Text>
                  {achieved ? (
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  ) : isCurrent ? (
                    <Text style={styles.levelHere}>Current</Text>
                  ) : null}
                </View>
                <Text style={styles.levelDescription}>{item.description}</Text>
              </View>
            </View>
          )
        })}
      </View>
    </BottomSheet>
  )
}

export function WordMasteryBar({
  progress,
  maxLevel = CORRECT_TO_MASTER,
  height = DEFAULT_BATTERY_HEIGHT,
}: WordMasteryBarProps) {
  const [infoOpen, setInfoOpen] = useState(false)
  const batteryHeight = Math.max(22, Math.round(height))

  return (
    <>
      <View style={styles.cluster}>
        <BatteryIcon progress={progress} maxLevel={maxLevel} height={batteryHeight} />
        <Pressable
          onPress={() => setInfoOpen(true)}
          style={({ pressed }) => [styles.infoBtn, pressed && styles.infoBtnPressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Explain mastery levels"
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      <MasteryInfoSheet
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
        currentProgress={progress}
      />
    </>
  )
}

const styles = StyleSheet.create({
  cluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  battery: {
    alignItems: "center",
  },
  cap: {
    backgroundColor: colors.textMuted,
  },
  body: {
    borderWidth: 1,
    borderColor: colors.textMuted,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
  },
  infoBtn: {
    padding: 2,
  },
  infoBtnPressed: {
    opacity: 0.65,
  },
  sheetContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  sheetIntro: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  levelRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  levelRowAchieved: {
    borderColor: "#BBF7D0",
    backgroundColor: colors.successBg,
  },
  levelRowCurrent: {
    borderColor: "#C4B5FD",
    backgroundColor: "#F5F3FF",
  },
  levelBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  levelBadgeTextAchieved: {
    color: "#fff",
  },
  levelCopy: {
    flex: 1,
    gap: 1,
  },
  levelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  levelTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  levelHere: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
    textTransform: "uppercase",
  },
  levelDescription: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
  },
})
