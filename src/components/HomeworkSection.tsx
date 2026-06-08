import React, { useMemo, useState } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { formatDue, dateGroupLabel } from "../lib/utils"
import { colors, subjectColors } from "../theme/colors"

type Subject = "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary"
type Status = "pending" | "in_progress" | "completed"

export interface HomeworkItem {
  id: string
  subject: Subject
  title: string
  description: string
  dueAt: string
  createdAt: string
  status: Status
  timeLimitMinutes?: number
  completedAt?: string
  route?: string
}

const SUBJECT_ICONS: Record<Subject, keyof typeof Ionicons.glyphMap> = {
  reading: "book-outline",
  listening: "headset-outline",
  writing: "create-outline",
  speaking: "mic-outline",
  grammar: "school-outline",
  vocabulary: "library-outline",
}

const STATUS_META: Record<Status, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#F1F5F9", color: "#475569" },
  in_progress: { label: "In Progress", bg: "#FEF3C7", color: "#B45309" },
  completed: { label: "Completed", bg: "#D1FAE5", color: "#047857" },
}

function HomeworkCard({ hw }: { hw: HomeworkItem }) {
  const router = useRouter()
  const due = formatDue(hw.dueAt, hw.status)
  const status = STATUS_META[hw.status]
  const isCompleted = hw.status === "completed"
  const icon = SUBJECT_ICONS[hw.subject]
  const bgColor = subjectColors[hw.subject] ?? "#E2E8F0"

  const completedLabel =
    isCompleted && hw.completedAt
      ? `Completed ${new Date(hw.completedAt).toLocaleDateString()}`
      : null

  const timeLabel =
    hw.timeLimitMinutes != null && hw.timeLimitMinutes > 0
      ? `${hw.timeLimitMinutes} min limit`
      : "Unlimited"

  const handlePress = () => {
    if (hw.route) router.push(hw.route as never)
  }

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={24} color="#1E293B" />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isCompleted && styles.titleCompleted]} numberOfLines={2}>
            {hw.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {hw.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, due.overdue && styles.overdue]}>
            📅 {completedLabel ?? due.label}
          </Text>
          <Text style={styles.meta}>⏱ {timeLabel}</Text>
          <Text style={styles.metaSubject}>{hw.subject}</Text>
        </View>
      </View>

      <Pressable
        onPress={handlePress}
        disabled={!hw.route && !isCompleted}
        style={({ pressed }) => [
          styles.actionBtn,
          isCompleted ? styles.actionView : styles.actionStart,
          pressed && { opacity: 0.8 },
          !hw.route && !isCompleted && { opacity: 0.5 },
        ]}
      >
        <Text style={[styles.actionText, isCompleted ? styles.actionTextView : styles.actionTextStart]}>
          {isCompleted ? "View" : hw.status === "in_progress" ? "Continue" : "Start"}
        </Text>
      </Pressable>
    </View>
  )
}

interface HomeworkSectionProps {
  items: HomeworkItem[]
}

export function HomeworkSection({ items }: HomeworkSectionProps) {
  const [tab, setTab] = useState<"active" | "history">("active")

  const active = useMemo(() => items.filter((i) => i.status !== "completed"), [items])
  const completed = useMemo(() => items.filter((i) => i.status === "completed"), [items])

  const historyGroups = useMemo(() => {
    const sorted = [...completed].sort((a, b) => {
      const ta = new Date(a.completedAt ?? a.dueAt).getTime()
      const tb = new Date(b.completedAt ?? b.dueAt).getTime()
      return tb - ta
    })
    const groups: { label: string; items: HomeworkItem[] }[] = []
    for (const item of sorted) {
      const label = dateGroupLabel(item.completedAt ?? item.dueAt)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.items.push(item)
      else groups.push({ label, items: [item] })
    }
    return groups
  }, [completed])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>Homework</Text>
          <Text style={styles.sectionDesc}>Tasks assigned by your tutor</Text>
        </View>
        {tab === "active" && active.length > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{active.length} pending</Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("active")}
          style={[styles.tab, tab === "active" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
            Active {active.length > 0 ? `(${active.length})` : ""}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("history")}
          style={[styles.tab, tab === "history" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>
            History {completed.length > 0 ? `(${completed.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {tab === "active" ? (
        active.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyDesc}>No active homework right now.</Text>
          </View>
        ) : (
          active.map((hw) => <HomeworkCard key={hw.id} hw={hw} />)
        )
      ) : completed.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No completed homework yet</Text>
          <Text style={styles.emptyDesc}>Finished tasks will appear here.</Text>
        </View>
      ) : (
        historyGroups.map((group) => (
          <View key={group.label}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.items.map((hw) => (
              <HomeworkCard key={hw.id} hw={hw} />
            ))}
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  sectionDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  pendingBadge: {
    backgroundColor: colors.primary + "18",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pendingText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
  tabTextActive: { color: colors.text, fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  cardCompleted: { opacity: 0.85 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text, flex: 1 },
  titleCompleted: { textDecorationLine: "line-through", color: colors.textSecondary },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  description: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  meta: { fontSize: 11, color: colors.textSecondary },
  overdue: { color: colors.primary, fontWeight: "600" },
  metaSubject: { fontSize: 11, color: colors.textMuted, textTransform: "capitalize" },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionStart: { backgroundColor: colors.primary },
  actionView: { backgroundColor: "transparent" },
  actionText: { fontSize: 13, fontWeight: "600" },
  actionTextStart: { color: "#fff" },
  actionTextView: { color: colors.success },
  empty: { alignItems: "center", paddingVertical: 32, gap: 6 },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 8,
  },
})
