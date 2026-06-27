import React, { useEffect, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { BackButton } from "../../../src/components/ui/BackButton"
import { IeltsReadingListSkeleton } from "../../../src/components/skeletons/Layouts"
import { listIeltsReadingTasks } from "../../../src/lib/ielts-reading"
import type { IeltsReadingCatalogItem } from "../../../src/types/ielts"
import { colors, radius, shadow, spacing, subjectColors } from "../../../src/theme/tokens"

export default function IeltsReadingListScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [tasks, setTasks] = useState<IeltsReadingCatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void listIeltsReadingTasks()
      .then((items) => {
        if (!cancelled) setTasks(items)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const accent = subjectColors.reading

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerText}>
            <Text style={styles.title}>IELTS Reading</Text>
            <Text style={styles.subtitle}>Passage + questions in exam format</Text>
          </View>
        </View>

        {loading ? (
          <IeltsReadingListSkeleton />
        ) : tasks.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No reading tasks yet</Text>
            <Text style={styles.emptyText}>New passages will appear here soon.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {tasks.map((task) => (
              <Pressable
                key={task.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/ielts/reading/${task.id}` as never)}
              >
                <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
                  <Ionicons name="document-text-outline" size={22} color={accent} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{task.title}</Text>
                  <Text style={styles.cardSubtitle}>{task.subtitle}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Ionicons name="help-circle-outline" size={12} color={colors.primaryDark} />
                      <Text style={styles.metaText}>{task.questionCount} questions</Text>
                    </View>
                    <View style={[styles.metaBadge, styles.timeBadge]}>
                      <Ionicons name="time-outline" size={12} color="#B45309" />
                      <Text style={[styles.metaText, styles.timeText]}>
                        {task.estimatedMinutes} min
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
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
  cardPressed: { opacity: 0.94 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
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
  timeBadge: { backgroundColor: colors.warningBg },
  metaText: { fontSize: 11, fontWeight: "700", color: colors.primaryDark },
  timeText: { color: "#B45309" },
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
