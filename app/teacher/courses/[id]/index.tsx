import React, { useCallback, useMemo, useState } from "react"
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { ScreenBackBar } from "../../../../src/components/ui/ScreenBackBar"
import { FadeInDown } from "../../../../src/components/ui/FadeInDown"
import { TeacherDetailSkeleton } from "../../../../src/components/teacher/TeacherSkeletons"
import { TeacherStudentInfoModal } from "../../../../src/components/teacher/TeacherStudentInfoModal"
import { groupsApi, homeworkApi, studentsApi } from "../../../../src/lib/api"
import { getUserFacingErrorMessage } from "../../../../src/lib/api-client"
import { computeStudentHomeworkProgressMap } from "../../../../src/lib/teacher-homework-matrix"
import { percentColors } from "../../../../src/lib/teacher-homework"
import { formatGroupSchedule, todayIsoDate } from "../../../../src/lib/teacher-lessons"
import type { HomeworkAssignment, HomeworkSubmission } from "../../../../src/types/domain"
import { studentsInGroup, type Group, type StaffStudent } from "../../../../src/types/staff"
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme/tokens"

export default function TeacherCourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [group, setGroup] = useState<Group | null>(null)
  const [students, setStudents] = useState<StaffStudent[]>([])
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([])
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StaffStudent | null>(null)

  const load = useCallback(
    async (force = false) => {
      if (!id) return
      setError("")
      try {
        const [g, allStudents, check] = await Promise.all([
          groupsApi.get(id, { force }),
          studentsApi.list({ force }),
          homeworkApi.check({ force }).catch(() => ({ assignments: [], records: [] })),
        ])
        setGroup(g)
        setStudents(studentsInGroup(allStudents, id))
        setAssignments(check.assignments)
        setSubmissions(check.records)
      } catch (e) {
        setError(getUserFacingErrorMessage(e, "Could not load group."))
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

  const studentProgress = useMemo(() => {
    if (!id) return new Map<string, number | null>()
    return computeStudentHomeworkProgressMap(id, students, assignments, submissions)
  }, [id, students, assignments, submissions])

  const selectedPerformancePercent = selectedStudent
    ? studentProgress.get(selectedStudent.id) ?? null
    : null

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenBackBar />
        <TeacherDetailSkeleton />
      </View>
    )
  }

  const schedule = group ? formatGroupSchedule(group) : null

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
          <Text style={styles.title}>{group?.name ?? "Group"}</Text>
          {schedule ? <Text style={styles.subtitle}>{schedule}</Text> : null}
          {group?.description ? (
            <Text style={styles.description}>{group.description}</Text>
          ) : null}
        </FadeInDown>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FadeInDown index={1}>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              onPress={() =>
                router.push(
                  `/teacher/courses/${id}/attendance?date=${todayIsoDate()}` as never,
                )
              }
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>Attendance</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtnSecondary, pressed && styles.pressed]}
              onPress={() =>
                router.push(`/teacher/homework/assign?groupId=${id}` as never)
              }
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.actionTextSecondary}>Assign HW</Text>
            </Pressable>
          </View>
        </FadeInDown>

        <Text style={styles.sectionTitle}>
          Students ({students.length})
        </Text>

        {students.length === 0 ? (
          <View style={[styles.emptyCard, shadow.card]}>
            <Text style={styles.emptyText}>No students in this group</Text>
          </View>
        ) : (
          students.map((student, index) => {
            const performancePercent = studentProgress.get(student.id) ?? null
            const performancePalette =
              performancePercent != null ? percentColors(performancePercent) : null

            return (
            <FadeInDown key={student.id} index={Math.min(index + 2, 8)}>
              <Pressable
                style={({ pressed }) => [
                  styles.studentCard,
                  shadow.card,
                  pressed && styles.pressed,
                ]}
                onPress={() => setSelectedStudent(student)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${student.name}`}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {student.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p: string) => p[0]?.toUpperCase() ?? "")
                      .join("")}
                  </Text>
                </View>
                <View style={styles.studentMain}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  {student.login ? (
                    <Text style={styles.studentMeta}>@{student.login}</Text>
                  ) : null}
                </View>
                {performancePalette ? (
                  <Text style={[styles.studentPercent, { color: performancePalette.bg }]}>
                    {performancePercent}%
                  </Text>
                ) : (
                  <Text style={styles.studentPercentDash}>—</Text>
                )}
              </Pressable>
            </FadeInDown>
            )
          })
        )}
      </ScrollView>

      <TeacherStudentInfoModal
        visible={selectedStudent != null}
        student={selectedStudent}
        group={group}
        performancePercent={selectedPerformancePercent}
        onClose={() => setSelectedStudent(null)}
      />
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
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: 4 },
  description: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.sm },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.button,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  actionTextSecondary: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  sectionTitle: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  studentCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { ...typography.label, color: colors.primary, fontSize: 13 },
  studentMain: { flex: 1, minWidth: 0 },
  studentName: { ...typography.label, color: colors.text },
  studentMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  studentPercent: { fontSize: 18, fontWeight: "800" },
  studentPercentDash: { ...typography.h3, color: colors.textMuted },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: "center" },
  error: { ...typography.bodySm, color: colors.error, marginTop: spacing.sm },
  pressed: { opacity: 0.85 },
})
