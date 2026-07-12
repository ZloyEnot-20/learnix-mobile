import React, { useCallback, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect } from "expo-router"
import { liveLessonsApi } from "../../lib/live-lesson-api"
import { subscribeLiveLessonRefresh } from "../../lib/live-lesson-refresh"
import type { LiveLessonState } from "../../lib/books/types"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"
import { Skeleton } from "../ui/Skeleton"

const ICON = "#01AEF9"
const LIVE = "#059669"

/**
 * Home entry — refreshes on focus, pull-to-refresh, and live-lesson push.
 * No interval polling; teacher start arrives via FCM.
 */
export function JoinLiveLessonBanner() {
  const [active, setActive] = useState<LiveLessonState | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const session = await liveLessonsApi.getActive()
      setActive(session)
    } catch {
      setActive(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
      return subscribeLiveLessonRefresh(() => {
        void refresh({ silent: true })
      })
    }, [refresh]),
  )

  if (loading && !active) {
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Skeleton width={44} height={44} borderRadius={12} />
          <View style={styles.textCol}>
            <Skeleton width="55%" height={16} />
            <Skeleton width="70%" height={12} style={{ marginTop: 6 }} />
          </View>
        </View>
      </View>
    )
  }

  const isLive = Boolean(active && active.lessonStatus !== "finished")

  return (
    <Pressable
      style={styles.wrap}
      onPress={() => router.push("/live-lesson" as never)}
      accessibilityRole="button"
      accessibilityLabel={isLive ? "Open live lesson in progress" : "Open live lesson"}
    >
      <View style={[styles.card, isLive && styles.cardLive]}>
        <View style={[styles.iconWrap, isLive && styles.iconWrapLive]}>
          <Ionicons
            name={isLive ? "radio" : "radio-outline"}
            size={24}
            color={isLive ? LIVE : ICON}
          />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>{isLive ? "Lesson in progress" : "Live lesson"}</Text>
          <Text style={styles.subtitle}>
            {isLive
              ? `Unit ${active?.currentUnit ?? "—"} · Ex ${active?.currentExercise ?? "—"} · Tap to join`
              : "Opens when your teacher starts a class"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.section },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.card,
  },
  cardLive: {
    borderColor: "#A7F3D0",
    backgroundColor: "#F0FDF4",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapLive: {
    backgroundColor: "#D1FAE5",
  },
  textCol: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: "700", color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary },
})
