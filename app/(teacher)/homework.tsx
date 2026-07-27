import React, { useCallback, useMemo, useState } from "react"
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { FadeInDown } from "../../src/components/ui/FadeInDown"
import { SwipeableTabs } from "../../src/components/ui/SwipeableTabs"
import { TeacherListSkeleton } from "../../src/components/teacher/TeacherSkeletons"
import { groupsApi, homeworkApi } from "../../src/lib/api"
import { getUserFacingErrorMessage } from "../../src/lib/api-client"
import type { HomeworkAssignment, HomeworkSubmission } from "../../src/types/domain"
import type { Group } from "../../src/types/staff"
import { colors, radius, shadow, spacing, subjectColors, typography } from "../../src/theme/tokens"

type TabKey = "review" | "graded" | "all"

type HomeworkRow = {
  homework: HomeworkAssignment
  submissions: HomeworkSubmission[]
  submittedCount: number
  gradedCount: number
  pendingCount: number
}

function buildRows(
  assignments: HomeworkAssignment[],
  records: HomeworkSubmission[],
): HomeworkRow[] {
  return assignments
    .map((homework) => {
      const submissions = records.filter((r) => r.homeworkId === homework.id)
      return {
        homework,
        submissions,
        submittedCount: submissions.filter((s) => s.status === "submitted").length,
        gradedCount: submissions.filter((s) => s.status === "graded").length,
        pendingCount: submissions.filter(
          (s) => s.status === "pending" || s.status === "in_progress" || s.status === "paused",
        ).length,
      }
    })
    .sort((a, b) => b.homework.dueAt.localeCompare(a.homework.dueAt))
}

function formatDue(dueAt: string): string {
  const d = new Date(dueAt)
  if (Number.isNaN(d.getTime())) return dueAt
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function TeacherHomeworkScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<TabKey>("review")
  const [rows, setRows] = useState<HomeworkRow[]>([])
  const [groupsById, setGroupsById] = useState<Record<string, string>>({})

  const load = useCallback(async (force = false) => {
    setError("")
    try {
      const [check, groups] = await Promise.all([
        homeworkApi.check({ force }),
        groupsApi.list({ force }),
      ])
      setRows(buildRows(check.assignments, check.records))
      setGroupsById(Object.fromEntries(groups.map((g: Group) => [g.id, g.name])))
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not load homework."))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const reviewRows = useMemo(() => rows.filter((r) => r.submittedCount > 0), [rows])
  const gradedRows = useMemo(
    () => rows.filter((r) => r.gradedCount > 0 && r.submittedCount === 0),
    [rows],
  )

  if (loading) {
    return <TeacherListSkeleton />
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Homework</Text>
            <Text style={styles.subtitle}>Review and assign work</Text>
          </View>
          <Pressable
            onPress={() => router.push("/teacher/homework/assign" as never)}
            style={({ pressed }) => [styles.assignBtn, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.assignText}>Assign</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <SwipeableTabs
        tabs={[
          { key: "review", label: "Needs review" },
          { key: "graded", label: "Graded" },
          { key: "all", label: "All" },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        fill
        scrollable
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load(true)
            }}
          />
        }
        style={styles.tabs}
      >
        <HomeworkList
          rows={reviewRows}
          groupsById={groupsById}
          emptyLabel="Nothing to review"
          onOpen={(hwId) => router.push(`/teacher/homework/${hwId}` as never)}
        />
        <HomeworkList
          rows={gradedRows}
          groupsById={groupsById}
          emptyLabel="No graded homework yet"
          onOpen={(hwId) => router.push(`/teacher/homework/${hwId}` as never)}
        />
        <HomeworkList
          rows={rows}
          groupsById={groupsById}
          emptyLabel="No homework yet"
          onOpen={(hwId) => router.push(`/teacher/homework/${hwId}` as never)}
        />
      </SwipeableTabs>
    </View>
  )
}

function HomeworkList({
  rows,
  groupsById,
  emptyLabel,
  onOpen,
}: {
  rows: HomeworkRow[]
  groupsById: Record<string, string>
  emptyLabel: string
  onOpen: (id: string) => void
}) {
  if (rows.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyCard, shadow.card]}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {rows.map((row, index) => {
        const subjectColor = subjectColors[row.homework.subject] ?? colors.primary
        return (
          <FadeInDown key={row.homework.id} index={Math.min(index, 6)}>
            <Pressable
              onPress={() => onOpen(row.homework.id)}
              style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
            >
              <View style={styles.cardTop}>
                <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
                <View style={styles.cardMain}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {row.homework.title}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {groupsById[row.homework.groupId] ?? "Group"} · due {formatDue(row.homework.dueAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              <View style={styles.stats}>
                {row.submittedCount > 0 ? (
                  <Text style={[styles.stat, { color: colors.warning }]}>
                    {row.submittedCount} to review
                  </Text>
                ) : null}
                {row.gradedCount > 0 ? (
                  <Text style={[styles.stat, { color: colors.success }]}>
                    {row.gradedCount} graded
                  </Text>
                ) : null}
                {row.pendingCount > 0 ? (
                  <Text style={styles.stat}>{row.pendingCount} pending</Text>
                ) : null}
              </View>
            </Pressable>
          </FadeInDown>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerText: { flex: 1 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: 4 },
  assignBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  assignText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  tabs: { flex: 1 },
  list: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { ...typography.label, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  stat: { ...typography.caption, color: colors.textMuted },
  emptyWrap: { padding: spacing.screen },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: "center" },
  error: { ...typography.bodySm, color: colors.error, marginTop: spacing.sm },
  pressed: { opacity: 0.85 },
})
