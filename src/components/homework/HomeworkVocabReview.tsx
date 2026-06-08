import React, { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { HomeworkAttempt, Subject } from "../../types/domain"
import type { VocabDeck } from "../../types/vocabulary"
import { formatShortDate, scoreColor } from "../../lib/utils"
import { colors, radius, shadow, spacing } from "../../theme/tokens"
import { HomeworkReviewShell } from "./HomeworkReviewShell"

interface HomeworkVocabReviewProps {
  deck: VocabDeck
  attempt: HomeworkAttempt
  title: string
  subject?: Subject
  completedAt?: string
}

function ScoreRing({ correct, total }: { correct: number; total: number }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const ringColor = scoreColor(pct)

  return (
    <View style={[styles.scoreRing, { borderColor: ringColor }]}>
      <Text style={styles.scoreRingValue}>
        {correct}/{total}
      </Text>
      <Text style={styles.scoreRingLabel}>score</Text>
    </View>
  )
}

export function HomeworkVocabReview({
  deck,
  attempt,
  title,
  subject = "vocabulary",
  completedAt,
}: HomeworkVocabReviewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { correctCount, totalQuestions } = attempt
  const durationMin = Math.max(1, Math.round((attempt.durationSeconds ?? 0) / 60))
  const completedLabel = completedAt ? formatShortDate(completedAt) : null

  const mistakeByPrompt = useMemo(
    () => new Map(attempt.mistakes.map((m) => [m.prompt, m])),
    [attempt.mistakes],
  )

  const incorrectCount = attempt.mistakes.length

  const words = useMemo(() => {
    if (attempt.mistakes.length > 0) {
      return deck.words.filter((w) => mistakeByPrompt.has(w.term))
    }
    return deck.words
  }, [deck.words, attempt.mistakes.length, mistakeByPrompt])

  const [filter, setFilter] = useState<"all" | "incorrect">("all")
  const visibleWords =
    filter === "incorrect" && incorrectCount > 0
      ? deck.words.filter((w) => mistakeByPrompt.has(w.term))
      : deck.words

  return (
    <HomeworkReviewShell title={title} subject={subject}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <ScoreRing correct={correctCount} total={totalQuestions} />
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={styles.summaryStatText}>
                {correctCount} of {totalQuestions} correct
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.summaryStatText}>{durationMin} min</Text>
            </View>
            {completedLabel ? (
              <View style={styles.summaryStat}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.summaryStatText}>Completed {completedLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {incorrectCount > 0 ? (
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setFilter("all")}
              style={[styles.filterChip, filter === "all" && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
                All {deck.words.length}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter("incorrect")}
              style={[styles.filterChip, filter === "incorrect" && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterText, filter === "incorrect" && styles.filterTextActive]}
              >
                Incorrect {incorrectCount}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.list}>
          {visibleWords.map((word) => {
            const mistake = mistakeByPrompt.get(word.term)
            const isIncorrect = !!mistake
            const expanded = expandedId === word.id

            return (
              <Pressable
                key={word.id}
                onPress={() => setExpandedId((prev) => (prev === word.id ? null : word.id))}
                style={({ pressed }) => [
                  styles.wordCard,
                  isIncorrect && styles.wordCardIncorrect,
                  pressed && styles.wordCardPressed,
                ]}
              >
                {isIncorrect ? <View style={styles.wordAccent} /> : null}
                <View style={styles.wordCardInner}>
                  <View
                    style={[
                      styles.wordStatus,
                      {
                        backgroundColor: isIncorrect ? colors.errorBg : colors.successBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isIncorrect ? "close" : "checkmark"}
                      size={16}
                      color={isIncorrect ? colors.error : colors.success}
                    />
                  </View>
                  <View style={styles.wordBody}>
                    <Text style={styles.wordTerm}>{word.term}</Text>
                    {expanded ? (
                      <View style={styles.wordDetails}>
                        {mistake ? (
                          <View style={styles.detailRow}>
                            <Ionicons name="close" size={14} color={colors.error} />
                            <Text style={styles.detailWrong}>You: {mistake.userAnswer}</Text>
                          </View>
                        ) : null}
                        <View style={styles.detailRow}>
                          <Ionicons name="checkmark" size={14} color={colors.success} />
                          <Text style={styles.detailRight}>
                            Correct: {mistake?.correctAnswer ?? word.translation}
                          </Text>
                        </View>
                        {word.definition ? (
                          <Text style={styles.wordDef}>{word.definition}</Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.wordHint} numberOfLines={1}>
                        {word.definition}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={expanded ? "chevron-down" : "chevron-forward"}
                    size={18}
                    color={colors.textMuted}
                  />
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </HomeworkReviewShell>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  scoreRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scoreRingValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 22,
  },
  scoreRingLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  summaryStats: { flex: 1, gap: 10 },
  summaryStat: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryStatText: { fontSize: 14, color: colors.textSecondary, flexShrink: 1 },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  filterTextActive: { color: colors.success },
  list: { gap: spacing.sm },
  wordCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadow.card,
  },
  wordCardIncorrect: {
    borderWidth: 1,
    borderColor: colors.errorBg,
  },
  wordCardPressed: { opacity: 0.92 },
  wordAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.error,
  },
  wordCardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    paddingLeft: spacing.md + 2,
  },
  wordStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  wordBody: { flex: 1, minWidth: 0, gap: 4 },
  wordTerm: { fontSize: 15, fontWeight: "600", color: colors.text },
  wordHint: { fontSize: 13, color: colors.textMuted },
  wordDetails: { marginTop: spacing.sm, gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  detailWrong: { flex: 1, fontSize: 14, color: colors.error, lineHeight: 20 },
  detailRight: { flex: 1, fontSize: 14, color: colors.success, lineHeight: 20 },
  wordDef: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 2 },
})
