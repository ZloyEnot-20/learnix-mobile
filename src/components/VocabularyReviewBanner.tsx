import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import type { VocabularyReviewPreview } from "../lib/learned-vocabulary"
import { colors, radius, spacing, typography } from "../theme/tokens"

interface VocabularyReviewBannerProps {
  preview: VocabularyReviewPreview
}

export function VocabularyReviewBanner({ preview }: VocabularyReviewBannerProps) {
  const router = useRouter()
  const reviewCount = Math.min(5, preview.totalCount)

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Vocabulary review</Text>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="layers-outline" size={22} color="#C4B5FD" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headline}>
              {reviewCount} word{reviewCount === 1 ? "" : "s"} to review
            </Text>
            <Text style={styles.subline}>Spaced repetition · keeps memory fresh</Text>
          </View>
        </View>

        <View style={styles.chips}>
          {preview.previewWords.map((word) => (
            <View key={`${word.deckSlug ?? "word"}-${word.term}`} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {word.term}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
          onPress={() => router.push("/vocabulary/review" as never)}
        >
          <Ionicons name="play" size={14} color={colors.text} />
          <Text style={styles.startBtnText}>Start review</Text>
        </Pressable>
      </View>
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
    backgroundColor: "#1F3D32",
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headline: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    lineHeight: 21,
  },
  subline: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(226, 232, 240, 0.72)",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.28)",
    backgroundColor: "rgba(15, 23, 42, 0.22)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(241, 245, 249, 0.92)",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C4B5FD",
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  startBtnPressed: { opacity: 0.92 },
  startBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
})
