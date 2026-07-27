import React, { useCallback, useMemo, useState } from "react"
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BackButton } from "../../../../src/components/ui/BackButton"
import { FadeInDown } from "../../../../src/components/ui/FadeInDown"
import { Spinner } from "../../../../src/components/ui/Spinner"
import { TeacherAttendanceSkeleton } from "../../../../src/components/teacher/TeacherSkeletons"
import { groupsApi, lessonsApi, studentsApi } from "../../../../src/lib/api"
import { getUserFacingErrorMessage } from "../../../../src/lib/api-client"
import {
  currentMonthKey,
  formatLessonDate,
  todayIsoDate,
} from "../../../../src/lib/teacher-lessons"
import {
  studentsInGroup,
  type AttendanceStatus,
  type Group,
  type LessonSession,
  type StaffStudent,
} from "../../../../src/types/staff"
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme/tokens"

const STATUSES: Array<{ key: AttendanceStatus; label: string; color: string; bg: string }> = [
  { key: "present", label: "Present", color: colors.success, bg: colors.successBg },
  { key: "absent", label: "Absent", color: colors.error, bg: colors.errorBg },
  { key: "late", label: "Late", color: colors.warning, bg: colors.warningBg },
]

export default function TeacherAttendanceScreen() {
  const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const targetDate = dateParam || todayIsoDate()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [group, setGroup] = useState<Group | null>(null)
  const [students, setStudents] = useState<StaffStudent[]>([])
  const [lesson, setLesson] = useState<LessonSession | null>(null)
  const [topic, setTopic] = useState("Lesson")
  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttendanceStatus>>({})

  const load = useCallback(
    async (force = false) => {
      if (!id) return
      setError("")
      try {
        const [g, allStudents, lessons] = await Promise.all([
          groupsApi.get(id, { force }),
          studentsApi.list({ force }),
          lessonsApi.list(
            { groupId: id, month: targetDate.slice(0, 7) || currentMonthKey() },
            { force },
          ),
        ])
        const members = studentsInGroup(allStudents, id)
        setGroup(g)
        setStudents(members)

        let session = lessons.find((l) => l.date === targetDate && !l.canceled) ?? null
        if (!session) {
          session = await lessonsApi.create({
            groupId: id,
            date: targetDate,
            topic: "Lesson",
          })
        }
        setLesson(session)
        setTopic(session.topic || "Lesson")

        const next: Record<string, AttendanceStatus> = {}
        for (const student of members) {
          const existing = session.attendance?.find((a) => a.studentId === student.id)
          next[student.id] = existing?.status ?? "present"
        }
        setStatusByStudent(next)
      } catch (e) {
        setError(getUserFacingErrorMessage(e, "Could not load attendance."))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [id, targetDate],
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const markedCount = useMemo(
    () => Object.values(statusByStudent).filter(Boolean).length,
    [statusByStudent],
  )

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStatusByStudent((prev) => ({ ...prev, [studentId]: status }))
  }

  const markAll = (status: AttendanceStatus) => {
    setStatusByStudent((prev) => {
      const next = { ...prev }
      for (const student of students) {
        next[student.id] = status
      }
      return next
    })
  }

  const save = async () => {
    if (!lesson) return
    setSaving(true)
    setError("")
    try {
      const attendance = students.map((student) => ({
        studentId: student.id,
        status: statusByStudent[student.id] ?? "present",
      }))
      const updated = await lessonsApi.update(lesson.id, {
        topic: topic.trim() || "Lesson",
        attendance,
      })
      setLesson(updated)
      Alert.alert("Saved", "Attendance updated.", [
        { text: "OK", onPress: () => router.back() },
      ])
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not save attendance."))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <TeacherAttendanceSkeleton />
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
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
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />
        <FadeInDown index={0}>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.subtitle}>
            {group?.name ?? "Group"} · {formatLessonDate(targetDate)}
          </Text>
        </FadeInDown>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FadeInDown index={1}>
          <Text style={styles.label}>Topic</Text>
          <TextInput
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
            placeholder="Lesson topic"
            placeholderTextColor={colors.textMuted}
          />
        </FadeInDown>

        <View style={styles.quickRow}>
          {STATUSES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => markAll(s.key)}
              style={[styles.quickBtn, { backgroundColor: s.bg }]}
            >
              <Text style={[styles.quickText, { color: s.color }]}>All {s.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          Students · {markedCount}/{students.length}
        </Text>

        {students.map((student, index) => {
          const current = statusByStudent[student.id] ?? "present"
          return (
            <FadeInDown key={student.id} index={Math.min(index + 2, 8)}>
              <View style={[styles.card, shadow.card]}>
                <Text style={styles.studentName}>{student.name}</Text>
                <View style={styles.statusRow}>
                  {STATUSES.map((s) => {
                    const active = current === s.key
                    return (
                      <Pressable
                        key={s.key}
                        onPress={() => setStatus(student.id, s.key)}
                        style={[
                          styles.statusBtn,
                          active && { backgroundColor: s.bg, borderColor: s.color },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            active && { color: s.color, fontWeight: "700" },
                          ]}
                        >
                          {s.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            </FadeInDown>
          )
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          style={[styles.saveBtn, saving && styles.saveDisabled]}
          onPress={() => void save()}
          disabled={saving || students.length === 0}
        >
          {saving ? <Spinner size={22} /> : <Text style={styles.saveText}>Save attendance</Text>}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 100,
  },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.sm },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: spacing.md,
  },
  quickRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  quickBtn: {
    flex: 1,
    borderRadius: radius.button,
    paddingVertical: 10,
    alignItems: "center",
  },
  quickText: { ...typography.caption, fontWeight: "700" },
  sectionTitle: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  studentName: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  statusRow: { flexDirection: "row", gap: spacing.sm },
  statusBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: 10,
    alignItems: "center",
  },
  statusText: { ...typography.caption, color: colors.textSecondary },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
})
