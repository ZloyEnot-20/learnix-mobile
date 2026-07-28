import React, { useCallback, useMemo, useState } from "react"
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { FadeInDown } from "../../src/components/ui/FadeInDown"
import {
  GROUP_CARD_PALETTES,
  TeacherHomeGroupCards,
} from "../../src/components/teacher/TeacherHomeGroupCards"
import {
  TeacherGroupInfoModal,
  type TeacherGroupInfo,
} from "../../src/components/teacher/TeacherGroupInfoModal"
import { TeacherHomeSkeleton } from "../../src/components/teacher/TeacherSkeletons"
import { TeacherServiceGrid } from "../../src/components/teacher/TeacherServiceGrid"
import { TeacherStatCard } from "../../src/components/teacher/TeacherStatCard"
import { TimetableDayStrip } from "../../src/components/teacher/TimetableDayStrip"
import { TimetableLessonBlock } from "../../src/components/teacher/TimetableLessonBlock"
import {
  groupsApi,
  homeworkApi,
  notificationsApi,
  studentsApi,
  type NotificationItem,
} from "../../src/lib/api"
import { getUserFacingErrorMessage } from "../../src/lib/api-client"
import { fetchTeacherLessons } from "../../src/lib/teacher-data"
import { computeGroupLessonProgress, computeGroupProgress } from "../../src/lib/teacher-homework-matrix"
import {
  formatGroupSchedule,
  lessonsOnDate,
  todayIsoDate,
  upcomingLessons,
  type LessonWithGroup,
} from "../../src/lib/teacher-lessons"
import type { HomeworkAssignment, HomeworkSubmission } from "../../src/types/domain"
import { groupMemberCount, type Group, type StaffStudent } from "../../src/types/staff"
import { colors, radius, shadow, spacing, typography } from "../../src/theme/tokens"
import { teacherColors } from "../../src/theme/teacher-tokens"

function buildWeekDates(center: string): string[] {
  const [y, m, d] = center.split("-").map(Number)
  const base = new Date(y, (m || 1) - 1, d || 1)
  const dates: string[] = []
  for (let i = -2; i <= 4; i += 1) {
    const dt = new Date(base)
    dt.setDate(dt.getDate() + i)
    const yy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, "0")
    const dd = String(dt.getDate()).padStart(2, "0")
    dates.push(`${yy}-${mm}-${dd}`)
  }
  return dates
}

function formatHeaderDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
}

