import React, { useEffect, useRef, useState } from "react"
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheet } from "../ui/BottomSheet"
import { percentColors } from "../../lib/teacher-homework"
import type { GroupLessonProgressPoint, GroupTopicProgress } from "../../lib/teacher-homework-matrix"
import { TeacherGroupProgressChartContent } from "./TeacherGroupProgressChartModal"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"
import { subjectFolderMeta, teacherColors } from "../../theme/teacher-tokens"

export type TeacherGroupInfo = {
  id: string
  name: string
  description?: string
  schedule: string | null
  teacherName: string | null
  studentCount: number
  averagePercent: number | null
  incompletePercent: number | null
  highestTopic: GroupTopicProgress | null
  lowestTopic: GroupTopicProgress | null
  lessonProgress: GroupLessonProgressPoint[]
  accentBg: string
  accentColor: string
}

type TeacherGroupInfoModalProps = {
  visible: boolean
  group: TeacherGroupInfo | null
  onClose: () => void
  onOpenGroup: (groupId: string) => void
  onAssignHomework: (groupId: string) => void
}

type SheetView = "info" | "chart"

const CHART_SLIDE_MS = 320

function DetailRow({
  label,
  value,
  valueColor,
  last,
}: {
  label: string
  value: string
  valueColor?: string
  last?: boolean
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

function TopicSubtitle({ topic }: { topic: GroupTopicProgress }) {
  const meta = subjectFolderMeta[topic.folder]
  const icon = (meta?.icon ?? "folder") as keyof typeof Ionicons.glyphMap
  const color = meta?.color ?? colors.textSecondary

  return (
    <View style={styles.topicSubtitle}>
      <Ionicons name={icon} size={10} color={color} />
      <Text style={[styles.progressSubtitle, { color }]} numberOfLines={1}>
        {topic.label}
      </Text>
    </View>
  )
}

function ProgressStat({
  label,
  percent,
  topic,
  tone = "performance",
}: {
  label: string
  percent: number | null
  topic?: GroupTopicProgress | null
  tone?: "performance" | "incomplete"
}) {
  const palette =
    percent != null
      ? tone === "incomplete"
        ? { bg: teacherColors.orangeBg, text: teacherColors.orange }
        : percentColors(percent)
      : null

  return (
    <View style={[styles.progressStat, shadow.card]}>
      <Text style={styles.progressStatLabel} numberOfLines={2}>
        {label}
      </Text>
      <View style={styles.progressBadgeWrap}>
        {palette ? (
          <Text
            style={[
              styles.progressValue,
              { color: tone === "incomplete" ? palette.text : palette.bg },
            ]}
          >
            {percent}%
          </Text>
        ) : (
          <Text style={styles.progressDash}>—</Text>
        )}
      </View>
      {topic ? (
        <TopicSubtitle topic={topic} />
      ) : (
        <Text style={styles.progressSubtitle}> </Text>
      )}
    </View>
  )
}

export function TeacherGroupInfoModal({
  visible,
  group,
  onClose,
  onOpenGroup,
  onAssignHomework,
}: TeacherGroupInfoModalProps) {
  const { width: windowWidth } = useWindowDimensions()
  const panelWidth = windowWidth - spacing.screen * 2
  const [view, setView] = useState<SheetView>("info")
  const slideAnim = useRef(new Animated.Value(0)).current
  const isAnimating = useRef(false)

  useEffect(() => {
    if (!visible) {
      setView("info")
      slideAnim.setValue(0)
      isAnimating.current = false
    }
  }, [visible, slideAnim])

  if (!group) return null

  const showingChart = view === "chart"

  const openChart = () => {
    if (isAnimating.current) return
    isAnimating.current = true
    setView("chart")
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: CHART_SLIDE_MS,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false
    })
  }

  const goBackToInfo = () => {
    if (isAnimating.current) return
    isAnimating.current = true
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: CHART_SLIDE_MS - 40,
      useNativeDriver: true,
    }).start(({ finished }) => {
      isAnimating.current = false
      if (finished) setView("info")
    })
  }

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -panelWidth],
  })

  const overallPalette = group.averagePercent != null ? percentColors(group.averagePercent) : null

  const handleClose = () => {
    if (showingChart) {
      goBackToInfo()
      return
    }
    onClose()
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={showingChart ? "Progress by lesson" : group.name}
      showCloseButton
      contentStyle={styles.sheetContent}
    >
      <View style={[styles.panelsViewport, { width: panelWidth }]}>
        <Animated.View
          style={[
            styles.panelsTrack,
            { width: panelWidth * 2, transform: [{ translateX }] },
          ]}
        >
          <View style={[styles.panel, { width: panelWidth }]}>
            <View style={styles.body}>
          <View style={[styles.headerCard, { borderColor: group.accentColor + "33" }]}>
            <View style={[styles.headerIcon, { backgroundColor: group.accentBg }]}>
              <Ionicons name="people" size={22} color={group.accentColor} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {group.name}
              </Text>
              <Text style={styles.headerMeta} numberOfLines={1}>
                {group.studentCount} students
              </Text>
            </View>
            {overallPalette ? (
              <Text style={[styles.headerScoreText, { color: overallPalette.bg }]}>
                {group.averagePercent}%
              </Text>
            ) : (
              <Text style={styles.headerScoreDash}>—</Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.progressRow}>
            <ProgressStat label="Overall" percent={group.averagePercent} />
            <ProgressStat
              label="Not done"
              percent={group.incompletePercent}
              tone="incomplete"
            />
            <ProgressStat
              label="Best topic"
              percent={group.highestTopic?.averagePercent ?? null}
              topic={group.highestTopic}
            />
            <ProgressStat
              label="Weakest topic"
              percent={group.lowestTopic?.averagePercent ?? null}
              topic={group.lowestTopic}
            />
          </View>

          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <DetailRow label="Students" value={String(group.studentCount)} />
            <DetailRow label="Schedule" value={group.schedule ?? "Not set"} />
            <DetailRow
              label="Teacher"
              value={group.teacherName ?? "—"}
              last={!group.description}
            />
            {group.description ? <DetailRow label="About" value={group.description} last /> : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => onOpenGroup(group.id)}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.primaryBtnText}>Open group</Text>
            </Pressable>
            <View style={styles.secondaryRow}>
              <Pressable
                onPress={() => onAssignHomework(group.id)}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Ionicons name="add-circle-outline" size={18} color={teacherColors.accentDark} />
                <Text style={styles.secondaryBtnText}>Assign HW</Text>
              </Pressable>
              <Pressable
                onPress={openChart}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Ionicons name="bar-chart-outline" size={18} color={teacherColors.accentDark} />
                <Text style={styles.secondaryBtnText}>Matrix</Text>
              </Pressable>
            </View>
          </View>
          </View>
          </View>

          <View style={[styles.panel, styles.chartPanel, { width: panelWidth }]}>
            <View style={styles.chartPanelContent}>
              <TeacherGroupProgressChartContent
                groupName={group.name}
                points={group.lessonProgress}
              />
            </View>
            <Pressable
              onPress={goBackToInfo}
              style={({ pressed }) => [styles.backBottomBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Back to group"
            >
              <Text style={styles.backBottomBtnText}>Back</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
    overflow: "hidden",
  },
  panelsViewport: {
    overflow: "hidden",
  },
  panelsTrack: {
    flexDirection: "row",
  },
  panel: {
    flexShrink: 0,
  },
  chartPanel: {
    justifyContent: "space-between",
    minHeight: 360,
  },
  chartPanelContent: {
    flex: 1,
  },
  body: { paddingBottom: spacing.md },
  backBottomBtn: {
    marginTop: spacing.md,
    backgroundColor: teacherColors.accentDark,
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  backBottomBtnText: {
    ...typography.label,
    color: "#FFFFFF",
    fontSize: 15,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { ...typography.label, fontSize: 16, color: colors.text },
  headerMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  headerScoreText: { fontSize: 20, fontWeight: "800" },
  headerScoreDash: { ...typography.h3, color: colors.textMuted, paddingHorizontal: 8 },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  progressStat: {
    flex: 1,
    flexBasis: 0,
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 9,
    textAlign: "center",
  },
  progressBadgeWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexShrink: 0,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  progressDash: {
    ...typography.h3,
    color: colors.textMuted,
    textAlign: "center",
  },
  progressSubtitle: {
    ...typography.caption,
    fontWeight: "600",
    fontSize: 8,
    textAlign: "center",
    flexShrink: 1,
  },
  topicSubtitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    width: "100%",
    paddingHorizontal: 1,
    flexShrink: 0,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 88,
    fontWeight: "600",
  },
  detailValue: {
    ...typography.bodySm,
    color: colors.text,
    flex: 1,
    textAlign: "right",
    fontWeight: "600",
  },
  actions: { gap: spacing.sm },
  primaryBtn: {
    backgroundColor: teacherColors.accentDark,
    borderRadius: radius.button,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { ...typography.label, color: "#FFFFFF", fontSize: 15 },
  secondaryRow: { flexDirection: "row", gap: spacing.sm },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.button,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  secondaryBtnText: { ...typography.label, color: teacherColors.accentDark, fontSize: 13 },
  pressed: { opacity: 0.88 },
})
