import React, { useCallback, useState } from "react"
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../../src/context/AuthContext"
import { FadeInDown } from "../../src/components/ui/FadeInDown"
import { TeacherHomeSkeleton } from "../../src/components/teacher/TeacherSkeletons"
import { TeacherLessonCard } from "../../src/components/teacher/TeacherLessonCard"
import { notificationsApi, type NotificationItem } from "../../src/lib/api"
import { getUserFacingErrorMessage } from "../../src/lib/api-client"
import { fetchTeacherLessons } from "../../src/lib/teacher-data"
import {
  lessonsOnDate,
  todayIsoDate,
  upcomingLessons,
  type LessonWithGroup,
} from "../../src/lib/teacher-lessons"
import { colors, radius, shadow, spacing, typography } from "../../src/theme/tokens"

export default function TeacherHomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [todayLessons, setTodayLessons] = useState<LessonWithGroup[]>([])
  const [upcoming, setUpcoming] = useState<LessonWithGroup[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const firstName = user?.name?.split(" ")[0] || "Teacher"
  const today = todayIsoDate()

  const load = useCallback(
    async (force = false) => {
      setError("")
      try {
        const [{ lessons }, notifs] = await Promise.all([
          fetchTeacherLessons(undefined, { force }),
          notificationsApi.list({ force }).catch(() => [] as NotificationItem[]),
        ])
        setTodayLessons(lessonsOnDate(lessons, today))
        setUpcoming(upcomingLessons(lessons, today, 5))
        setNotifications(notifs.slice(0, 5))
      } catch (e) {
        setError(getUserFacingErrorMessage(e, "Could not load teacher home."))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [today],
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const openAttendance = (lesson: LessonWithGroup) => {
    router.push(`/teacher/courses/${lesson.groupId}/attendance?date=${lesson.date}` as never)
  }

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
          <Text style={styles.greeting}>Hello, {firstName}</Text>
          <Text style={styles.subGreeting}>Today’s classes and updates</Text>
        </FadeInDown>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FadeInDown index={1}>
          <Text style={styles.sectionTitle}>Today</Text>
          {todayLessons.length === 0 ? (
            <View style={[styles.emptyCard, shadow.card]}>
              <Text style={styles.emptyText}>No lessons scheduled for today</Text>
            </View>
          ) : (
            todayLessons.map((lesson) => (
              <TeacherLessonCard
                key={lesson.id}
                lesson={lesson}
                actionLabel={lesson.attendanceMarked ? "View attendance" : "Mark attendance"}
                onPress={() => openAttendance(lesson)}
              />
            ))
          )}
        </FadeInDown>

        <FadeInDown index={2}>
          <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Upcoming</Text>
          {upcoming.length === 0 ? (
            <View style={[styles.emptyCard, shadow.card]}>
              <Text style={styles.emptyText}>No upcoming lessons</Text>
            </View>
          ) : (
            upcoming.map((lesson) => (
              <TeacherLessonCard
                key={lesson.id}
                lesson={lesson}
                onPress={() => openAttendance(lesson)}
              />
            ))
          )}
        </FadeInDown>

        <FadeInDown index={3}>
          <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Notifications</Text>
          {notifications.length === 0 ? (
            <View style={[styles.emptyCard, shadow.card]}>
              <Text style={styles.emptyText}>No recent notifications</Text>
            </View>
          ) : (
            notifications.map((item) => (
              <View key={item.id} style={[styles.notifCard, shadow.card]}>
                <View style={styles.notifIcon}>
                  <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.notifMain}>
                  <Text style={styles.notifTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.notifMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                </View>
              </View>
            ))
          )}
        </FadeInDown>
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
  greeting: { ...typography.h2, color: colors.text },
  subGreeting: { ...typography.bodySm, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionSpaced: { marginTop: spacing.lg },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: "center" },
  notifCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  notifMain: { flex: 1, minWidth: 0 },
  notifTitle: { ...typography.label, color: colors.text },
  notifMessage: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  error: {
    ...typography.bodySm,
    color: colors.error,
    marginBottom: spacing.sm,
  },
})