export default function TeacherHomeScreen() {
  const router = useRouter()
  const today = todayIsoDate()
  const weekDates = useMemo(() => buildWeekDates(today), [today])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selectedDate, setSelectedDate] = useState(today)
  const [allLessons, setAllLessons] = useState<LessonWithGroup[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<StaffStudent[]>([])
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([])
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [selectedGroup, setSelectedGroup] = useState<TeacherGroupInfo | null>(null)

  const load = useCallback(async (force = false) => {
    setError("")
    try {
      const [{ lessons }, notifs, groupList, studentList, check] = await Promise.all([
        fetchTeacherLessons(undefined, { force }),
        notificationsApi.list({ force }).catch(() => [] as NotificationItem[]),
        groupsApi.list({ force }),
        studentsApi.list({ force }),
        homeworkApi.check({ force }).catch(() => ({ assignments: [], records: [] })),
      ])
      setAllLessons(lessons)
      setNotifications(notifs.slice(0, 4))
      setGroups(groupList.sort((a, b) => a.name.localeCompare(b.name)))
      setStudents(studentList)
      setAssignments(check.assignments)
      setSubmissions(check.records)
      setReviewCount(check.records.filter((r) => r.status === "submitted").length)
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not load teacher home."))
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

  const studentCount = useMemo(
    () => groups.reduce((sum, g) => sum + groupMemberCount(students, g.id), 0),
    [groups, students],
  )

  const groupCards = useMemo<TeacherGroupInfo[]>(
    () =>
      groups.map((group, index) => {
        const progress = computeGroupProgress(group.id, students, assignments, submissions)
        const lessonProgress = computeGroupLessonProgress(
          group.id,
          students,
          assignments,
          submissions,
        )
        const palette = GROUP_CARD_PALETTES[index % GROUP_CARD_PALETTES.length]
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          schedule: formatGroupSchedule(group),
          teacherName: group.teacherName ?? null,
          studentCount: progress.studentCount,
          averagePercent: progress.averagePercent,
          incompletePercent: progress.incompletePercent,
          highestTopic: progress.highestTopic,
          lowestTopic: progress.lowestTopic,
          lessonProgress,
          accentBg: palette.bg,
          accentColor: palette.color,
        }
      }),
    [groups, students, assignments, submissions],
  )

  const lessonsByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const l of allLessons) {
      if (l.canceled) continue
      map[l.date] = (map[l.date] ?? 0) + 1
    }
    return map
  }, [allLessons])

  const dayLessons = useMemo(
    () => lessonsOnDate(allLessons, selectedDate),
    [allLessons, selectedDate],
  )
  const todayLessons = useMemo(() => lessonsOnDate(allLessons, today), [allLessons, today])
  const upcoming = useMemo(() => upcomingLessons(allLessons, today, 3), [allLessons, today])

  const openAttendance = (lesson: LessonWithGroup) => {
    router.push(`/teacher/courses/${lesson.groupId}/attendance?date=${lesson.date}` as never)
  }

  const closeGroupModal = () => setSelectedGroup(null)

  if (loading) {
    return <TeacherHomeSkeleton />
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
          <View style={styles.statsRow}>
            <TeacherStatCard
              label="Today's lessons"
              value={String(todayLessons.length)}
              icon="calendar"
              iconBg={teacherColors.accentLight}
              iconColor={teacherColors.accentDark}
              onPress={() => setSelectedDate(today)}
            />
            <TeacherStatCard
              label="To review"
              value={String(reviewCount)}
              icon="clipboard"
              iconBg={teacherColors.orangeBg}
              iconColor={teacherColors.orange}
              accent={reviewCount > 0 ? teacherColors.orange : undefined}
              onPress={() => router.push("/(teacher)/homework" as never)}
            />
          </View>
          <View style={styles.statsRow}>
            <TeacherStatCard
              label="Groups"
              value={String(groups.length)}
              icon="people"
              iconBg={teacherColors.blueBg}
              iconColor={teacherColors.blue}
              onPress={() => router.push("/(teacher)/courses" as never)}
            />
            <TeacherStatCard
              label="Students"
              value={String(studentCount)}
              icon="person"
              iconBg={teacherColors.greenBg}
              iconColor={teacherColors.greenDark}
              tall
              onPress={() => router.push("/(teacher)/courses" as never)}
            />
          </View>
        </FadeInDown>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FadeInDown index={1}>
          <TeacherServiceGrid
            items={[
              {
                id: "assign",
                label: "Assign HW",
                icon: "add-circle",
                bg: teacherColors.purpleBg,
                color: teacherColors.purple,
                onPress: () => router.push("/teacher/homework/assign" as never),
              },
              {
                id: "attendance",
                label: "Attendance",
                icon: "checkmark-done",
                bg: teacherColors.greenBg,
                color: teacherColors.greenDark,
                onPress: () => {
                  const lesson = todayLessons[0]
                  if (lesson) openAttendance(lesson)
                  else router.push("/(teacher)/courses" as never)
                },
              },
              {
                id: "groups",
                label: "Groups",
                icon: "school",
                bg: teacherColors.blueBg,
                color: teacherColors.blue,
                onPress: () => router.push("/(teacher)/courses" as never),
              },
              {
                id: "review",
                label: "Review",
                icon: "ribbon",
                bg: teacherColors.orangeBg,
                color: teacherColors.orange,
                onPress: () => router.push("/(teacher)/homework" as never),
              },
            ]}
          />
        </FadeInDown>

        <FadeInDown index={2}>
          <Text style={styles.sectionTitle}>My groups</Text>
          <TeacherHomeGroupCards groups={groupCards} onPress={setSelectedGroup} />
        </FadeInDown>

        <FadeInDown index={3}>
          <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Schedule</Text>
          <TimetableDayStrip
            dates={weekDates}
            selected={selectedDate}
            counts={lessonsByDate}
            onSelect={setSelectedDate}
          />
          <Text style={styles.dateLabel}>{formatHeaderDate(selectedDate)}</Text>
          {dayLessons.length === 0 ? (
            <View style={[styles.emptyCard, shadow.card]}>
              <Ionicons name="sunny-outline" size={28} color={teacherColors.accentDark} />
              <Text style={styles.emptyTitle}>No lessons</Text>
              <Text style={styles.emptyText}>Nothing scheduled for this day</Text>
            </View>
          ) : (
            dayLessons.map((lesson) => (
              <TimetableLessonBlock
                key={lesson.id}
                lesson={lesson}
                onPress={() => openAttendance(lesson)}
              />
            ))
          )}
        </FadeInDown>

        {upcoming.length > 0 ? (
          <FadeInDown index={4}>
            <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Coming up</Text>
            {upcoming.map((lesson) => (
              <TimetableLessonBlock
                key={lesson.id}
                lesson={lesson}
                onPress={() => openAttendance(lesson)}
              />
            ))}
          </FadeInDown>
        ) : null}

        {notifications.length > 0 ? (
          <FadeInDown index={5}>
            <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Updates</Text>
            {notifications.map((item) => (
              <View key={item.id} style={[styles.notifCard, shadow.card]}>
                <View
                  style={[
                    styles.notifDot,
                    { backgroundColor: item.read ? colors.border : teacherColors.accent },
                  ]}
                />
                <View style={styles.notifMain}>
                  <Text style={styles.notifTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.notifMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                </View>
              </View>
            ))}
          </FadeInDown>
        ) : null}
      </ScrollView>

      <TeacherGroupInfoModal
        visible={selectedGroup != null}
        group={selectedGroup}
        onClose={closeGroupModal}
        onOpenGroup={(groupId) => {
          closeGroupModal()
          router.push(`/teacher/courses/${groupId}` as never)
        }}
        onAssignHomework={(groupId) => {
          closeGroupModal()
          router.push(`/teacher/homework/assign?groupId=${groupId}` as never)
        }}
      />
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  sectionSpaced: { marginTop: spacing.lg },
  dateLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.label, color: colors.text, marginTop: spacing.sm },
  emptyText: { ...typography.bodySm, color: colors.textMuted, marginTop: 4 },
  notifCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  notifMain: { flex: 1, minWidth: 0 },
  notifTitle: { ...typography.label, color: colors.text },
  notifMessage: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  error: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
})
