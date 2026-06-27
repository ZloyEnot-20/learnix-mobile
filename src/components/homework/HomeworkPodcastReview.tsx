import React from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { HomeworkAttempt, Subject } from "../../types/domain"
import type { PodcastEpisode } from "../../types/podcast"
import { podcastWordLabel } from "../../types/podcast"
import { formatShortDate } from "../../lib/utils"
import { colors, radius, spacing } from "../../theme/tokens"
import { HomeworkReviewShell } from "./HomeworkReviewShell"

interface HomeworkPodcastReviewProps {
  episode: PodcastEpisode
  attempt: HomeworkAttempt
  title: string
  subject?: Subject
  completedAt?: string
}

export function HomeworkPodcastReview({
  episode,
  attempt,
  title,
  subject = "listening",
  completedAt,
}: HomeworkPodcastReviewProps) {
  const durationMin = Math.max(1, Math.round((attempt.durationSeconds ?? 0) / 60))
  const completedLabel = completedAt ? formatShortDate(completedAt) : null
  const wordsCount = episode.words.length

  return (
    <HomeworkReviewShell title={title} subject={subject} accentColor={colors.success}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="headset" size={28} color={colors.success} />
          </View>
          <Text style={styles.summaryTitle}>Listening completed</Text>
          <Text style={styles.summaryEpisode}>{episode.title}</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.summaryStatText}>{durationMin} min session</Text>
            </View>
            {wordsCount > 0 ? (
              <View style={styles.summaryStat}>
                <Ionicons name="book-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.summaryStatText}>
                  {attempt.listeningStats?.wordsReviewed ?? wordsCount} words reviewed
                </Text>
              </View>
            ) : null}
            {completedLabel ? (
              <View style={styles.summaryStat}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.summaryStatText}>Completed {completedLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {wordsCount > 0 ? (
          <View style={styles.wordsSection}>
            <Text style={styles.wordsSectionTitle}>Vocabulary from episode</Text>
            {episode.words.map((word, i) => (
              <View key={`${podcastWordLabel(word)}-${i}`} style={styles.wordRow}>
                <Text style={styles.wordTerm}>{podcastWordLabel(word)}</Text>
                {word.definition ? (
                  <Text style={styles.wordDef}>{word.definition}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </HomeworkReviewShell>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.screen, paddingBottom: spacing.xl, gap: spacing.md },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  summaryTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  summaryEpisode: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  summaryStats: { marginTop: spacing.sm, gap: 6, alignItems: "center" },
  summaryStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryStatText: { fontSize: 13, color: colors.textSecondary },
  wordsSection: { gap: spacing.sm },
  wordsSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  wordRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  wordTerm: { fontSize: 16, fontWeight: "700", color: colors.text },
  wordDef: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
})
