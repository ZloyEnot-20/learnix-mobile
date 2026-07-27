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
import { colors, radius, shadow, spacing, typography } from "../../src/theme/tokens"

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
      setError(getUserFacingErrorMessage(e, "Could not load courses."))
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
          <Text style={styles.title}>My courses</Text>
          <Text style={styles.subtitle}>Groups you teach</Text>
        </FadeInDown>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {groups.length === 0 ? (
          <View style={[styles.emptyCard, shadow.card]}>
            <Text style={styles.emptyText}>No courses assigned yet</Text>
          </View>
        ) : (
          groups.map((group, index) => {
            const count = groupMemberCount(students, group.id)
            const schedule = formatGroupSchedule(group)
            return (
              <FadeInDown key={group.id} index={Math.min(index + 1, 6)}>
                <Pressable
                  onPress={() => router.push(`/teacher/courses/${group.id}` as never)}
                  style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.iconWrap}>
                      <Ionicons name="people" size={18} color={colors.primary} />
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
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                  <Text style={styles.count}>
                    {count} student{count === 1 ? "" : "s"}
                  </Text>
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
  },
  pressed: { opacity: 0.85 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { ...typography.label, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  count: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.sm },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: "center" },
  error: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
})
