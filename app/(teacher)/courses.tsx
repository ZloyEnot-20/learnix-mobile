import React, { useCallback, useState } from "react"
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
import { TeacherListSkeleton } from "../../src/components/teacher/TeacherSkeletons"
import { groupsApi, studentsApi } from "../../src/lib/api"
import { getUserFacingErrorMessage } from "../../src/lib/api-client"
import { formatGroupSchedule } from "../../src/lib/teacher-lessons"
import { groupMemberCount, type Group, type StaffStudent } from "../../src/types/staff"
import { colors, radius, spacing, typography } from "../../src/theme/tokens"
import { teacherColors, teacherShadow } from "../../src/theme/teacher-tokens"

const COURSE_COLORS = [
  { bg: teacherColors.blueBg, color: teacherColors.blue },
  { bg: teacherColors.purpleBg, color: teacherColors.purple },
  { bg: teacherColors.greenBg, color: teacherColors.greenDark },
  { bg: teacherColors.orangeBg, color: teacherColors.orange },
]

export default function TeacherCoursesScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<StaffStudent[]>([])

  const load = useCallback(async (force = false) => {
    setError("")
    try {
      const [groupList, studentList] = await Promise.all([
        groupsApi.list({ force }),
        studentsApi.list({ force }),
      ])
      setGroups(groupList.sort((a, b) => a.name.localeCompare(b.name)))
      setStudents(studentList)
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not load groups."))
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

  if (loading) {
    return <TeacherListSkeleton />
  }

  return (
    <View style={styles.root}>
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
        <FadeInDown index={0}>
          <Text style={styles.title}>My groups</Text>
          <Text style={styles.subtitle}>{groups.length} groups · tap to open</Text>
        </FadeInDown>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {groups.length === 0 ? (
          <View style={[styles.emptyCard, teacherShadow.card]}>
            <Ionicons name="school-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No groups assigned yet</Text>
          </View>
        ) : (
          groups.map((group, index) => {
            const count = groupMemberCount(students, group.id)
            const schedule = formatGroupSchedule(group)
            const palette = COURSE_COLORS[index % COURSE_COLORS.length]
            return (
              <FadeInDown key={group.id} index={Math.min(index + 1, 6)}>
                <Pressable
                  onPress={() => router.push(`/teacher/courses/${group.id}` as never)}
                  style={({ pressed }) => [
                    styles.card,
                    teacherShadow.card,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
                    <Ionicons name="people" size={22} color={palette.color} />
                  </View>
                  <View style={styles.cardMain}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {group.name}
                    </Text>
                    {schedule ? (
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {schedule}
                      </Text>
                    ) : null}
                    <View style={styles.countRow}>
                      <View style={[styles.countBadge, { backgroundColor: palette.bg }]}>
                        <Text style={[styles.countText, { color: palette.color }]}>
                          {count} students
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Pressable>
              </FadeInDown>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySm, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { ...typography.label, fontSize: 16, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  countRow: { flexDirection: "row", marginTop: spacing.sm },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  countText: { ...typography.caption, fontWeight: "700", fontSize: 11 },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.sm },
  error: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
})
