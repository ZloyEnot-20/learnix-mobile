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
import { FadeInDown } from "../../ui/FadeInDown"
import { TeacherStatCard } from "../../teacher/TeacherStatCard"
import { TeacherServiceGrid } from "../../teacher/TeacherServiceGrid"
import { AdminHomeSkeleton } from "../AdminHomeSkeleton"
import { adminApi, type AdminDashboardStats } from "../../../lib/api"
import { getUserFacingErrorMessage } from "../../../lib/api-client"
import { colors, radius, shadow, spacing, typography } from "../../../theme/tokens"

const EMPTY: AdminDashboardStats = {
  totalStudents: 0,
  totalTeachers: 0,
  activeUsersToday: 0,
  usersOnlineNow: 0,
  pendingHomeworkReview: 0,
  newRegistrationsToday: 0,
}

export function AdminDashboardScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<AdminDashboardStats>(EMPTY)
  const [unreadAlerts, setUnreadAlerts] = useState(0)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const [dashboard, alerts] = await Promise.all([
        adminApi.dashboard(),
        adminApi.alerts().catch(() => []),
      ])
      setStats(dashboard)
      setUnreadAlerts(alerts.filter((a) => !a.read).length)
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not load dashboard."))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const serviceItems = useMemo(
    () => [
      {
        id: "users",
        label: "Users",
        icon: "people" as const,
        bg: "#E0F2FE",
        color: "#0284C7",
        onPress: () => router.push("/(admin)/users" as never),
      },
      {
        id: "teachers",
        label: "Teachers",
        icon: "school" as const,
        bg: "#EDE9FE",
        color: "#7C3AED",
        onPress: () => router.push("/(admin)/teachers" as never),
      },
      {
        id: "review",
        label: stats.pendingHomeworkReview > 0 ? `Review (${stats.pendingHomeworkReview})` : "Review HW",
        icon: "clipboard" as const,
        bg: "#FFE4E6",
        color: "#E11D48",
        onPress: () => router.push("/(admin)/homework" as never),
      },
      {
        id: "push",
        label: "Push",
        icon: "notifications" as const,
        bg: "#E0E7FF",
        color: "#4F46E5",
        onPress: () => router.push("/(admin)/push" as never),
      },
      {
        id: "alerts",
        label: unreadAlerts > 0 ? `Alerts (${unreadAlerts})` : "Alerts",
        icon: "alert-circle" as const,
        bg: "#FEF3C7",
        color: "#D97706",
        onPress: () => router.push("/(admin)/alerts" as never),
      },
    ],
    [router, stats.pendingHomeworkReview, unreadAlerts],
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  if (loading) return <AdminHomeSkeleton />

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      showsVerticalScrollIndicator={false}
    >
      {error ? (
        <View style={[styles.errorCard, shadow.card]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FadeInDown index={0}>
        <View style={styles.statsRow}>
          <TeacherStatCard
            label="Students"
            value={String(stats.totalStudents)}
            icon="people-outline"
            iconBg="#E0F2FE"
            iconColor="#0284C7"
            onPress={() => router.push("/(admin)/users" as never)}
          />
          <TeacherStatCard
            label="Teachers"
            value={String(stats.totalTeachers)}
            icon="school-outline"
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            onPress={() => router.push("/(admin)/teachers" as never)}
          />
        </View>
      </FadeInDown>

      <FadeInDown index={1}>
        <View style={styles.statsRow}>
          <TeacherStatCard
            label="Active today"
            value={String(stats.activeUsersToday)}
            icon="pulse-outline"
            iconBg="#D1FAE5"
            iconColor="#059669"
            onPress={() => router.push("/(admin)/users" as never)}
          />
          <TeacherStatCard
            label="Online now"
            value={String(stats.usersOnlineNow)}
            icon="wifi-outline"
            iconBg="#FEF3C7"
            iconColor="#D97706"
            onPress={() => router.push("/(admin)/users" as never)}
          />
        </View>
      </FadeInDown>

      <FadeInDown index={2}>
        <View style={styles.statsRow}>
          <TeacherStatCard
            label="Awaiting review"
            value={String(stats.pendingHomeworkReview)}
            icon="clipboard-outline"
            iconBg="#FFE4E6"
            iconColor="#E11D48"
            accent={stats.pendingHomeworkReview > 0 ? "#E11D48" : undefined}
            onPress={() => router.push("/(admin)/homework" as never)}
          />
          <TeacherStatCard
            label="New today"
            value={String(stats.newRegistrationsToday)}
            icon="person-add-outline"
            iconBg="#E0E7FF"
            iconColor="#4F46E5"
            onPress={() => router.push("/(admin)/users" as never)}
          />
        </View>
      </FadeInDown>

      <FadeInDown index={3}>
        <TeacherServiceGrid title="Services" items={serviceItems} />
      </FadeInDown>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  errorText: { ...typography.bodySm, color: colors.error, flex: 1 },
})
