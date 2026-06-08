import React, { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { notificationsApi, type NotificationItem } from "../lib/api"
import { formatRelative, groupKey } from "../lib/utils"
import { colors } from "../theme/colors"

const TYPE_META: Record<
  NotificationItem["type"],
  { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }
> = {
  homework: { icon: "clipboard-outline", bg: "#EDE9FE", fg: "#6D28D9" },
  result: { icon: "book-outline", bg: "#D1FAE5", fg: "#047857" },
  reminder: { icon: "notifications-outline", bg: "#FEF3C7", fg: "#B45309" },
  achievement: { icon: "trophy-outline", bg: "#FEF9C3", fg: "#A16207" },
  system: { icon: "sparkles-outline", bg: "#E0F2FE", fg: "#0369A1" },
  entry_test: { icon: "checkmark-circle-outline", bg: "#FFE4E6", fg: "#BE123C" },
}

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = () => {
    notificationsApi
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoaded(true))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open])

  const unread = items.filter((n) => !n.read).length

  const grouped = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {}
    for (const item of items) {
      const key = groupKey(item.createdAt)
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    return groups
  }, [items])

  const toggleRead = async (item: NotificationItem) => {
    try {
      const updated = await notificationsApi.markRead(item.id, !item.read)
      setItems((prev) => prev.map((n) => (n.id === item.id ? updated : n)))
    } catch {
      /* ignore */
    }
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.bellBtn} hitSlop={8}>
        <Ionicons name="notifications-outline" size={24} color={colors.text} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <View style={styles.headerActions}>
              {unread > 0 && (
                <Pressable onPress={markAllRead}>
                  <Text style={styles.markAll}>Mark all read</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {!loaded ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyDesc}>You're all caught up!</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {(["Today", "Yesterday", "Earlier"] as const).map((section) => {
                const sectionItems = grouped[section]
                if (!sectionItems?.length) return null
                return (
                  <View key={section}>
                    <Text style={styles.sectionLabel}>{section}</Text>
                    {sectionItems.map((item) => {
                      const meta = TYPE_META[item.type]
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => toggleRead(item)}
                          style={[styles.notifCard, !item.read && styles.notifUnread]}
                        >
                          <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}>
                            <Ionicons name={meta.icon} size={20} color={meta.fg} />
                          </View>
                          <View style={styles.notifBody}>
                            <Text style={styles.notifTitle}>{item.title}</Text>
                            <Text style={styles.notifMessage} numberOfLines={2}>
                              {item.message}
                            </Text>
                            <Text style={styles.notifTime}>{formatRelative(item.createdAt)}</Text>
                          </View>
                          {!item.read && <View style={styles.unreadDot} />}
                        </Pressable>
                      )
                    })}
                  </View>
                )
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  bellBtn: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  markAll: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  emptyDesc: { fontSize: 14, color: colors.textSecondary },
  list: { padding: 16, gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  notifCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  notifUnread: { backgroundColor: "#FFFBEB" },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  notifMessage: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  notifTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
})
