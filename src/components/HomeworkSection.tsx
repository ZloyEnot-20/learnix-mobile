import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
  type LayoutChangeEvent,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { formatDue, dateGroupLabel, formatShortDate, scoreColor } from "../lib/utils"
import type { IntegrityStatus } from "../types/domain"
import { animation, colors, radius, shadow, spacing, typography, subjectColors } from "../theme/tokens"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

function animateTabSwitch() {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      animation.tabSwitchDuration,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ),
  )
}
import { FadeInDown } from "./ui/FadeInDown"
import { HighlightPulse } from "./ui/HighlightPulse"

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
  /** Multi-section unit test (control work). */
  kind?: "homework" | "control_work"
  sectionDone?: number
  sectionTotal?: number
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
  const label = actionLabel(hw, true)

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
      <View style={styles.historyCardTop}>
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
      </View>

      {label ? (
        <View style={styles.cardAction}>
          <Text
            style={[
              styles.actionText,
              hw.failedCheating ? styles.actionTextFailed : styles.actionTextSuccess,
            ]}
          >
            {label}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={hw.failedCheating ? colors.error : colors.success}
          />
        </View>
      ) : null}
    </Pressable>
  )
}

function HomeworkCard({ hw, isNew }: { hw: HomeworkItem; isNew?: boolean }) {
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
        isNew && styles.cardNew,
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
            <View style={styles.titleBadges}>
              {isNew ? (
                <HighlightPulse>
                  <View style={styles.newHomeworkBadge}>
                    <Text style={styles.newHomeworkBadgeText}>New</Text>
                  </View>
                </HighlightPulse>
              ) : null}
              <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.color }]} numberOfLines={1}>
                  {status.label}
                </Text>
              </View>
            </View>
          </View>

          {hw.kind === "control_work" ? (
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>Progress test</Text>
              {hw.sectionTotal != null ? (
                <Text style={styles.unitBadgeSub}>
                  {hw.sectionDone ?? 0}/{hw.sectionTotal} sections
                </Text>
              ) : null}
            </View>
          ) : null}

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
  /** When set, only these item ids play enter animation; empty set skips animation. */
  animateItemIds?: Set<string>
}

function HomeworkListItem({
  id,
  index,
  animate,
  children,
}: {
  id: string
  index: number
  animate: boolean
  children: React.ReactNode
}) {
  if (!animate) {
    return <View key={id}>{children}</View>
  }
  return (
    <FadeInDown key={id} index={index}>
      {children}
    </FadeInDown>
  )
}

export function HomeworkSection({
  items,
  refreshing,
  onRefresh,
  animateItemIds,
}: HomeworkSectionProps) {
  const [tab, setTab] = useState<"active" | "history">("active")
  const [tabsWidth, setTabsWidth] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const tabSlide = useRef(new Animated.Value(0)).current

  const tabSlotWidth = tabsWidth > 0 ? (tabsWidth - 8) / 2 : 0

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

  const newCount = animateItemIds?.size ?? 0

  useEffect(() => {
    Animated.spring(tabSlide, {
      toValue: tab === "active" ? 0 : 1,
      useNativeDriver: true,
      tension: 90,
      friction: 14,
    }).start()
  }, [tab, tabSlide])

  const switchTab = useCallback((next: "active" | "history") => {
    if (next === tab) return
    animateTabSwitch()
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    setTab(next)
  }, [tab])

  const onTabsLayout = useCallback((e: LayoutChangeEvent) => {
    setTabsWidth(e.nativeEvent.layout.width)
  }, [])

  const tabIndicatorX =
    tabSlotWidth > 0
      ? tabSlide.interpolate({
          inputRange: [0, 1],
          outputRange: [0, tabSlotWidth],
        })
      : 0

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
        active.map((hw, i) => {
          const animate =
            animateItemIds === undefined ? true : animateItemIds.has(hw.id)
          return (
            <HomeworkListItem key={hw.id} id={hw.id} index={i} animate={animate}>
              <HomeworkCard hw={hw} isNew={animateItemIds?.has(hw.id)} />
            </HomeworkListItem>
          )
        })
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
            <View style={styles.headerBadges}>
              {newCount > 0 ? (
                <HighlightPulse>
                  <View style={styles.newHomeworkHeaderBadge}>
                    <Text style={styles.newHomeworkHeaderText}>
                      {newCount === 1 ? "New homework" : `${newCount} new`}
                    </Text>
                  </View>
                </HighlightPulse>
              ) : null}
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>{active.length} pending</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.tabs} onLayout={onTabsLayout}>
          {tabSlotWidth > 0 ? (
            <Animated.View
              style={[
                styles.tabIndicator,
                { width: tabSlotWidth, transform: [{ translateX: tabIndicatorX }] },
              ]}
            />
          ) : null}
          <Pressable onPress={() => switchTab("active")} style={styles.tab}>
            <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
              Active {active.length > 0 ? `(${active.length})` : ""}
            </Text>
          </Pressable>
          <Pressable onPress={() => switchTab("history")} style={styles.tab}>
            <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>
              History {completed.length > 0 ? `(${completed.length})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
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
        <FadeInDown
          key={tab}
          index={0}
          delay={0}
          duration={animation.tabSwitchDuration}
          distance={10}
        >
          {listContent}
        </FadeInDown>
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
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  newHomeworkHeaderBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  newHomeworkHeaderText: {
    ...typography.caption,
    fontWeight: "700",
    color: "#FFFFFF",
  },
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
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    ...shadow.card,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.sm,
    zIndex: 1,
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
  cardNew: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + "55",
  },
  cardCompleted: { opacity: 0.88 },
  titleBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  newHomeworkBadge: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  newHomeworkBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    color: "#FFFFFF",
  },
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
  actionTextSuccess: { color: colors.success },
  actionTextFailed: { color: colors.error },
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
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  historyCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  unitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  unitBadgeSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
})
