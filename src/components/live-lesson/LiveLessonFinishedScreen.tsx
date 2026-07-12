import React, { useEffect, useRef } from "react"
import { Animated, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, spacing } from "../../theme/tokens"

type Props = {
  unitNumber?: number | null
  score?: number | null
  onGoHome: () => void
  onDismiss?: () => void
}

/**
 * Celebration when the teacher finishes the live lesson.
 * Animation pattern mirrors IeltsBandScoreScreen (staged fade + spring).
 */
export function LiveLessonFinishedScreen({ unitNumber, score, onGoHome, onDismiss }: Props) {
  const insets = useSafeAreaInsets()
  const accent = colors.primary
  const tone = colors.success

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

  const scoreLabel = score != null ? String(Math.round(score)) : "—"

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
          <Ionicons name="school" size={14} color={colors.text} />
          <Text style={styles.skillChipText}>Live lesson</Text>
        </View>
        {unitNumber != null ? (
          <Text style={styles.testTitle} numberOfLines={2}>
            Unit {unitNumber}
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
              <Ionicons name="checkmark-circle" size={28} color={tone} style={{ marginBottom: 4 }} />
              <Text style={styles.bandLabel}>Done</Text>
              <Text style={[styles.bandValue, { color: tone }]}>{scoreLabel}</Text>
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
          <Text style={styles.completeTitle}>Lesson finished</Text>
          <Text style={styles.scoreLine}>
            {score != null ? `Your score · ${Math.round(score)}` : "Great work in class today"}
          </Text>
          <Text style={styles.feedback}>
            Your teacher ended the session. See you at the next lesson.
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
          onPress={onGoHome}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go home"
        >
          <Ionicons name="home-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Go home</Text>
        </Pressable>

        {onDismiss ? (
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Stay here</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screen,
    overflow: "hidden",
  },
  glowTop: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    right: -60,
    opacity: 0.18,
  },
  glowBottom: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    bottom: 40,
    left: -70,
    opacity: 0.14,
  },
  header: { gap: 8, marginBottom: spacing.md },
  skillChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  skillChipText: { fontSize: 12, fontWeight: "700", color: colors.text },
  testTitle: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  hero: { alignItems: "center" },
  ringOuter: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  bandLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, letterSpacing: 1 },
  bandValue: { fontSize: 40, fontWeight: "800", marginTop: 2 },
  details: { alignItems: "center", gap: 8, paddingHorizontal: spacing.md },
  completeTitle: { fontSize: 24, fontWeight: "800", color: colors.text },
  scoreLine: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  feedback: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  actions: { gap: spacing.sm },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.button,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  secondaryBtnText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  pressed: { opacity: 0.88 },
})
