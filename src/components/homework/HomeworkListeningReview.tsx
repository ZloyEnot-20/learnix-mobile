import React, { useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { HomeworkAttempt, Subject } from "../../types/domain"
import type { IeltsListeningTest } from "../../types/ielts"
import { buildListeningReviewItems, type ListeningReviewItem } from "../../lib/homework-review"
import { formatShortDate, scoreColor } from "../../lib/utils"
import { colors, radius, shadow, spacing } from "../../theme/tokens"
import { HomeworkReviewShell } from "./HomeworkReviewShell"

interface HomeworkListeningReviewProps {
  test: IeltsListeningTest
  attempt: HomeworkAttempt
  title: string
  subject?: Subject
  completedAt?: string
}

type ViewMode = "list" | "single"
type FilterMode = "all" | "incorrect"

const STATUS_META = {
  correct: { icon: "checkmark" as const, color: colors.success, bg: colors.successBg },
  incorrect: { icon: "close" as const, color: colors.error, bg: colors.errorBg },
  skipped: { icon: "remove" as const, color: colors.textMuted, bg: colors.borderLight },
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

function QuestionCard({
  item,
  expanded,
  onToggle,
}: {
  item: ListeningReviewItem
  expanded: boolean
  onToggle: () => void
}) {
  const meta = STATUS_META[item.status]
  const isIncorrect = item.status === "incorrect"

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.qCard,
        isIncorrect && styles.qCardIncorrect,
        expanded && styles.qCardExpanded,
        pressed && styles.qCardPressed,
      ]}
    >
      {isIncorrect ? <View style={styles.qAccent} /> : null}
      <View style={styles.qCardInner}>
        <View style={[styles.qStatusIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
        </View>

        <View style={styles.qCardBody}>
          <Text style={styles.qLabel}>
            Q{item.questionId} · Part {item.partNumber}
          </Text>
          <Text style={styles.qPrompt} numberOfLines={expanded ? undefined : 2}>
            {item.prompt}
          </Text>

          {expanded ? (
            <View style={styles.qDetails}>
              {item.userAnswer ? (
                <View style={styles.detailRow}>
                  <Ionicons name="close" size={14} color={colors.error} />
                  <Text style={styles.detailWrong}>You: {item.userAnswer}</Text>
                </View>
              ) : null}

              {item.status !== "correct" ? (
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                  <Text style={styles.detailRight}>Correct: {item.correctAnswer}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={18}
          color={colors.textMuted}
        />
      </View>
    </Pressable>
  )
}

function QuestionDetail({
  item,
  position,
  total,
}: {
  item: ListeningReviewItem
  position: number
  total: number
}) {
  const meta = STATUS_META[item.status]

  return (
    <View style={styles.singleCard}>
      <View style={styles.singleHeader}>
        <View style={[styles.qStatusIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
        </View>
        <Text style={styles.singleCounter}>
          {position + 1} / {total}
        </Text>
      </View>

      <Text style={styles.qLabel}>
        Q{item.questionId} · Part {item.partNumber}
      </Text>
      <Text style={styles.singlePrompt}>{item.prompt}</Text>

      <View style={styles.qDetails}>
        {item.userAnswer ? (
          <View style={styles.detailRow}>
            <Ionicons name="close" size={14} color={colors.error} />
            <Text style={styles.detailWrong}>You: {item.userAnswer}</Text>
          </View>
        ) : null}

        {item.status !== "correct" ? (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark" size={14} color={colors.success} />
            <Text style={styles.detailRight}>Correct: {item.correctAnswer}</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

export function HomeworkListeningReview({
  test,
  attempt,
  title,
  subject = "listening",
  completedAt,
}: HomeworkListeningReviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [filter, setFilter] = useState<FilterMode>("all")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [singleIndex, setSingleIndex] = useState(0)

  const items = useMemo(
    () => buildListeningReviewItems(test, attempt),
    [test, attempt],
  )

  const incorrectCount = items.filter((i) => i.status === "incorrect").length
  const filteredItems = useMemo(
    () => (filter === "incorrect" ? items.filter((i) => i.status === "incorrect") : items),
    [items, filter],
  )

  useEffect(() => {
    setSingleIndex(0)
    setExpandedId(null)
  }, [filter, viewMode])

  const { correctCount, totalQuestions } = attempt
  const durationMin = Math.max(1, Math.round((attempt.durationSeconds ?? 0) / 60))
  const completedLabel = completedAt ? formatShortDate(completedAt) : null
  const currentSingle = filteredItems[singleIndex]
  const legacySubmission =
    attempt.mistakes.length === 0 &&
    !attempt.readingAnswers?.length &&
    correctCount < totalQuestions

  return (
    <HomeworkReviewShell title={title} subject={subject}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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

        {legacySubmission ? (
          <Text style={styles.legacyNote}>
            Per-question breakdown is limited for this submission. Expand a question to see the
            correct answer.
          </Text>
        ) : null}

        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => setViewMode("list")}
            style={[styles.viewTab, viewMode === "list" && styles.viewTabActive]}
          >
            <Text style={[styles.viewTabText, viewMode === "list" && styles.viewTabTextActive]}>
              All questions
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("single")}
            style={[styles.viewTab, viewMode === "single" && styles.viewTabActive]}
          >
            <Text style={[styles.viewTabText, viewMode === "single" && styles.viewTabTextActive]}>
              One by one
            </Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilter("all")}
            style={[styles.filterChip, filter === "all" && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
              All {items.length}
            </Text>
          </Pressable>
          {incorrectCount > 0 ? (
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
          ) : null}
        </View>

        {viewMode === "list" ? (
          <View style={styles.list}>
            {filteredItems.length === 0 ? (
              <Text style={styles.emptyText}>No questions in this filter.</Text>
            ) : (
              filteredItems.map((item) => (
                <QuestionCard
                  key={item.questionId}
                  item={item}
                  expanded={expandedId === item.questionId}
                  onToggle={() =>
                    setExpandedId((prev) =>
                      prev === item.questionId ? null : item.questionId,
                    )
                  }
                />
              ))
            )}
          </View>
        ) : currentSingle ? (
          <View style={styles.singleWrap}>
            <QuestionDetail
              item={currentSingle}
              position={singleIndex}
              total={filteredItems.length}
            />
            <View style={styles.singleNav}>
              <Pressable
                onPress={() => setSingleIndex((i) => Math.max(0, i - 1))}
                disabled={singleIndex === 0}
                style={[styles.navBtn, singleIndex === 0 && styles.navBtnDisabled]}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={singleIndex === 0 ? colors.textMuted : colors.text}
                />
                <Text
                  style={[styles.navBtnText, singleIndex === 0 && styles.navBtnTextDisabled]}
                >
                  Previous
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setSingleIndex((i) => Math.min(filteredItems.length - 1, i + 1))
                }
                disabled={singleIndex >= filteredItems.length - 1}
                style={[
                  styles.navBtn,
                  styles.navBtnNext,
                  singleIndex >= filteredItems.length - 1 && styles.navBtnDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.navBtnText,
                    singleIndex >= filteredItems.length - 1 && styles.navBtnTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={
                    singleIndex >= filteredItems.length - 1 ? colors.textMuted : colors.text
                  }
                />
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No questions in this filter.</Text>
        )}
      </ScrollView>
    </HomeworkReviewShell>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  scoreRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scoreRingValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  scoreRingLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  summaryStats: { flex: 1, gap: 6 },
  summaryStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryStatText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  legacyNote: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.sm,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  viewTabActive: {
    backgroundColor: colors.card,
    ...shadow.card,
  },
  viewTabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  viewTabTextActive: { color: colors.text },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  filterTextActive: { color: colors.primaryDark },
  list: { gap: spacing.sm },
  qCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  qCardIncorrect: { borderColor: colors.error + "44" },
  qCardExpanded: { borderColor: colors.primary + "55" },
  qCardPressed: { opacity: 0.92 },
  qAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.error,
  },
  qCardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
  },
  qStatusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  qCardBody: { flex: 1, minWidth: 0, gap: 4 },
  qLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  qPrompt: { fontSize: 15, fontWeight: "600", color: colors.text, lineHeight: 22 },
  qDetails: { marginTop: spacing.sm, gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  detailWrong: { flex: 1, fontSize: 14, color: colors.error, lineHeight: 20 },
  detailRight: { flex: 1, fontSize: 14, color: colors.success, lineHeight: 20 },
  singleWrap: { gap: spacing.md },
  singleCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  singleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  singleCounter: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  singlePrompt: { fontSize: 16, fontWeight: "600", color: colors.text, lineHeight: 24 },
  singleNav: { flexDirection: "row", gap: spacing.sm },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  navBtnNext: { flexDirection: "row-reverse" },
  navBtnDisabled: { opacity: 0.45 },
  navBtnText: { fontSize: 14, fontWeight: "600", color: colors.text },
  navBtnTextDisabled: { color: colors.textMuted },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
})
