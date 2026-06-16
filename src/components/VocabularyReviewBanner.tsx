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
  const isReady = preview.status === "ready"

  const headline = isReady
    ? `${preview.totalCount} word${preview.totalCount === 1 ? "" : "s"} to review`
    : preview.status === "done_today"
      ? "Review done for today"
      : "All words mastered"

  const subline = isReady
    ? "Daily review · 5 correct to master"
    : preview.status === "done_today"
      ? "Come back tomorrow to review, or study and add new words in Learn."
      : "Great work! Study new vocabulary in Learn to add more words."

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Vocabulary review</Text>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={isReady ? "layers-outline" : "moon-outline"}
              size={22}
              color="#C4B5FD"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headline}>{headline}</Text>
            <Text style={styles.subline}>{subline}</Text>
          </View>
        </View>

        {isReady && preview.previewWords.length > 0 ? (
          <View style={styles.chips}>
            {preview.previewWords.map((word) => (
              <View key={`${word.deckSlug ?? "word"}-${word.term}`} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {word.term}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            !isReady && styles.secondaryBtn,
            pressed && styles.startBtnPressed,
          ]}
          onPress={() =>
            isReady
              ? router.push("/vocabulary/review" as never)
              : router.push("/(tabs)/games" as never)
          }
        >
          <Ionicons
            name={isReady ? "play" : "book-outline"}
            size={14}
            color={isReady ? colors.text : "#E2E8F0"}
          />
          <Text style={[styles.startBtnText, !isReady && styles.secondaryBtnText]}>
            {isReady ? "Start review" : "Study new words"}
          </Text>
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
    lineHeight: 17,
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
  secondaryBtn: {
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.28)",
  },
  startBtnPressed: { opacity: 0.92 },
  startBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  secondaryBtnText: {
    color: "#E2E8F0",
  },
})
