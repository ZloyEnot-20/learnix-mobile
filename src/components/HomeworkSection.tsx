import React, { useMemo, useState } from "react"
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { formatDue, dateGroupLabel, formatShortDate, scoreColor } from "../lib/utils"
import type { IntegrityStatus } from "../types/domain"
import { colors, radius, shadow, spacing, typography, subjectColors } from "../theme/tokens"
import { FadeInDown } from "./ui/FadeInDown"

type Subject = "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary"
type Status = "pending" | "in_progress" | "completed"

export interface HomeworkItem {
  id: string
  subject: Subject
  title: string
  description: string
  dueAt: string
  createdAt: string
  status: Status
  timeLimitMinutes?: number
  completedAt?: string
  integrityStatus?: IntegrityStatus
  failedCheating?: boolean
  paused?: boolean
  pauseUsed?: boolean
  route?: string
  correctCount?: number
  totalQuestions?: number
}

const SUBJECT_ICONS: Record<Subject, keyof typeof Ionicons.glyphMap> = {
  reading: "book-outline",
  listening: "headset-outline",
  writing: "create-outline",
  speaking: "mic-outline",
  grammar: "school-outline",
  vocabulary: "library-outline",
}

const STATUS_META: Record<Status, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#F1F5F9", color: "#475569" },
  in_progress: { label: "In progress", bg: "#FEF3C7", color: "#B45309" },
  completed: { label: "Done", bg: "#D1FAE5", color: "#047857" },
}

function statusFor(hw: HomeworkItem) {
  if (hw.failedCheating) return { label: "Failed", bg: "#FEE2E2", color: "#B91C1C" }
  if (hw.paused) return { label: "Paused", bg: "#E0F2FE", color: "#0369A1" }
  return STATUS_META[hw.status]
}

function subjectName(subject: Subject): string {
  return subject.charAt(0).toUpperCase() + subject.slice(1)
}

function homeworkScore(hw: HomeworkItem): { percent: number; correct: number; total: number } | null {
  if (hw.correctCount != null && hw.totalQuestions != null && hw.totalQuestions > 0) {
    return {
      percent: Math.round((hw.correctCount / hw.totalQuestions) * 100),
      correct: hw.correctCount,
      total: hw.totalQuestions,
    }
  }
  return null
}

function actionLabel(hw: HomeworkItem, isCompleted: boolean) {
  if (hw.failedCheating) return null
  if (isCompleted) return "View"
  if (hw.paused || hw.status === "in_progress") return "Continue"
  return "Start"
}

function isInteractive(hw: HomeworkItem): boolean {
  return !!hw.route && !hw.failedCheating
}

