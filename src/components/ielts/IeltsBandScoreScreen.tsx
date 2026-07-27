import React, { useEffect, useRef } from "react"
import { Animated, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, spacing, subjectColors } from "../../theme/tokens"

type IeltsSkill = "listening" | "reading"
type ScoreMode = "band" | "percentage"

function bandFeedback(band: number): string {
  if (band >= 8) return "Outstanding — excellent command of the language."
  if (band >= 7) return "Great job — strong operational command."
  if (band >= 6) return "Solid result — generally effective command."
  if (band >= 5) return "Fair performance — keep practising the fundamentals."
  return "Keep going — focused practice will raise your band."
}

function percentageFeedback(pct: number): string {
  if (pct >= 90) return "Excellent work — almost everything correct."
  if (pct >= 75) return "Great job — strong understanding of the text."
  if (pct >= 60) return "Good effort — review the missed questions."
  if (pct >= 40) return "Keep practising — focus on the key details."
  return "Keep going — reread the passage and try again."
}

function bandTone(band: number): string {
  if (band >= 7) return colors.success
  if (band >= 5.5) return colors.primary
  if (band >= 4.5) return colors.warning
  return colors.error
}

function percentageTone(pct: number): string {
  if (pct >= 80) return colors.success
  if (pct >= 60) return colors.primary
  if (pct >= 40) return colors.warning
  return colors.error
}

interface IeltsBandScoreScreenProps {
  skill: IeltsSkill
  title?: string
  band: number
  correct: number
  total: number
  scoreMode?: ScoreMode
  levelLabel?: string
  onViewResults: () => void
  onGoHome: () => void
}

export function IeltsBandScoreScreen({
  skill,
  title,
  band,
  correct,
  total,
  scoreMode = "band",
  levelLabel,
  onViewResults,
  onGoHome,
}: IeltsBandScoreScreenProps) {
  const insets = useSafeAreaInsets()
  const accent = subjectColors[skill] ?? colors.primary
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const showPercentage = scoreMode === "percentage"
  const tone = showPercentage ? percentageTone(pct) : bandTone(band)

  const heroOpacity = useRef(new Animated.Value(0)).current
  const heroScale = useRef(new Animated.Value(0.82)).current
  const detailsOpacity = useRef(new Animated.Value(0)).current
  const detailsY = useRef(new Animated.Value(18)).current
  const actionsOpacity = useRef(new Animated.Value(0)).current
  const actionsY = useRef(new Animated.Value(16)).current

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(heroScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(detailsOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(detailsY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(actionsOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(actionsY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [actionsOpacity, actionsY, detailsOpacity, detailsY, heroOpacity, heroScale])

  const skillLabel = skill === "listening" ? "Listening" : "Reading"
  const icon = skill === "listening" ? "headset" : "book"
  const chipLabel = showPercentage
    ? levelLabel
      ? `${levelLabel} ${skillLabel}`
      : skillLabel
    : `IELTS ${skillLabel}`

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
        },
      ]}
    >
      <View style={[styles.glowTop, { backgroundColor: accent }]} pointerEvents="none" />
      <View style={[styles.glowBottom, { backgroundColor: tone }]} pointerEvents="none" />

      <View style={styles.header}>
        <View style={[styles.skillChip, { backgroundColor: accent + "33" }]}>
          <Ionicons name={icon} size={14} color={colors.text} />
          <Text style={styles.skillChipText}>{chipLabel}</Text>
        </View>
        {title ? (
          <Text style={styles.testTitle} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroOpacity,
              transform: [{ scale: heroScale }],
            },
          ]}
        >
          <View style={[styles.ringOuter, { borderColor: accent + "55" }]}>
            <View style={[styles.ringInner, { borderColor: tone }]}>
              <Text style={styles.bandLabel}>{showPercentage ? "Score" : "Band"}</Text>
              <Text style={[styles.bandValue, { color: tone }]}>
                {showPercentage ? `${pct}%` : band.toFixed(1)}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.details,
            {
              opacity: detailsOpacity,
              transform: [{ translateY: detailsY }],
            },
          ]}
        >
          <Text style={styles.completeTitle}>Test complete</Text>
          <Text style={styles.scoreLine}>
            {showPercentage
              ? `${correct}/${total} correct`
              : `${correct}/${total} correct · ${pct}%`}
          </Text>
          <Text style={styles.feedback}>
            {showPercentage ? percentageFeedback(pct) : bandFeedback(band)}
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.actions,
          {
            opacity: actionsOpacity,
            transform: [{ translateY: actionsY }],
          },
        ]}
      >
        <Pressable
          onPress={onViewResults}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="View results"
        >
          <Ionicons name="list-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>View results</Text>
        </Pressable>

        <Pressable
          onPress={onGoHome}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go home"
        >
          <Ionicons name="home-outline" size={18} color={colors.text} />
          <Text style={styles.secondaryBtnText}>Home</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screen,
  },
  glowTop: {
    position: "absolute",
    top: -80,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.28,
  },
  glowBottom: {
    position: "absolute",
    bottom: 40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.14,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  skillChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  testTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 22,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringOuter: {
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  ringInner: {
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bandLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  bandValue: {
    fontSize: 56,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    lineHeight: 62,
  },
  details: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  scoreLine: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  feedback: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 320,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  pressed: { opacity: 0.9 },
})
