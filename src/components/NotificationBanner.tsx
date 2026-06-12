import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { notificationsApi, type NotificationItem } from "../lib/api"
import { cacheKey, peekStale } from "../lib/api-cache"
import { requestNotificationsRefresh, subscribeNotificationsRefresh } from "../lib/notifications-refresh"
import { NotificationBannerSkeleton } from "./skeletons/Layouts"
import { colors, radius, spacing, typography } from "../theme/tokens"

export function NotificationBanner() {
  const [items, setItems] = useState<NotificationItem[]>([])
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

  const featured = useMemo(() => items.find((n) => !n.read), [items])

  const markRead = async (item: NotificationItem) => {
    try {
      await notificationsApi.markRead(item.id, true)
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))
      requestNotificationsRefresh()
    } catch {
      /* ignore */
    }
  }

  if (!loaded) {
    return <NotificationBannerSkeleton />
  }

  if (!featured) return null

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notifications</Text>
      <Pressable
        onPress={() => markRead(featured)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headline} numberOfLines={2}>
              {featured.title}
            </Text>
            {featured.message ? (
              <Text style={styles.subline} numberOfLines={2}>
                {featured.message}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: "#FBBF24",
    borderRadius: radius.card,
    padding: spacing.md,
  },
  cardPressed: { opacity: 0.94 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(17, 24, 39, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headline: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 21,
  },
  subline: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(17, 24, 39, 0.72)",
  },
})
