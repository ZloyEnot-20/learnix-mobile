import React, { useEffect, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useAuth } from "../../src/context/AuthContext"
import { LevelScale } from "../../src/components/LevelScale"
import { testResultsApi } from "../../src/lib/api"
import type { TestResult } from "../../src/types/domain"
import { colors, subjectColors } from "../../src/theme/colors"

export default function HomeScreen() {
  const { user } = useAuth()
  const [results, setResults] = useState<TestResult[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const data = await testResultsApi.list()
      setResults(data)
    } catch {
      setResults([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (!user) return null

  const avgBand =
    results.length > 0
      ? (results.reduce((s, r) => s + r.bandScore, 0) / results.length).toFixed(1)
      : "—"

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>Hello, {user.name.split(" ")[0]}! 👋</Text>
      <Text style={styles.subGreeting}>Track your progress and level</Text>

      <View style={styles.section}>
        <LevelScale studentId={user.id} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{results.length}</Text>
          <Text style={styles.statLabel}>Tests taken</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{avgBand}</Text>
          <Text style={styles.statLabel}>Avg band</Text>
        </View>
      </View>

      {results.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent results</Text>
          {results.slice(0, 5).map((r) => (
            <View key={r.id} style={styles.resultCard}>
              <View
                style={[
                  styles.resultIcon,
                  { backgroundColor: subjectColors[r.testType] ?? "#E2E8F0" },
                ]}
              >
                <Text style={styles.resultEmoji}>
                  {r.testType === "reading"
                    ? "📖"
                    : r.testType === "listening"
                      ? "🎧"
                      : r.testType === "writing"
                        ? "✍️"
                        : "🎤"}
                </Text>
              </View>
              <View style={styles.resultBody}>
                <Text style={styles.resultType}>
                  {r.testType.charAt(0).toUpperCase() + r.testType.slice(1)}
                </Text>
                <Text style={styles.resultDate}>
                  {new Date(r.date).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.resultBand}>Band {r.bandScore}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 24, fontWeight: "700", color: colors.text },
  subGreeting: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: "center",
  },
  statValue: { fontSize: 28, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  resultEmoji: { fontSize: 20 },
  resultBody: { flex: 1 },
  resultType: { fontSize: 15, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
  resultDate: { fontSize: 12, color: colors.textSecondary },
  resultBand: { fontSize: 16, fontWeight: "700", color: colors.text },
})
