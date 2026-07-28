import React, { useCallback, useState } from "react"
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { LanguageSkillsCard } from "../../../src/components/LanguageSkillsCard"
import { ScreenBackBar } from "../../../src/components/ui/ScreenBackBar"
import { FadeInDown } from "../../../src/components/ui/FadeInDown"
import { TeacherStudentDetailSkeleton } from "../../../src/components/teacher/TeacherSkeletons"
import { groupsApi, studentsApi } from "../../../src/lib/api"
import { getUserFacingErrorMessage } from "../../../src/lib/api-client"
import {
  learnixLevelToCefr,
} from "../../../src/lib/language-profile"
import type { StudentLevel } from "../../../src/types/gamification"
import type { StudentLanguageProfile } from "../../../src/types/language-profile"
import type { Group, StaffStudent } from "../../../src/types/staff"
import { colors, radius, shadow, spacing, typography } from "../../../src/theme/tokens"

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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoMain}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.statCell, shadow.card]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function TeacherStudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [student, setStudent] = useState<StaffStudent | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [level, setLevel] = useState<StudentLevel | null>(null)
  const [profile, setProfile] = useState<StudentLanguageProfile | null>(null)

  const load = useCallback(
    async (force = false) => {
      if (!id) return
      setError("")
      try {
        const allStudents = await studentsApi.list({ force })
        const found = allStudents.find((s) => s.id === id) ?? null
        setStudent(found)

        const [lvl, langProfile, groupData] = await Promise.all([
          studentsApi.level(id, { force }).catch(() => null),
          studentsApi.languageProfile(id, { force }).catch(() => null),
          found?.groupId
            ? groupsApi.get(found.groupId, { force }).catch(() => null)
            : Promise.resolve(null),
        ])
        setLevel(lvl)
        setProfile(langProfile)
        setGroup(groupData)
      } catch (e) {
        setError(getUserFacingErrorMessage(e, "Could not load student."))
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

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenBackBar />
        <TeacherStudentDetailSkeleton />
      </View>
    )
  }

  if (!student) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenBackBar />
        <View style={styles.emptyWrap}>
          <Text style={styles.error}>{error || "Student not found"}</Text>
        </View>
      </View>
    )
  }

  const overallCefr =
    profile && profile.overall.confidence > 0
      ? learnixLevelToCefr(profile.overall.level)
      : null
  const ieltsBand = profile?.ieltsEstimation?.estimatedBand
  const joined = formatDate(student.joinedAt)
  const examDate = formatDate(student.targetExamDate)
  const strengths = profile?.ieltsEstimation?.strengths?.filter(Boolean) ?? []
  const weaknesses = profile?.ieltsEstimation?.weaknesses?.filter(Boolean) ?? []

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
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(student.name)}</Text>
            </View>
            <View style={styles.heroMain}>
              <Text style={styles.name}>{student.name}</Text>
              {student.login ? (
                <Text style={styles.login}>@{student.login}</Text>
              ) : null}
              {student.isActive === false ? (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveText}>Inactive</Text>
                </View>
              ) : null}
            </View>
          </View>
        </FadeInDown>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FadeInDown index={1}>
          <View style={styles.statsRow}>
            <StatCell
              label="Level"
              value={level ? String(level.level) : "—"}
            />
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
          </View>
        </FadeInDown>

        <FadeInDown index={2}>
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
        </FadeInDown>

        {(strengths.length > 0 || weaknesses.length > 0) && (
          <FadeInDown index={3}>
            <View style={[styles.sectionCard, shadow.card]}>
              <Text style={styles.sectionTitle}>Insights</Text>
              {strengths.length > 0 ? (
                <View style={styles.insightBlock}>
                  <Text style={styles.insightLabel}>Strengths</Text>
                  {strengths.map((item) => (
                    <Text key={item} style={styles.insightItem}>
                      · {item}
                    </Text>
                  ))}
                </View>
              ) : null}
              {weaknesses.length > 0 ? (
                <View style={styles.insightBlock}>
                  <Text style={styles.insightLabel}>Focus areas</Text>
                  {weaknesses.map((item) => (
                    <Text key={item} style={styles.insightItem}>
                      · {item}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </FadeInDown>
        )}

        <FadeInDown index={4}>
          <View style={[styles.sectionCard, shadow.card]}>
            <Text style={styles.sectionTitle}>Details</Text>
            {group ? (
              <InfoRow icon="people-outline" label="Group" value={group.name} />
            ) : null}
            {student.email ? (
              <InfoRow icon="mail-outline" label="Email" value={student.email} />
            ) : null}
            {student.phone ? (
              <InfoRow icon="call-outline" label="Phone" value={student.phone} />
            ) : null}
            {student.targetBand != null ? (
              <InfoRow
                icon="flag-outline"
                label="Target band"
                value={String(student.targetBand)}
              />
            ) : null}
            {examDate ? (
              <InfoRow icon="calendar-outline" label="Target exam" value={examDate} />
            ) : null}
            {joined ? (
              <InfoRow icon="time-outline" label="Joined" value={joined} />
            ) : null}
            {level?.tierLabel ? (
              <InfoRow icon="ribbon-outline" label="Tier" value={level.tierLabel} />
            ) : null}
            {student.notes ? (
              <InfoRow icon="document-text-outline" label="Notes" value={student.notes} />
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
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.h3,
    color: colors.primary,
    fontSize: 22,
  },
  heroMain: { flex: 1, minWidth: 0 },
  name: { ...typography.h2, color: colors.text, fontSize: 22 },
  login: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    fontSize: 20,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  infoMain: { flex: 1, minWidth: 0 },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
    marginTop: 2,
  },
  insightBlock: {
    marginTop: spacing.sm,
  },
  insightLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  insightItem: {
    ...typography.bodySm,
    color: colors.text,
    lineHeight: 20,
  },
  emptyMeta: {
    ...typography.bodySm,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  error: {
    ...typography.bodySm,
    color: colors.error,
    marginBottom: spacing.sm,
  },
})
