import React, { useEffect, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { BackButton } from "../../../src/components/ui/BackButton"
import { IeltsListeningListSkeleton } from "../../../src/components/skeletons/ListeningSkeletons"
import { listIeltsListeningTests } from "../../../src/lib/ielts-listening"
import type { IeltsListeningCatalogItem } from "../../../src/types/ielts"
import { colors, radius, shadow, spacing, subjectColors } from "../../../src/theme/tokens"

export default function IeltsListeningListScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [tests, setTests] = useState<IeltsListeningCatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void listIeltsListeningTests()
      .then((items) => {
        if (!cancelled) setTests(items)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const accent = subjectColors.listening

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerText}>
            <Text style={styles.title}>IELTS Listening</Text>
            <Text style={styles.subtitle}>Cambridge tests with audio</Text>
          </View>
        </View>

        {loading ? (
          <IeltsListeningListSkeleton count={4} />
        ) : tests.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="headset-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No listening tests yet</Text>
            <Text style={styles.emptyText}>New tests will appear here soon.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {tests.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
                  <Ionicons name="headset-outline" size={22} color={accent} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Ionicons name="help-circle-outline" size={12} color={colors.primaryDark} />
                      <Text style={styles.metaText}>{item.questionCount} questions</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Ionicons name="time-outline" size={12} color={colors.primaryDark} />
                      <Text style={styles.metaText}>{item.estimatedMinutes} min</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
                  onPress={() => router.push(`/ielts/listening/${item.id}` as never)}
                >
                  <Text style={styles.startButtonText}>Start</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={{ height: Math.max(insets.bottom, spacing.sm) }} />
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  list: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  cardSubtitle: { fontSize: 13, color: colors.textSecondary },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaText: { fontSize: 11, fontWeight: "700", color: colors.primaryDark },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 0,
  },
  startButtonPressed: { opacity: 0.9 },
  startButtonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
})
