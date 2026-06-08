import React, { useEffect, useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { HomeworkAttempt, Subject } from "../../types/domain"
import type { GrammarExercise } from "../../types/grammar"
import {
  buildReviewQuestions,
  type ReviewQuestionItem,
} from "../../lib/homework-review"
import { formatShortDate, scoreColor } from "../../lib/utils"
import { colors, radius, shadow, spacing } from "../../theme/tokens"
import { HomeworkReviewShell } from "./HomeworkReviewShell"

interface HomeworkGrammarReviewProps {
  exercise: GrammarExercise
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

function SummaryStat({
  icon,
  label,
  color = colors.textSecondary,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  color?: string
}) {
  return (
    <View style={styles.summaryStat}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={styles.summaryStatText}>{label}</Text>
    </View>
  )
}

function QuestionCard({
  item,
  expanded,
  onToggle,
}: {
  item: ReviewQuestionItem
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
          <Text style={styles.qLabel}>QUESTION {item.index + 1}</Text>
          <Text style={styles.qPrompt} numberOfLines={expanded ? undefined : 2}>
            {item.question.text}
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

              {item.question.explanation ? (
                <Text style={styles.explanation}>{item.question.explanation}</Text>
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
  item: ReviewQuestionItem
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

      <Text style={styles.qLabel}>QUESTION {item.index + 1}</Text>
      {item.question.instruction ? (
        <Text style={styles.instruction}>{item.question.instruction}</Text>
      ) : null}
      <Text style={styles.singlePrompt}>{item.question.text}</Text>

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

        {item.question.explanation ? (
          <Text style={styles.explanation}>{item.question.explanation}</Text>
        ) : null}
      </View>
    </View>
  )
}

export function HomeworkGrammarReview({
  exercise,
  attempt,
  title,
  subject = "grammar",
  completedAt,
}: HomeworkGrammarReviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [filter, setFilter] = useState<FilterMode>("all")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [singleIndex, setSingleIndex] = useState(0)

  const items = useMemo(
    () => buildReviewQuestions(exercise, attempt),
    [exercise, attempt],
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

  const toggleExpand = (questionId: number) => {
    setExpandedId((prev) => (prev === questionId ? null : questionId))
  }

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
            <SummaryStat
              icon="checkmark-circle-outline"
              label={`${correctCount} of ${totalQuestions} correct`}
              color={colors.success}
            />
            <SummaryStat icon="time-outline" label={`${durationMin} min`} />
            {completedLabel ? (
              <SummaryStat
                icon="calendar-outline"
                label={`Completed ${completedLabel}`}
              />
            ) : null}
          </View>
        </View>

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
                  key={item.question.id}
                  item={item}
                  expanded={expandedId === item.question.id}
                  onToggle={() => toggleExpand(item.question.id)}
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
                  style={[
                    styles.navBtnText,
                    singleIndex === 0 && styles.navBtnTextDisabled,
                  ]}
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
                    singleIndex >= filteredItems.length - 1
                      ? colors.textMuted
                      : colors.text
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
  summaryStats: {
    flex: 1,
    gap: 10,
  },
  summaryStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryStatText: {
    fontSize: 14,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: radius.button,
    padding: 4,
    marginBottom: spacing.sm,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  viewTabActive: {
    backgroundColor: colors.success,
  },
  viewTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  viewTabTextActive: {
    color: "#fff",
  },
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
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.success,
  },
  list: { gap: spacing.sm },
  qCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadow.card,
  },
  qCardIncorrect: {
    borderWidth: 1,
    borderColor: colors.errorBg,
  },
  qCardExpanded: {
    borderColor: colors.border,
  },
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
    paddingLeft: spacing.md + 2,
  },
  qStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  qCardBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  qLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  qPrompt: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 21,
  },
  qDetails: {
    marginTop: spacing.sm,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  detailWrong: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
  detailRight: {
    flex: 1,
    fontSize: 14,
    color: colors.success,
    lineHeight: 20,
  },
  explanation: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },
  singleWrap: { gap: spacing.md },
  singleCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow.card,
  },
  singleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  singleCounter: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  instruction: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
    marginBottom: 4,
  },
  singlePrompt: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  singleNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  navBtnNext: { flexDirection: "row" },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 15, fontWeight: "600", color: colors.text },
  navBtnTextDisabled: { color: colors.textMuted },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 24,
  },
})
