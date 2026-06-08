import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "../../src/context/AuthContext"
import { ProfileSkeleton } from "../../src/components/skeletons/Layouts"
import { studentsApi, testResultsApi } from "../../src/lib/api"
import type { TestResult } from "../../src/types/domain"
import { initials } from "../../src/lib/utils"
import { colors, radius, shadow, spacing, typography, subjectColors } from "../../src/theme/tokens"

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [results, setResults] = useState<TestResult[]>([])
  const [groupName, setGroupName] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    if (!user) return
    try {
      const [ctx, testResults] = await Promise.all([
        studentsApi.context(user.id),
        testResultsApi.list(),
      ])
      setGroupName(ctx.groupName)
      setTeacherName(ctx.teacherName)
      setResults(testResults)
    } catch {
      setGroupName(null)
      setTeacherName(null)
      setResults([])
    }
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [user])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const stats = useMemo(() => {
    if (results.length === 0) return { avgBand: "—", bestBand: "—", total: 0 }
    const bands = results.map((r) => r.bandScore)
    return {
      avgBand: (bands.reduce((a, b) => a + b, 0) / bands.length).toFixed(1),
      bestBand: Math.max(...bands).toFixed(1),
      total: results.length,
    }
  }, [results])

  if (!user) return null

  const showSkeleton = loading || refreshing

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout()
          router.replace("/login")
        },
      },
    ])
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {showSkeleton ? (
        <ProfileSkeleton />
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(user.name)}</Text>
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Student</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            {groupName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Group</Text>
                <Text style={styles.infoValue}>{groupName}</Text>
              </View>
            )}
            {teacherName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Teacher</Text>
                <Text style={styles.infoValue}>{teacherName}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Login</Text>
              <Text style={styles.infoValue}>{user.login}</Text>
            </View>
            {user.isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>⭐ Premium</Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.avgBand}</Text>
              <Text style={styles.statLabel}>Avg band</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.bestBand}</Text>
              <Text style={styles.statLabel}>Best band</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Tests</Text>
            </View>
          </View>

          {results.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test results</Text>
              {results.map((r) => (
                <View key={r.id} style={styles.resultCard}>
                  <View
                    style={[
                      styles.resultDot,
                      { backgroundColor: subjectColors[r.testType] ?? "#E2E8F0" },
                    ]}
                  />
                  <View style={styles.resultBody}>
                    <Text style={styles.resultType}>
                      {r.testType.charAt(0).toUpperCase() + r.testType.slice(1)}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {new Date(r.date).toLocaleDateString()} · {r.totalCorrect}/{r.totalQuestions}
                    </Text>
                  </View>
                  <Text style={styles.resultBand}>{r.bandScore}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {!showSkeleton && (
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 40 },
  hero: { alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  name: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 12 },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  badge: {
    marginTop: 8,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#6D28D9" },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.section,
    marginBottom: spacing.section,
    ...shadow.card,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 14, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: "600", color: colors.text },
  premiumBadge: {
    marginTop: 12,
    backgroundColor: "#FEF9C3",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  premiumText: { fontSize: 14, fontWeight: "600", color: "#A16207" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: "center",
    ...shadow.card,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  resultDot: { width: 8, height: 8, borderRadius: 4 },
  resultBody: { flex: 1 },
  resultType: { fontSize: 15, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
  resultMeta: { fontSize: 12, color: colors.textSecondary },
  resultBand: { fontSize: 18, fontWeight: "700", color: colors.text },
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: "600", color: colors.error },
})
