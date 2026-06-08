import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import type { ContinueLearningItem } from "../lib/continue-learning"
import type { Subject } from "../types/domain"
import { colors, radius, spacing, typography } from "../theme/tokens"

const SUBJECT_ICONS: Record<Subject, keyof typeof Ionicons.glyphMap> = {
  reading: "book-outline",
  listening: "headset-outline",
  writing: "create-outline",
  speaking: "mic-outline",
  grammar: "school-outline",
  vocabulary: "library-outline",
}

interface ContinueLearningBannerProps {
  item: ContinueLearningItem
}

export function ContinueLearningBanner({ item }: ContinueLearningBannerProps) {
  const router = useRouter()
  const icon = SUBJECT_ICONS[item.subject] ?? "play-outline"
  const pct = item.progressPct ?? 0
  const showProgress = pct > 0 || item.progressLabel

  const handlePress = () => {
    router.push(item.route as never)
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Continue learning</Text>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={22} color={colors.text} />
          </View>

          <View style={styles.textCol}>
            <Text style={styles.category} numberOfLines={1}>
              {item.categoryLabel}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
          </View>

          <View style={styles.playBtn}>
            <Ionicons name="play" size={16} color={colors.success} />
          </View>
        </View>

        {showProgress ? (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(pct, 4)}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {item.progressLabel ??
                (item.minutesLeft != null
                  ? `${pct}% complete · ${item.minutesLeft} min left`
                  : `${pct}% complete`)}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: "#34D399",
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardPressed: { opacity: 0.94 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(17, 24, 39, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  category: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(17, 24, 39, 0.72)",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 21,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  progressSection: { gap: 6 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(17, 24, 39, 0.15)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(17, 24, 39, 0.72)",
  },
})
