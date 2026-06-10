import React, { useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import type { GameHistoryEntry } from "../lib/learned-vocabulary"
import { dateGroupLabel, formatShortDate, scoreColor } from "../lib/utils"
import { colors, radius, shadow, spacing } from "../theme/tokens"

function HistoryCard({ item }: { item: GameHistoryEntry }) {
  const router = useRouter()
  const pct =
    item.totalQuestions > 0
      ? Math.round((item.correctCount / item.totalQuestions) * 100)
      : 0
  const accent = item.kind === "vocab" ? "#8B5CF6" : "#F59E0B"
  const icon = item.kind === "vocab" ? "library-outline" : "school-outline"

  return (
    <Pressable
      onPress={() => router.push(item.route as never)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.kind, { color: accent }]}>
            {item.kind === "vocab" ? "Vocabulary" : "Grammar"}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Ionicons
            name={item.passed ? "checkmark-circle" : "ellipse-outline"}
            size={12}
            color={item.passed ? colors.success : colors.textMuted}
          />
          <Text style={styles.date}>{formatShortDate(item.completedAt)}</Text>
        </View>
      </View>

      <View style={styles.scoreCol}>
        <Text style={[styles.percent, { color: scoreColor(pct) }]}>{pct}%</Text>
        <Text style={styles.fraction}>
          {item.correctCount}/{item.totalQuestions}
        </Text>
      </View>
    </Pressable>
  )
}

interface GamesHistorySectionProps {
  history: GameHistoryEntry[]
}

export function GamesHistorySection({ history }: GamesHistorySectionProps) {
  const groups = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )
    const result: { label: string; items: GameHistoryEntry[] }[] = []
    for (const item of sorted) {
      const label = dateGroupLabel(item.completedAt)
      const last = result[result.length - 1]
      if (last && last.label === label) last.items.push(item)
      else result.push({ label, items: [item] })
    }
    return result
  }, [history])

  if (history.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="game-controller-outline" size={28} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No game history yet</Text>
        <Text style={styles.emptyDesc}>
          Completed vocabulary quizzes and grammar rounds will appear here.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.label}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.items.map((item) => (
            <HistoryCard key={item.id} item={item} />
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  groupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.94 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  kind: { fontSize: 12, fontWeight: "600" },
  dot: { fontSize: 12, color: colors.textMuted },
  date: { fontSize: 12, color: colors.textSecondary },
  scoreCol: { alignItems: "flex-end" },
  percent: { fontSize: 16, fontWeight: "700" },
  fraction: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
})
