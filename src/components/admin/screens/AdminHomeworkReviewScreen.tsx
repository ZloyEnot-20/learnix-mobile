import React, { useCallback, useMemo, useState } from "react"
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useFocusEffect } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheet } from "../../ui/BottomSheet"
import { AdminListSkeleton } from "../AdminListSkeleton"
import { adminApi, groupsApi, homeworkApi, studentsApi } from "../../../lib/api"
import { formatDateTime } from "../../../lib/admin-format"
import { getUserFacingErrorMessage } from "../../../lib/api-client"
import type { HomeworkReviewItem } from "../../../types/admin"
import type { Group, StaffStudent } from "../../../types/staff"
import type { HomeworkAssignment, HomeworkSubmission } from "../../../types/domain"
import { colors, radius, shadow, spacing, typography } from "../../../theme/tokens"

const SUBJECT_LABEL: Record<string, string> = {
  speaking: "Speaking",
  writing: "Writing",
  grammar: "Grammar",
}

export function AdminHomeworkReviewScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [items, setItems] = useState<HomeworkReviewItem[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [search, setSearch] = useState("")
  const [subjectFilter, setSubjectFilter] = useState<"all" | "speaking" | "writing" | "grammar">("all")
  const [selected, setSelected] = useState<HomeworkReviewItem | null>(null)
  const [homework, setHomework] = useState<HomeworkAssignment | null>(null)
  const [submission, setSubmission] = useState<HomeworkSubmission | null>(null)
  const [student, setStudent] = useState<StaffStudent | null>(null)
  const [feedback, setFeedback] = useState("")
  const [score, setScore] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [queue, g] = await Promise.all([adminApi.homeworkReviewQueue(), groupsApi.list()])
      setItems(queue)
      setGroups(g)
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not load review queue."))
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (subjectFilter !== "all" && item.subject !== subjectFilter) return false
      if (!q) return true
      return (
        item.studentName.toLowerCase().includes(q) ||
        item.homeworkTitle.toLowerCase().includes(q)
      )
    })
  }, [items, search, subjectFilter])

  const openReview = async (item: HomeworkReviewItem) => {
    setSelected(item)
    setFeedback("")
    setScore("")
    setSheetOpen(true)
    try {
      const [details, subs, students] = await Promise.all([
        homeworkApi.details(item.homeworkId),
        homeworkApi.submissions({ homeworkId: item.homeworkId, studentId: item.studentId }),
        studentsApi.list(),
      ])
      setHomework(details.homework)
      setSubmission(subs[0] ?? null)
      setStudent(students.find((s) => s.id === item.studentId) ?? null)
      const sub = subs[0]
      if (sub?.score != null) setScore(String(sub.score))
      const fb = sub?.attempt?.mistakes?.find((m) => m.feedback)?.feedback
      if (fb) setFeedback(fb)
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not open submission."))
      setSheetOpen(false)
    }
  }

  const submitGrade = async () => {
    if (!submission) return
    const numericScore = score.trim() ? Number(score) : undefined
    if (score.trim() && Number.isNaN(numericScore)) {
      Alert.alert("Invalid score", "Enter a valid number.")
      return
    }
    setSaving(true)
    try {
      await homeworkApi.grade(submission.id, {
        status: "graded",
        score: numericScore,
        feedback: feedback.trim() || undefined,
      })
      setSheetOpen(false)
      setSelected(null)
      await load()
      Alert.alert("Sent", "Result has been sent to the student.")
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not save grade."))
    } finally {
      setSaving(false)
    }
  }

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? "—"

  if (loading) return <AdminListSkeleton />

  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.filters}>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Student or assignment"
                placeholderTextColor={colors.textMuted}
                style={styles.search}
              />
            </View>
            <View style={styles.chips}>
              {(["all", "speaking", "writing", "grammar"] as const).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setSubjectFilter(key)}
                  style={[styles.chip, subjectFilter === key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, subjectFilter === key && styles.chipTextActive]}>
                    {key === "all" ? "All" : SUBJECT_LABEL[key]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => void openReview(item)} style={[styles.card, shadow.card]}>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.studentName}</Text>
              <Text style={styles.meta}>
                {SUBJECT_LABEL[item.subject] ?? item.subject} · {groupName(item.groupId)}
              </Text>
              <Text style={styles.title}>{item.homeworkTitle}</Text>
              <Text style={styles.date}>{formatDateTime(item.submittedAt)}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nothing to review</Text>}
      />

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={homework?.title ?? "Review"}
      >
        <View style={styles.sheetBody}>
          <Text style={styles.sheetMeta}>Student: {student?.name ?? selected?.studentName}</Text>
          <Text style={styles.sheetMeta}>Type: {SUBJECT_LABEL[selected?.subject ?? ""] ?? selected?.subject}</Text>
          {submission?.attempt?.mistakes?.map((m) => (
            <View key={m.questionId} style={styles.answerBox}>
              {m.prompt ? <Text style={styles.prompt}>{m.prompt}</Text> : null}
              <Text style={styles.answer}>{m.userAnswer || m.transcription || "—"}</Text>
            </View>
          ))}
          <Text style={styles.fieldLabel}>Score</Text>
          <TextInput
            value={score}
            onChangeText={setScore}
            keyboardType="decimal-pad"
            placeholder="e.g. 7.5"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>Comment</Text>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Feedback for the student"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textarea]}
            multiline
          />
          <Pressable style={styles.primaryBtn} onPress={() => void submitGrade()} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? "Sending…" : "Send result"}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.screen, gap: spacing.sm, paddingBottom: spacing.xxl },
  filters: { gap: spacing.sm, marginBottom: spacing.md },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  search: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: "600" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  cardBody: { flex: 1 },
  name: { ...typography.label, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  title: { ...typography.bodySm, color: colors.text, marginTop: 4 },
  date: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { ...typography.caption, color: "#0284C7", fontWeight: "600" },
  empty: { ...typography.bodySm, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  sheetBody: { gap: spacing.sm },
  sheetMeta: { ...typography.bodySm, color: colors.textSecondary },
  answerBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  prompt: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  answer: { ...typography.body, color: colors.text },
  fieldLabel: { ...typography.label, color: colors.text, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text,
  },
  textarea: { minHeight: 88, textAlignVertical: "top" },
  primaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { ...typography.label, color: "#fff" },
})
