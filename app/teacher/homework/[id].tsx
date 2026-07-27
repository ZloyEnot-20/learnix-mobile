import React, { useCallback, useMemo, useState } from "react"
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useFocusEffect, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BackButton } from "../../../src/components/ui/BackButton"
import { FadeInDown } from "../../../src/components/ui/FadeInDown"
import { Spinner } from "../../../src/components/ui/Spinner"
import { TeacherDetailSkeleton } from "../../../src/components/teacher/TeacherSkeletons"
import { homeworkApi } from "../../../src/lib/api"
import { getUserFacingErrorMessage } from "../../../src/lib/api-client"
import type { HomeworkSubmission } from "../../../src/types/domain"
import type { HomeworkDetailsResponse, StaffStudent } from "../../../src/types/staff"
import { colors, radius, shadow, spacing, subjectColors, typography } from "../../../src/theme/tokens"

function statusColor(status: HomeworkSubmission["status"]): string {
  if (status === "submitted") return colors.warning
  if (status === "graded") return colors.success
  if (status === "in_progress" || status === "paused") return colors.primary
  return colors.textMuted
}

export default function TeacherHomeworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [details, setDetails] = useState<HomeworkDetailsResponse | null>(null)
  const [grading, setGrading] = useState<HomeworkSubmission | null>(null)
  const [score, setScore] = useState("7")
  const [feedback, setFeedback] = useState("")
  const [saving, setSaving] = useState(false)

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

  const studentsById = useMemo(() => {
    const map = new Map<string, StaffStudent>()
    for (const s of details?.students ?? []) map.set(s.id, s)
    return map
  }, [details?.students])

  const openGrade = (submission: HomeworkSubmission) => {
    setGrading(submission)
    setScore(submission.score != null ? String(submission.score) : "7")
    setFeedback(submission.feedback ?? "")
  }

  const saveGrade = async () => {
    if (!grading) return
    const numeric = Number(score)
    if (Number.isNaN(numeric) || numeric < 0 || numeric > 9) {
      Alert.alert("Invalid score", "Enter a score between 0 and 9.")
      return
    }
    setSaving(true)
    try {
      await homeworkApi.grade(grading.id, {
        score: numeric,
        feedback: feedback.trim(),
        status: "graded",
      })
      setGrading(null)
      await load(true)
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not save grade."))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <TeacherDetailSkeleton />
  }

  const hw = details?.homework
  const subjectColor = subjectColors[hw?.subject ?? ""] ?? colors.primary

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
      >
        <BackButton />
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

        <Text style={styles.sectionTitle}>Submissions</Text>
        {(details?.submissions ?? [])
          .slice()
          .sort((a, b) => {
            const order = { submitted: 0, graded: 1, in_progress: 2, paused: 3, pending: 4 }
            return (order[a.status] ?? 9) - (order[b.status] ?? 9)
          })
          .map((submission, index) => {
            const student = studentsById.get(submission.studentId)
            const canGrade =
              submission.status === "submitted" || submission.status === "graded"
            return (
              <FadeInDown key={submission.id} index={Math.min(index + 1, 8)}>
                <Pressable
                  onPress={() => (canGrade ? openGrade(submission) : undefined)}
                  disabled={!canGrade}
                  style={({ pressed }) => [
                    styles.card,
                    shadow.card,
                    pressed && canGrade && styles.pressed,
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardMain}>
                      <Text style={styles.studentName}>
                        {student?.name ?? "Student"}
                      </Text>
                      <Text style={[styles.status, { color: statusColor(submission.status) }]}>
                        {submission.status.replace("_", " ")}
                        {submission.score != null ? ` · ${submission.score}` : ""}
                      </Text>
                    </View>
                    {canGrade ? (
                      <Text style={styles.gradeLink}>
                        {submission.status === "graded" ? "Edit" : "Grade"}
                      </Text>
                    ) : null}
                  </View>
                  {submission.attempt ? (
                    <Text style={styles.attemptMeta}>
                      {submission.attempt.correctCount}/{submission.attempt.totalQuestions} correct
                    </Text>
                  ) : null}
                  {submission.feedback ? (
                    <Text style={styles.feedbackPreview} numberOfLines={2}>
                      {submission.feedback}
                    </Text>
                  ) : null}
                </Pressable>
              </FadeInDown>
            )
          })}
      </ScrollView>

      <Modal visible={!!grading} animationType="slide" transparent onRequestClose={() => setGrading(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <Text style={styles.modalTitle}>Grade submission</Text>
            <Text style={styles.modalSubtitle}>
              {studentsById.get(grading?.studentId ?? "")?.name ?? "Student"}
            </Text>

            <Text style={styles.label}>Score (0–9)</Text>
            <TextInput
              style={styles.input}
              value={score}
              onChangeText={setScore}
              keyboardType="decimal-pad"
              placeholder="7"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Feedback</Text>
            <TextInput
              style={[styles.input, styles.feedbackInput]}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              placeholder="Optional comment"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setGrading(null)}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && styles.saveDisabled]}
                onPress={() => void saveGrade()}
                disabled={saving}
              >
                {saving ? <Spinner size={20} /> : <Text style={styles.saveText}>Save grade</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subject: { ...typography.caption, color: colors.textSecondary, textTransform: "capitalize" },
  title: { ...typography.h2, color: colors.text, marginTop: 4 },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardMain: { flex: 1, minWidth: 0 },
  studentName: { ...typography.label, color: colors.text },
  status: { ...typography.caption, marginTop: 2, textTransform: "capitalize" },
  gradeLink: { ...typography.label, color: colors.primary, fontSize: 13 },
  attemptMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  feedbackPreview: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.sm },
  error: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
  pressed: { opacity: 0.85 },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.screen,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  modalSubtitle: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.lg, marginTop: 4 },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  feedbackInput: { minHeight: 96, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { ...typography.label, color: colors.textSecondary },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontWeight: "700" },
})
