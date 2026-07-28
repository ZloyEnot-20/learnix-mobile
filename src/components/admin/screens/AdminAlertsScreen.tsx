import React, { useCallback, useMemo, useState } from "react"
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AdminListSkeleton } from "../AdminListSkeleton"
import { adminApi } from "../../../lib/api"
import { formatDateTime } from "../../../lib/admin-format"
import { getUserFacingErrorMessage } from "../../../lib/api-client"
import type { AdminAlert, AdminAlertType } from "../../../types/admin"
import { colors, radius, shadow, spacing, typography } from "../../../theme/tokens"

const HIDDEN_ALERT_TYPES = new Set<AdminAlertType>(["homework", "review_delay"])

const TYPE_META: Record<
  Exclude<AdminAlertType, "homework" | "review_delay">,
  { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }
> = {
  registration: { label: "Registration", icon: "person-add-outline", bg: "#D1FAE5", color: "#059669" },
  complaint: { label: "Complaint", icon: "warning-outline", bg: "#FEF3C7", color: "#D97706" },
  payment: { label: "Payment", icon: "card-outline", bg: "#FFE4E6", color: "#E11D48" },
  system: { label: "System", icon: "notifications-outline", bg: colors.borderLight, color: colors.textSecondary },
}

const TYPE_FILTERS: Array<{ key: "all" | Exclude<AdminAlertType, "homework" | "review_delay">; label: string }> = [
  { key: "all", label: "All" },
  { key: "registration", label: "Reg." },
  { key: "complaint", label: "Complaint" },
  { key: "payment", label: "Payment" },
]

export function AdminAlertsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [typeFilter, setTypeFilter] = useState<"all" | Exclude<AdminAlertType, "homework" | "review_delay">>("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  const load = useCallback(async () => {
    try {
      const rows = await adminApi.alerts()
      setAlerts(rows.filter((a) => !HIDDEN_ALERT_TYPES.has(a.type)))
    } catch (e) {
      Alert.alert("Error", getUserFacingErrorMessage(e, "Could not load alerts."))
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

  const filtered = useMemo(() => {
    let rows = typeFilter === "all" ? alerts : alerts.filter((a) => a.type === typeFilter)
    rows = [...rows].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortOrder === "newest" ? -diff : diff
    })
    return rows
  }, [alerts, typeFilter, sortOrder])

  const unreadCount = alerts.filter((a) => !a.read).length

  const markRead = async (alert: AdminAlert) => {
    if (alert.read) return
    try {
      await adminApi.readAlert(alert.id)
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, read: true } : a)))
    } catch {
      Alert.alert("Error", "Could not mark as read.")
    }
  }

  const markAllRead = async () => {
    const unreadKeys = alerts.filter((a) => !a.read).map((a) => a.id)
    if (!unreadKeys.length) return
    try {
      await adminApi.readAllAlerts(unreadKeys)
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
    } catch {
      Alert.alert("Error", "Could not mark all as read.")
    }
  }

  const openRelated = (alert: AdminAlert) => {
    void markRead(alert)
    if (alert.type === "registration") {
      router.push("/(admin)/users" as never)
    }
  }

  if (loading) return <AdminListSkeleton />

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load()
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.unread}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </Text>
            {unreadCount > 0 ? (
              <Pressable onPress={() => void markAllRead()}>
                <Text style={styles.markAll}>Mark all read</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chips}>
            {TYPE_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setTypeFilter(f.key)}
                style={[styles.chip, typeFilter === f.key && styles.chipActive]}
              >
                <Text style={[styles.chipText, typeFilter === f.key && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={styles.sortBtn}
            onPress={() => setSortOrder((o) => (o === "newest" ? "oldest" : "newest"))}
          >
            <Ionicons name="swap-vertical" size={16} color={colors.textMuted} />
            <Text style={styles.sortText}>{sortOrder === "newest" ? "Newest first" : "Oldest first"}</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => {
        const meta =
          TYPE_META[item.type as Exclude<AdminAlertType, "homework" | "review_delay">] ?? TYPE_META.system
        return (
          <Pressable
            onPress={() => openRelated(item)}
            style={[styles.card, shadow.card, !item.read && styles.cardUnread]}
          >
            <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={18} color={meta.color} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {!item.read ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.cardMessage} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={styles.cardMeta}>
                {meta.label} · {formatDateTime(item.createdAt)}
              </Text>
            </View>
          </Pressable>
        )
      }}
      ListEmptyComponent={<Text style={styles.empty}>No notifications</Text>}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.screen, gap: spacing.sm, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  unread: { ...typography.bodySm, color: colors.textSecondary },
  markAll: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary, fontSize: 11 },
  chipTextActive: { color: colors.primary, fontWeight: "600" },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sortText: { ...typography.caption, color: colors.textMuted },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { ...typography.label, color: colors.text, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  cardMessage: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  empty: { ...typography.bodySm, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
})
