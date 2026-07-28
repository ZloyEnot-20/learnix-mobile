import React from "react"
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheet } from "../ui/BottomSheet"
import {
  percentColors,
  submissionPercent,
  submissionStatusLabel,
} from "../../lib/teacher-homework"
import { homeworkAssignFolder } from "../../lib/teacher-homework-matrix"
import type { HomeworkAssignment, HomeworkSubmission } from "../../types/domain"
import type { StaffStudent } from "../../types/staff"
import { subjectFolderMeta, teacherColors } from "../../theme/teacher-tokens"
import { colors, radius, spacing, typography } from "../../theme/tokens"

export type HomeworkSubmissionModalProps = {
  visible: boolean
  onClose: () => void
  student: StaffStudent | null
  homework: HomeworkAssignment | null
  submission: HomeworkSubmission | null
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

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
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  )
}

function isAudioAnswer(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/** Normalize mistake fields for display (legacy error-correction stored the sentence in `prompt`). */
function mistakeDisplay(m: {
  questionId: number
  prompt: string
  userAnswer: string
  correctAnswer: string
  explanation?: string
  transcription?: string
}) {
  const legacySentence = m.userAnswer === "See sentence"
  const rawUser = legacySentence ? m.prompt : m.userAnswer
  const userAnswer = isAudioAnswer(rawUser)
    ? m.transcription?.trim() || "Audio recording"
    : rawUser || "—"
  const prompt = legacySentence ? "" : m.prompt
  return {
    prompt,
    userAnswer,
    correctAnswer: m.correctAnswer || "—",
    explanation: m.explanation,
  }
}

export function HomeworkSubmissionModal({
  visible,
  onClose,
  student,
  homework,
  submission,
}: HomeworkSubmissionModalProps) {
  const { height: windowHeight } = useWindowDimensions()
  const sheetBodyHeight = Math.min(windowHeight * 0.72, windowHeight - 120)

  if (!student || !homework) return null

  const folder = homeworkAssignFolder(homework)
  const meta = subjectFolderMeta[folder]
  const percent = submission ? submissionPercent(submission) : null
  const palette = percent != null ? percentColors(percent) : null
  const attempt = submission?.attempt
  const statusLabel = submission ? submissionStatusLabel(submission.status) : "Not started"

  const hasDetails =
    submission &&
    submission.status !== "pending" &&
    submission.status !== "in_progress" &&
    submission.status !== "paused"

  const mistakes = attempt?.mistakes ?? []

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={homework.title}
      showCloseButton
      contentStyle={styles.sheetContent}
    >
      <View style={[styles.body, { height: sheetBodyHeight }]}>
        <View style={styles.headerCard}>
          <View style={[styles.headerIcon, { backgroundColor: meta?.bg ?? colors.borderLight }]}>
            <Ionicons
              name={(meta?.icon ?? "document-text") as keyof typeof Ionicons.glyphMap}
              size={18}
              color={meta?.color ?? colors.textSecondary}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.studentName} numberOfLines={1}>
              {student.name}
            </Text>
            <Text style={styles.typeLabel} numberOfLines={1}>
              {meta?.label ?? folder}
            </Text>
          </View>
          {percent != null && palette ? (
            <View style={[styles.scorePill, { backgroundColor: palette.bg }]}>
              <Text style={[styles.scorePillText, { color: palette.text }]}>{percent}%</Text>
            </View>
          ) : (
            <Text style={styles.scoreDash}>—</Text>
          )}
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollInner}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={styles.card}>
            <DetailRow
              label="Status"
              value={statusLabel}
              valueColor={
                submission?.status === "submitted" || submission?.status === "graded"
                  ? teacherColors.greenDark
                  : undefined
              }
            />
            <DetailRow
              label="Due date"
              value={new Date(homework.dueAt).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            />
            <DetailRow label="Submitted" value={formatDateTime(submission?.submittedAt)} />
            {attempt ? (
              <DetailRow
                label="Score"
                value={`${attempt.correctCount} / ${attempt.totalQuestions} correct`}
                last={!attempt.durationSeconds && !submission?.feedback}
              />
            ) : null}
            {attempt?.durationSeconds != null ? (
              <DetailRow
                label="Time spent"
                value={`${Math.max(1, Math.round(attempt.durationSeconds / 60))} min`}
                last={!submission?.feedback}
              />
            ) : null}
            {submission?.feedback ? (
              <DetailRow label="Feedback" value={submission.feedback} last />
            ) : null}
          </View>

          {mistakes.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mistakes · {mistakes.length}</Text>
              {mistakes.map((m, i) => {
                const display = mistakeDisplay(m)
                return (
                  <View key={`${m.questionId}-${i}`} style={styles.mistakeItem}>
                    <View style={styles.mistakeIndex}>
                      <Text style={styles.mistakeIndexText}>{i + 1}</Text>
                    </View>
                    <View style={styles.mistakeBody}>
                      {display.prompt ? (
                        <Text style={styles.mistakePrompt} numberOfLines={3}>
                          Q{m.questionId}. {display.prompt}
                        </Text>
                      ) : (
                        <Text style={styles.mistakePrompt}>Q{m.questionId}</Text>
                      )}
                      <Text style={styles.mistakeWrong}>
                        Answer: <Text style={styles.mistakeWrongValue}>{display.userAnswer}</Text>
                      </Text>
                      <Text style={styles.mistakeRight}>
                        Correct:{" "}
                        <Text style={styles.mistakeRightValue}>{display.correctAnswer}</Text>
                      </Text>
                      {display.explanation ? (
                        <Text style={styles.mistakeExpl}>{display.explanation}</Text>
                      ) : null}
                    </View>
                  </View>
                )
              })}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footerBlock}>
          {!submission ? (
            <Text style={styles.hint}>Student has not started this assignment.</Text>
          ) : !hasDetails ? (
            <Text style={styles.hint}>Waiting for submission.</Text>
          ) : mistakes.length === 0 && hasDetails ? (
            <Text style={styles.hintSuccess}>No mistakes — great result!</Text>
          ) : null}
        </View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
  body: {
    flexDirection: "column",
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: teacherColors.accentLight,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: teacherColors.accentMuted,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, minWidth: 0 },
  studentName: { ...typography.label, color: colors.text, fontSize: 15 },
  typeLabel: { ...typography.caption, color: teacherColors.accentDark, marginTop: 2 },
  scorePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minWidth: 52,
    alignItems: "center",
  },
  scorePillText: { fontSize: 16, fontWeight: "900" },
  scoreDash: { ...typography.h3, color: colors.textMuted, paddingHorizontal: 8 },
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
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
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mistakeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
  },
  mistakeIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: teacherColors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  mistakeIndexText: {
    ...typography.caption,
    color: teacherColors.accentDark,
    fontWeight: "800",
    fontSize: 11,
  },
  mistakeBody: { flex: 1, minWidth: 0, gap: 4 },
  mistakePrompt: { ...typography.caption, color: colors.textMuted, fontWeight: "600" },
  mistakeWrong: { ...typography.bodySm, color: colors.error },
  mistakeWrongValue: { fontWeight: "700", color: colors.error },
  mistakeRight: { ...typography.bodySm, color: colors.success },
  mistakeRightValue: { fontWeight: "700", color: colors.success },
  mistakeExpl: { ...typography.caption, color: colors.textSecondary, fontStyle: "italic", marginTop: 2 },
  footerBlock: {
    flexShrink: 0,
    paddingTop: spacing.sm,
  },
  hint: {
    ...typography.bodySm,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  hintSuccess: {
    ...typography.bodySm,
    color: teacherColors.greenDark,
    textAlign: "center",
    paddingVertical: spacing.sm,
    fontWeight: "600",
  },
})
