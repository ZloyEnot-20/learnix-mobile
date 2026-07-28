import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { LanguageSkillsCard } from "../LanguageSkillsCard"
import { BottomSheet } from "../ui/BottomSheet"
import { TeacherStudentModalSkeleton } from "./TeacherSkeletons"
import {
  attendanceRateColors,
  computeStudentAttendanceRates,
} from "../../lib/attendance-stats"
import { learnixLevelToCefr } from "../../lib/language-profile"
import { percentColors } from "../../lib/teacher-homework"
import { lessonsApi, studentsApi } from "../../lib/api"
import type { StudentLevel } from "../../types/gamification"
import type { StudentLanguageProfile } from "../../types/language-profile"
import type { Group, LessonSession, StaffStudent } from "../../types/staff"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { teacherColors } from "../../theme/teacher-tokens"

type TeacherStudentInfoModalProps = {
  visible: boolean
  student: StaffStudent | null
  group: Group | null
  performancePercent: number | null
  onClose: () => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString()
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

function StatCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

export function TeacherStudentInfoModal({
  visible,
  student,
  group,
  performancePercent,
  onClose,
}: TeacherStudentInfoModalProps) {
  const { height: windowHeight } = useWindowDimensions()
  const sheetBodyHeight = Math.min(windowHeight * 0.72, windowHeight - 120)

  const [loading, setLoading] = useState(false)
  const [level, setLevel] = useState<StudentLevel | null>(null)
  const [profile, setProfile] = useState<StudentLanguageProfile | null>(null)
  const [lessons, setLessons] = useState<LessonSession[]>([])

  const load = useCallback(async () => {
    if (!student || !group) return
    setLoading(true)
    try {
      const [lvl, langProfile, lessonList] = await Promise.all([
        studentsApi.level(student.id).catch(() => null),
        studentsApi.languageProfile(student.id).catch(() => null),
        lessonsApi.list({ groupId: group.id }).catch(() => [] as LessonSession[]),
      ])
      setLevel(lvl)
      setProfile(langProfile)
      setLessons(lessonList)
    } finally {
      setLoading(false)
    }
  }, [student, group])

  useEffect(() => {
    if (!visible || !student || !group) {
      setLevel(null)
      setProfile(null)
      setLessons([])
      setLoading(false)
      return
    }
    void load()
  }, [visible, student, group, load])

  const attendanceInput = useMemo(
    () =>
      student
        ? {
            id: student.id,
            groupJoinedAt: student.groupJoinedAt ?? student.joinedAt,
          }
        : null,
    [student],
  )

  const attendanceStat = useMemo(() => {
    if (!attendanceInput || lessons.length === 0) return null
    return computeStudentAttendanceRates(lessons, [attendanceInput]).get(attendanceInput.id) ?? null
  }, [attendanceInput, lessons])

  if (!student) return null

  const overallCefr =
    profile && profile.overall.confidence > 0
      ? learnixLevelToCefr(profile.overall.level)
      : null
  const ieltsBand = profile?.ieltsEstimation?.estimatedBand
  const joined = formatDate(student.joinedAt)
  const examDate = formatDate(student.targetExamDate)
  const attendancePalette = attendanceRateColors(attendanceStat?.rate ?? null)
  const performancePalette =
    performancePercent != null ? percentColors(performancePercent) : null

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={student.name}
      showCloseButton
      contentStyle={styles.sheetContent}
    >
      <View style={[styles.body, { maxHeight: sheetBodyHeight }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <TeacherStudentModalSkeleton />
          ) : (
            <>
              <View style={styles.headerCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(student.name)}</Text>
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {student.name}
                  </Text>
                  {student.login ? (
                    <Text style={styles.studentLogin} numberOfLines={1}>
                      @{student.login}
                    </Text>
                  ) : null}
                  {student.isActive === false ? (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveText}>Inactive</Text>
                    </View>
                  ) : null}
                </View>
                {performancePalette ? (
                  <Text style={[styles.headerScore, { color: performancePalette.bg }]}>
                    {performancePercent}%
                  </Text>
                ) : (
                  <Text style={styles.headerScoreDash}>—</Text>
                )}
              </View>

              <View style={styles.statsRow}>
                <StatCell label="Level" value={level ? String(level.level) : "—"} />
                <StatCell
                  label="XP"
                  value={level ? level.totalPoints.toLocaleString() : "—"}
                />
                <StatCell
                  label={ieltsBand != null ? "IELTS" : "CEFR"}
                  value={
                    ieltsBand != null
                      ? ieltsBand.toFixed(1)
                      : overallCefr ?? "—"
                  }
                />
                <StatCell
                  label="Attendance"
                  value={attendanceStat?.rate != null ? `${attendanceStat.rate}%` : "—"}
                  valueColor={attendancePalette.text}
                />
              </View>

              <LanguageSkillsCard
                studentId={student.id}
                profile={profile}
                loading={false}
                alwaysExpanded
                subtitle={
                  ieltsBand != null
                    ? `Estimated IELTS ${ieltsBand.toFixed(1)} · CEFR per skill`
                    : "CEFR level by skill"
                }
              />

              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.card}>
                {group ? <DetailRow label="Group" value={group.name} /> : null}
                {student.email ? (
                  <DetailRow label="Email" value={student.email} />
                ) : null}
                {student.phone ? (
                  <DetailRow label="Phone" value={student.phone} />
                ) : null}
                {student.targetBand != null ? (
                  <DetailRow label="Target band" value={String(student.targetBand)} />
                ) : null}
                {examDate ? (
                  <DetailRow label="Target exam" value={examDate} />
                ) : null}
                {joined ? <DetailRow label="Joined" value={joined} /> : null}
                {level?.tierLabel ? (
                  <DetailRow label="Tier" value={level.tierLabel} />
                ) : null}
                {student.notes ? (
                  <DetailRow label="Notes" value={student.notes} last />
                ) : null}
                {!group &&
                !student.email &&
                !student.phone &&
                student.targetBand == null &&
                !examDate &&
                !joined &&
                !level?.tierLabel &&
                !student.notes ? (
                  <Text style={styles.emptyMeta}>No additional details</Text>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
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
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: spacing.md,
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.label,
    color: teacherColors.accentDark,
    fontSize: 18,
  },
  headerText: { flex: 1, minWidth: 0 },
  studentName: { ...typography.label, color: colors.text, fontSize: 16 },
  studentLogin: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  inactiveBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: colors.errorBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  inactiveText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.error,
    textTransform: "uppercase",
  },
  headerScore: { fontSize: 20, fontWeight: "800" },
  headerScoreDash: { ...typography.h3, color: colors.textMuted, paddingHorizontal: 4 },
  statsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: teacherColors.accentMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  statValue: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 9,
    textAlign: "center",
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: 10,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 0,
  },
  detailValue: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  emptyMeta: {
    ...typography.bodySm,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
    textAlign: "center",
  },
})
