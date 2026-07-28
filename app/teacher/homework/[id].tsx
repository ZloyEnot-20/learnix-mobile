import React, { useCallback, useMemo, useState } from "react"
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ScreenBackBar } from "../../../src/components/ui/ScreenBackBar"
import { FadeInDown } from "../../../src/components/ui/FadeInDown"
import { TeacherDetailSkeleton } from "../../../src/components/teacher/TeacherSkeletons"
import { homeworkApi } from "../../../src/lib/api"
import { getUserFacingErrorMessage } from "../../../src/lib/api-client"
import {
  percentColors,
  submissionPercent,
  submissionStatusLabel,
} from "../../../src/lib/teacher-homework"
import type { HomeworkSubmission } from "../../../src/types/domain"
import type { HomeworkDetailsResponse, StaffStudent } from "../../../src/types/staff"
import { colors, radius, shadow, spacing, subjectColors, typography } from "../../../src/theme/tokens"

type ResultRow = {
  student: StaffStudent
  submission: HomeworkSubmission | null
}

export default function TeacherHomeworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [details, setDetails] = useState<HomeworkDetailsResponse | null>(null)

  const load = useCallback(
    async (force = false) => {
      if (!id) return
      setError("")
      try {
        const data = await homeworkApi.details(id, { force })
        setDetails(data)
      } catch (e) {
        setError(getUserFacingErrorMessage(e, "Could not load homework details."))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [id],
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const rows = useMemo((): ResultRow[] => {
    if (!details) return []
    const subByStudent = new Map(details.submissions.map((s) => [s.studentId, s]))
    return details.students
      .map((student) => ({
        student,
        submission: subByStudent.get(student.id) ?? null,
      }))
      .sort((a, b) => a.student.name.localeCompare(b.student.name))
  }, [details])

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenBackBar />
        <TeacherDetailSkeleton />
      </View>
    )
  }

  const hw = details?.homework
  const subjectColor = subjectColors[hw?.subject ?? ""] ?? colors.primary

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenBackBar />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load(true)
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <FadeInDown index={0}>
          <View style={styles.subjectRow}>
            <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
            <Text style={styles.subject}>{hw?.subject ?? "homework"}</Text>
          </View>
          <Text style={styles.title}>{hw?.title ?? "Homework"}</Text>
          <Text style={styles.subtitle}>
            {details?.group?.name ?? "Group"}
            {hw?.dueAt
              ? ` · due ${new Date(hw.dueAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}`
              : ""}
          </Text>
        </FadeInDown>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FadeInDown index={1}>
          <View style={[styles.table, shadow.card]}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.nameCol]}>Student</Text>
              <Text style={[styles.headerCell, styles.statusCol]}>Status</Text>
              <Text style={[styles.headerCell, styles.resultCol]}>Result</Text>
            </View>
            {rows.map(({ student, submission }) => {
              const percent = submission ? submissionPercent(submission) : null
              const palette = percent != null ? percentColors(percent) : null
              return (
                <View key={student.id} style={styles.tableRow}>
                  <View style={styles.nameCol}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {student.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? "")
                          .join("")}
                      </Text>
                    </View>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {student.name}
                    </Text>
                  </View>
                  <Text style={[styles.statusCell, styles.statusCol]} numberOfLines={1}>
                    {submission ? submissionStatusLabel(submission.status) : "—"}
                  </Text>
                  <View style={[styles.resultCol, styles.resultWrap]}>
                    {percent != null && palette ? (
                      <View style={[styles.percentBadge, { backgroundColor: palette.bg }]}>
                        <Text style={[styles.percentText, { color: palette.text }]}>
                          {percent}%
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.noResult}>—</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        </FadeInDown>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subject: { ...typography.caption, color: colors.textSecondary, textTransform: "capitalize" },
  title: { ...typography.h2, color: colors.text, marginTop: 4 },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  table: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.borderLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerCell: { ...typography.caption, color: colors.textMuted, fontWeight: "700" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    minHeight: 52,
  },
  nameCol: { flex: 1.4, flexDirection: "row", alignItems: "center", gap: spacing.sm, minWidth: 0 },
  statusCol: { flex: 0.9, ...typography.caption, color: colors.textSecondary },
  resultCol: { flex: 0.7, alignItems: "flex-end" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  studentName: { ...typography.label, color: colors.text, flex: 1 },
  statusCell: { textAlign: "left" },
  resultWrap: { justifyContent: "center" },
  percentBadge: {
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  percentText: { ...typography.label, fontSize: 13 },
  noResult: { ...typography.label, color: colors.textMuted },
  error: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
})