function HomeworkHistoryCard({ hw }: { hw: HomeworkItem }) {
  const router = useRouter()
  const icon = SUBJECT_ICONS[hw.subject]
  const accent = subjectColors[hw.subject] ?? colors.textSecondary
  const score = homeworkScore(hw)
  const dateLabel = hw.completedAt ? formatShortDate(hw.completedAt) : null

  const interactive = isInteractive(hw)

  const handlePress = () => {
    if (interactive && hw.route) router.push(hw.route as never)
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={!interactive}
      style={({ pressed }) => [
        styles.historyCard,
        pressed && interactive && styles.cardPressed,
        !interactive && styles.cardDisabled,
      ]}
    >
      <View style={[styles.historyIcon, { backgroundColor: accent + "22" }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>

      <View style={styles.historyBody}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {hw.title}
        </Text>
        <View style={styles.historyMeta}>
          <Text style={[styles.historySubject, { color: accent }]}>{subjectName(hw.subject)}</Text>
          <Text style={styles.historyDot}>·</Text>
          <Ionicons name="checkmark" size={12} color={colors.success} />
          {dateLabel ? <Text style={styles.historyDate}>{dateLabel}</Text> : null}
        </View>
      </View>

      <View style={styles.historyScoreCol}>
        {hw.failedCheating ? (
          <Text style={[styles.historyPercent, { color: colors.error }]}>Failed</Text>
        ) : score ? (
          <>
            <Text style={[styles.historyPercent, { color: scoreColor(score.percent) }]}>
              {score.percent}%
            </Text>
            <Text style={styles.historyFraction}>
              {score.correct}/{score.total}
            </Text>
          </>
        ) : null}
      </View>
    </Pressable>
  )
}

function HomeworkCard({ hw }: { hw: HomeworkItem }) {
  const router = useRouter()
  const due = formatDue(hw.dueAt, hw.status)
  const status = statusFor(hw)
  const isCompleted = hw.status === "completed" || !!hw.failedCheating
  const icon = SUBJECT_ICONS[hw.subject]
  const accent = subjectColors[hw.subject] ?? colors.textSecondary

  const completedLabel =
    isCompleted && hw.completedAt
      ? new Date(hw.completedAt).toLocaleDateString()
      : null

  const timeLabel =
    hw.timeLimitMinutes != null && hw.timeLimitMinutes > 0
      ? `${hw.timeLimitMinutes} min`
      : "No limit"

  const interactive = isInteractive(hw)
  const label = actionLabel(hw, isCompleted)

  const handlePress = () => {
    if (interactive && hw.route) router.push(hw.route as never)
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={!interactive}
      style={({ pressed }) => [
        styles.card,
        isCompleted && styles.cardCompleted,
        pressed && interactive && styles.cardPressed,
        !interactive && styles.cardDisabled,
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>

        <View style={styles.cardMain}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, isCompleted && styles.titleCompleted]}
              numberOfLines={1}
            >
              {hw.title}
            </Text>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]} numberOfLines={1}>
                {status.label}
              </Text>
            </View>
          </View>

          {hw.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {hw.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={due.overdue ? colors.primary : colors.textMuted}
              />
              <Text
                style={[styles.metaText, due.overdue && styles.overdue]}
                numberOfLines={1}
              >
                {completedLabel ?? due.label}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{timeLabel}</Text>
            </View>
            <Text style={styles.subjectLabel}>{hw.subject}</Text>
          </View>
        </View>
      </View>

      {label ? (
        <View style={styles.cardAction}>
          <Text style={[styles.actionText, styles.actionTextPrimary]}>{label}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      ) : null}
    </Pressable>
  )
}

interface HomeworkSectionProps {
  items: HomeworkItem[]
  refreshing?: boolean
  onRefresh?: () => void
}

export function HomeworkSection({ items, refreshing, onRefresh }: HomeworkSectionProps) {
  const [tab, setTab] = useState<"active" | "history">("active")

  const active = useMemo(() => items.filter((i) => i.status !== "completed"), [items])
  const completed = useMemo(() => items.filter((i) => i.status === "completed"), [items])

  const historyGroups = useMemo(() => {
    const sorted = [...completed].sort((a, b) => {
      const ta = new Date(a.completedAt ?? a.dueAt).getTime()
      const tb = new Date(b.completedAt ?? b.dueAt).getTime()
      return tb - ta
    })
    const groups: { label: string; items: HomeworkItem[] }[] = []
    for (const item of sorted) {
      const label = dateGroupLabel(item.completedAt ?? item.dueAt)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.items.push(item)
      else groups.push({ label, items: [item] })
    }
    return groups
  }, [completed])

  const listContent =
    tab === "active" ? (
      active.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
          </View>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptyDesc}>No active homework right now.</Text>
        </View>
      ) : (
        active.map((hw, i) => (
          <FadeInDown key={hw.id} index={i}>
            <HomeworkCard hw={hw} />
          </FadeInDown>
        ))
      )
    ) : completed.length === 0 ? (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="document-text-outline" size={28} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No completed homework yet</Text>
        <Text style={styles.emptyDesc}>Finished tasks will appear here.</Text>
      </View>
    ) : (
      historyGroups.map((group) => (
        <View key={group.label}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.items.map((hw) => (
            <HomeworkHistoryCard key={hw.id} hw={hw} />
          ))}
        </View>
      ))
    )

  return (
    <View style={styles.container}>
      <View style={styles.stickyTop}>
        <View style={styles.header}>
          <View>
            <Text style={styles.sectionDesc}>Tasks assigned by your tutor</Text>
          </View>
          {tab === "active" && active.length > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>{active.length} pending</Text>
            </View>
          )}
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab("active")}
            style={[styles.tab, tab === "active" && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
              Active {active.length > 0 ? `(${active.length})` : ""}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("history")}
            style={[styles.tab, tab === "history" && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>
              History {completed.length > 0 ? `(${completed.length})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
      >
        {listContent}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyTop: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  listScroll: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionDesc: { ...typography.bodySm, color: colors.textSecondary },
  pendingBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pendingText: { ...typography.caption, fontWeight: "600", color: colors.primary },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: radius.button,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.card,
    ...shadow.card,
  },
  tabText: { ...typography.bodySm, fontWeight: "500", color: colors.textSecondary },
  tabTextActive: { color: colors.text, fontWeight: "600" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardCompleted: { opacity: 0.88 },
  cardPressed: { opacity: 0.92 },
  cardDisabled: { opacity: 0.7 },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "48%",
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  overdue: { color: colors.primary, fontWeight: "600" },
  subjectLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "capitalize",
    marginLeft: "auto",
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionText: { fontSize: 13, fontWeight: "600" },
  actionTextPrimary: { color: colors.primary },
  empty: { alignItems: "center", paddingVertical: 32, gap: 6 },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 8,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  historyBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  historySubject: {
    fontSize: 12,
    fontWeight: "500",
  },
  historyDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  historyScoreCol: {
    alignItems: "flex-end",
    flexShrink: 0,
    minWidth: 48,
  },
  historyPercent: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  historyFraction: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
})
