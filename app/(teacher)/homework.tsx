import React, { useCallback, useEffect, useMemo, useState } from "react"
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
import { HomeworkDateBadgeStrip } from "../../src/components/teacher/HomeworkDateBadgeStrip"
import { HomeworkMatrixTable } from "../../src/components/teacher/HomeworkMatrixTable"
import { HomeworkSubmissionModal } from "../../src/components/teacher/HomeworkSubmissionModal"
import { TeacherHomeworkMatrixSkeleton } from "../../src/components/teacher/TeacherSkeletons"
import { groupsApi, homeworkApi, studentsApi } from "../../src/lib/api"
import { getUserFacingErrorMessage } from "../../src/lib/api-client"
import { formatGroupSchedule, currentMonthKey } from "../../src/lib/teacher-lessons"
import { preloadTeacherMaterials } from "../../src/lib/teacher-materials-cache"
import {
  buildHomeworkColumns,
  buildHomeworkMatrix,
  formatMonthLabel,
  groupColumnsByDate,
  matrixGroupStats,
  shiftMonthKey,
  type HomeworkMatrixRow,
} from "../../src/lib/teacher-homework-matrix"
import type { HomeworkAssignment, HomeworkSubmission } from "../../src/types/domain"
import { studentsInGroup, type Group, type StaffStudent } from "../../src/types/staff"
import { colors, radius, spacing, typography } from "../../src/theme/tokens"
import { teacherColors } from "../../src/theme/teacher-tokens"

type ModalSelection = {
  row: HomeworkMatrixRow
  columnIndex: number
}

export default function TeacherHomeworkScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<StaffStudent[]>([])
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([])
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([])
  const [groupId, setGroupId] = useState<string>("")
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalSelection | null>(null)

  const load = useCallback(async (force = false) => {
    setError("")
    try {
      const [check, groupList, allStudents] = await Promise.all([
        homeworkApi.check({ force }),
        groupsApi.list({ force }),
        studentsApi.list({ force }),
      ])
      const sortedGroups = groupList.sort((a, b) => a.name.localeCompare(b.name))
      setGroups(sortedGroups)
      setStudents(allStudents)
      setAssignments(check.assignments)
      setSubmissions(check.records)
      setGroupId((prev) => {
        if (prev && sortedGroups.some((g) => g.id === prev)) return prev
        return sortedGroups[0]?.id ?? ""
      })
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
      void preloadTeacherMaterials()
    }, [load]),
  )

  const groupStudents = useMemo(
    () => (groupId ? studentsInGroup(students, groupId) : []),
    [students, groupId],
  )

  const monthColumns = useMemo(
    () => buildHomeworkColumns(assignments, groupId, monthKey),
    [assignments, groupId, monthKey],
  )

  const dateGroups = useMemo(() => groupColumnsByDate(monthColumns), [monthColumns])

  useEffect(() => {
    if (dateGroups.length === 0) {
      setSelectedDateKey(null)
      return
    }
    setSelectedDateKey((prev) => {
      if (prev && dateGroups.some((g) => g.dateKey === prev)) return prev
      return dateGroups[dateGroups.length - 1]?.dateKey ?? null
    })
  }, [dateGroups])

  const columns = useMemo(
    () =>
      selectedDateKey
        ? monthColumns.filter((col) => col.dateKey === selectedDateKey)
        : monthColumns,
    [monthColumns, selectedDateKey],
  )

  const matrixRows = useMemo(
    () => buildHomeworkMatrix(groupStudents, columns, submissions),
    [groupStudents, columns, submissions],
  )

  const stats = useMemo(() => matrixGroupStats(matrixRows, columns), [matrixRows, columns])

  const modalHomework = modal ? columns[modal.columnIndex]?.homework ?? null : null
  const modalSubmission = modal?.row.cells[modal.columnIndex]?.submission ?? null

  if (loading) {
    return <TeacherHomeworkMatrixSkeleton />
  }

  return (
    <View style={styles.root}>
      <ScrollView
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
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.headerPad}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Homework</Text>
              <Text style={styles.subtitle}>Group progress by lesson day</Text>
            </View>
            <Pressable
              onPress={() => router.push("/teacher/homework/assign" as never)}
              style={({ pressed }) => [styles.assignBtn, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupScroll}
        >
          {groups.map((g) => {
            const active = g.id === groupId
            const schedule = formatGroupSchedule(g)
            return (
              <Pressable
                key={g.id}
                onPress={() => setGroupId(g.id)}
                style={({ pressed }) => [
                  styles.groupCard,
                  active && styles.groupCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.groupName, active && styles.groupNameActive]} numberOfLines={1}>
                  {g.name}
                </Text>
                {schedule ? (
                  <Text style={[styles.groupTime, active && styles.groupTimeActive]} numberOfLines={1}>
                    {schedule}
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={styles.monthRow}>
          <Pressable
            onPress={() => setMonthKey((m) => shiftMonthKey(m, -1))}
            style={styles.monthArrow}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthLabel(monthKey)}</Text>
          <Pressable
            onPress={() => setMonthKey((m) => shiftMonthKey(m, 1))}
            style={styles.monthArrow}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>

        <HomeworkDateBadgeStrip
          dates={dateGroups}
          selectedDateKey={selectedDateKey}
          onSelect={setSelectedDateKey}
        />

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name="home" size={16} color={teacherColors.greenDark} />
            </View>
            <View>
              <Text style={styles.statLabel}>Homework</Text>
              <Text style={styles.statValue}>
                {stats.homeworkDone}/{stats.homeworkTotal || 0}
              </Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: teacherColors.blueBg }]}>
              <Ionicons name="ribbon" size={16} color={teacherColors.blue} />
            </View>
            <View>
              <Text style={styles.statLabel}>Gr. progress</Text>
              <Text style={styles.statValue}>
                {stats.averagePercent != null ? `${stats.averagePercent}%` : "—"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#34C759" }]} />
            <Text style={styles.legendText}>≥75%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FFCC00" }]} />
            <Text style={styles.legendText}>50–74%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FF3B30" }]} />
            <Text style={styles.legendText}>&lt;50%</Text>
          </View>
        </View>

        {groupStudents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No students in this group</Text>
          </View>
        ) : (
          <HomeworkMatrixTable
            columns={columns}
            rows={matrixRows}
            onCellPress={(row, columnIndex) => setModal({ row, columnIndex })}
          />
        )}
      </ScrollView>

      <HomeworkSubmissionModal
        visible={modal != null}
        onClose={() => setModal(null)}
        student={modal?.row.student ?? null}
        homework={modalHomework}
        submission={modalSubmission}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  headerPad: { paddingHorizontal: spacing.screen, paddingTop: spacing.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  assignBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: teacherColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  groupScroll: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  groupCard: {
    minWidth: 120,
    maxWidth: 160,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  groupCardActive: {
    backgroundColor: teacherColors.accentLight,
    borderWidth: 1,
    borderColor: teacherColors.accentMuted,
  },
  groupName: { ...typography.label, color: colors.text, fontSize: 13 },
  groupNameActive: { color: teacherColors.accentDark },
  groupTime: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  groupTimeActive: { color: teacherColors.accentDark },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.screen,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 8,
    gap: spacing.md,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderLight,
  },
  monthLabel: { ...typography.label, color: colors.text, minWidth: 140, textAlign: "center" },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: teacherColors.greenBg,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { ...typography.caption, color: colors.textMuted },
  statValue: { ...typography.label, color: colors.text, marginTop: 2 },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.screen,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  emptyCard: {
    marginHorizontal: spacing.screen,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.sm },
  error: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
  pressed: { opacity: 0.85 },
})
