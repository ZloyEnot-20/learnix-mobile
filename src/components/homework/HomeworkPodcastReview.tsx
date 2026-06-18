import React from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { HomeworkAttempt, PodcastListeningStats, Subject } from "../../types/domain"
import type { PodcastEpisode } from "../../types/podcast"
import { podcastWordLabel } from "../../types/podcast"
import { formatShortDate } from "../../lib/utils"
import { colors, radius, spacing } from "../../theme/tokens"
import { HomeworkReviewShell } from "./HomeworkReviewShell"

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function ListeningStatsCard({ stats }: { stats: PodcastListeningStats }) {
  const listenRatio =
    stats.podcastDurationSeconds > 0
      ? Math.min(100, Math.round((stats.totalListenSeconds / stats.podcastDurationSeconds) * 100))
      : null

  return (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Listening behavior</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="time-outline" size={20} color={colors.success} />
          <Text style={styles.statValue}>{formatDuration(stats.totalListenSeconds)}</Text>
          <Text style={styles.statLabel}>Total listened</Text>
          {listenRatio != null ? (
            <Text style={styles.statHint}>
              {listenRatio}% of {formatDuration(stats.podcastDurationSeconds)} episode
            </Text>
          ) : null}
        </View>
        <View style={styles.statBox}>
          <Ionicons name="swap-horizontal-outline" size={20} color={colors.success} />
          <Text style={styles.statValue}>{stats.seekCount}</Text>
          <Text style={styles.statLabel}>Seeks</Text>
          <Text style={styles.statHint}>
            {stats.rewindCount} back · {stats.forwardCount} forward
          </Text>
        </View>
      </View>
      {stats.wordsReviewed > 0 ? (
        <View style={styles.wordsReviewed}>
          <Ionicons name="book-outline" size={16} color={colors.success} />
          <Text style={styles.wordsReviewedText}>
            {stats.wordsReviewed} words reviewed
          </Text>
        </View>
      ) : null}
      {stats.seeks.length > 0 ? (
        <View style={styles.seekList}>
          <Text style={styles.seekListTitle}>Seek events</Text>
          {stats.seeks.slice(-5).map((seek, i) => (
            <Text key={i} style={styles.seekItem}>
              {formatDuration(seek.fromSeconds)} → {formatDuration(seek.toSeconds)}
            </Text>
          ))}
          {stats.seeks.length > 5 ? (
            <Text style={styles.seekMore}>+{stats.seeks.length - 5} more</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

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
  const stats = attempt.listeningStats
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

        {stats ? <ListeningStatsCard stats={stats} /> : null}

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
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  statHint: { fontSize: 11, color: colors.textMuted, textAlign: "center" },
  wordsReviewed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: spacing.xs,
  },
  wordsReviewedText: { fontSize: 13, color: colors.success, fontWeight: "600" },
  seekList: { gap: 4, paddingTop: spacing.xs },
  seekListTitle: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  seekItem: { fontSize: 12, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  seekMore: { fontSize: 11, color: colors.textMuted },
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
