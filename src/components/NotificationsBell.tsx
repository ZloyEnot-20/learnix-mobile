import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { notificationsApi, type NotificationItem } from "../lib/api"
import { cacheKey, peekStale } from "../lib/api-cache"
import { subscribeNotificationsRefresh } from "../lib/notifications-refresh"
import { BottomSheet } from "./ui/BottomSheet"
import { NotificationListSkeleton } from "./skeletons/Layouts"
import { formatRelative, groupKey } from "../lib/utils"
import { colors, radius, shadow, spacing, typography } from "../theme/tokens"

const TYPE_META: Record<
  NotificationItem["type"],
  { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }
> = {
  homework: { icon: "clipboard-outline", bg: colors.primaryLight, fg: colors.primary },
  result: { icon: "book-outline", bg: colors.successBg, fg: colors.success },
  reminder: { icon: "notifications-outline", bg: colors.warningBg, fg: colors.warning },
  achievement: { icon: "trophy-outline", bg: "#FEF9C3", fg: "#A16207" },
  system: { icon: "sparkles-outline", bg: "#E0F2FE", fg: "#0369A1" },
  entry_test: { icon: "checkmark-circle-outline", bg: colors.errorBg, fg: colors.error },
}

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoaded(false)
    try {
      const data = await notificationsApi.list(opts?.silent ? { force: true } : undefined)
      setItems(data)
    } catch {
      if (!opts?.silent) setItems([])
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    const cached = peekStale<NotificationItem[]>(cacheKey("GET", "/notifications"))
    if (cached) {
      setItems(cached)
      setLoaded(true)
    }
    void refresh({ silent: true })
  }, [refresh])

  useEffect(() => subscribeNotificationsRefresh(() => void refresh({ silent: true })), [refresh])

  useEffect(() => {
    if (open) void refresh({ silent: loaded })
  }, [open, loaded, refresh])

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
        <Ionicons name="notifications-outline" size={22} color={colors.text} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        )}
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        headerRight={
          <View style={styles.headerActions}>
            {unread > 0 && (
              <Pressable onPress={markAllRead}>
                <Text style={styles.markAll}>Mark all read</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
        }
      >
        {!loaded ? (
          <NotificationListSkeleton />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyDesc}>You're all caught up!</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            style={styles.listScroll}
          >
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
                          <Ionicons name={meta.icon} size={18} color={meta.fg} />
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
      </BottomSheet>
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
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  markAll: { ...typography.bodySm, color: colors.primary, fontWeight: "600" },
  listScroll: { maxHeight: 480 },
  empty: { alignItems: "center", paddingVertical: 48, gap: spacing.sm, paddingHorizontal: spacing.screen },
  emptyTitle: { ...typography.label, fontSize: 16, color: colors.text },
  emptyDesc: { ...typography.bodySm, color: colors.textSecondary },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.md, gap: spacing.sm },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  notifCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
    alignItems: "flex-start",
    ...shadow.card,
  },
  notifUnread: { backgroundColor: colors.primaryLight },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBody: { flex: 1 },
  notifTitle: { ...typography.label, color: colors.text },
  notifMessage: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  notifTime: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
})
