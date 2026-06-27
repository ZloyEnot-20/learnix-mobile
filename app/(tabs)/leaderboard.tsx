import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "expo-router"
import { useAuth } from "../../src/context/AuthContext"
import { GuestAuthBanner } from "../../src/components/GuestAuthBanner"
import { isGuestUser } from "../../src/lib/guest"
import { LeaderboardPodium } from "../../src/components/LeaderboardPodium"
import { ProfileAvatar } from "../../src/components/ProfileAvatar"
import { TierBadge } from "../../src/components/TierBadge"
import { LeaderboardPodiumSkeleton, LeaderboardListSkeleton } from "../../src/components/skeletons/Layouts"
import { orgApi, studentsApi } from "../../src/lib/api"
import { prefetchAppMediaAssets } from "../../src/lib/app-cache"
import { requestNotificationsRefresh } from "../../src/lib/notifications-refresh"
import type { LeaderboardEntry, StudentLevel } from "../../src/types/gamification"
import { getTierBarColor } from "../../src/types/gamification"
import { colors, radius, spacing, typography } from "../../src/theme/tokens"

const MEDAL_COLORS = {
  1: { bg: "#FBBF24", text: "#78350F" },
  2: { bg: "#CBD5E1", text: "#334155" },
  3: { bg: "#FB923C", text: "#7C2D12" },
} as const

function RankBadge({ rank }: { rank: number | null }) {
  if (rank != null && rank <= 3) {
    const medal = MEDAL_COLORS[rank as 1 | 2 | 3]
    return (
      <View style={[styles.medal, { backgroundColor: medal.bg }]}>
        <Text style={[styles.medalText, { color: medal.text }]}>{rank}</Text>
      </View>
    )
  }

  return <Text style={styles.rankNum}>{rank != null ? rank : "—"}</Text>
}

function LeaderboardRow({
  entry,
  isMe,
  highlightName,
  showYouBadge,
}: {
  entry: LeaderboardEntry
  isMe?: boolean
  highlightName?: boolean
  showYouBadge?: boolean
}) {
  const rank = entry.rank > 0 ? entry.rank : null
  const tierBorderColor = getTierBarColor(entry.tier)
  const avatarSize = 44

  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <View style={styles.rankCol}>
        <RankBadge rank={rank} />
      </View>

      <View style={styles.avatarWrap}>
        <View
          style={[
            styles.avatarRing,
            {
              width: avatarSize + 6,
              height: avatarSize + 6,
              borderRadius: (avatarSize + 6) / 2,
              borderColor: tierBorderColor,
            },
          ]}
        >
          <ProfileAvatar
            name={entry.name}
            avatarUrl={entry.avatarUrl}
            size={avatarSize}
          />
        </View>
        <View style={styles.tierBadge}>
          <TierBadge tierId={entry.tier} size={24} />
        </View>
        {showYouBadge ? (
          <View style={styles.youBadge}>
            <Text style={styles.youBadgeText}>You</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowName,
            highlightName && styles.rowNameTop,
            isMe && styles.rowNameMe,
          ]}
          numberOfLines={1}
        >
          {entry.name}
          {isMe && !showYouBadge ? " (You)" : ""}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {entry.tierLabel} · Lvl {entry.level}
        </Text>
      </View>

      <View style={styles.scoreCol}>
        <Text style={styles.scoreValue}>{entry.totalPoints.toLocaleString()}</Text>
        {entry.rank === 1 ? <Text style={styles.scoreLabel}>Top score</Text> : null}
      </View>
    </View>
  )
}

function LeaderboardFooter() {
  return (
    <View style={styles.footer}>
      <Ionicons name="star" size={18} color="#FBBF24" />
      <Text style={styles.footerText}>
        Complete <Text style={styles.footerBold}>homework</Text> and{" "}
        <Text style={styles.footerBold}>exercises</Text> to earn XP and get on the board!
      </Text>
    </View>
  )
}

export default function LeaderboardScreen() {
  const { user } = useAuth()
  const guest = isGuestUser(user)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myLevel, setMyLevel] = useState<StudentLevel | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (force = false) => {
    if (!user || isGuestUser(user)) return
    try {
      const data = await orgApi.leaderboard({ force })
      void prefetchAppMediaAssets({
        imageUrls: [...data.map((entry) => entry.avatarUrl), user.avatarUrl],
      })
      setEntries(data)

      const meInList = data.some((entry) => entry.studentId === user.id)
      if (!meInList) {
        const level = await studentsApi.level(user.id, { force })
        setMyLevel(level)
      } else {
        setMyLevel(null)
      }
    } catch {
      setEntries([])
      setMyLevel(null)
    }
  }, [user])

  useEffect(() => {
    if (guest) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, guest])

  useFocusEffect(
    useCallback(() => {
      requestNotificationsRefresh()
    }, []),
  )

  const meInList = useMemo(
    () => (user ? entries.find((entry) => entry.studentId === user.id) : undefined),
    [entries, user],
  )

  const listEntries = useMemo(() => entries.slice(3), [entries])

  const myFallbackEntry = useMemo<LeaderboardEntry | null>(() => {
    if (!user || guest || meInList || !myLevel) return null
    return {
      rank: 0,
      studentId: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      totalPoints: myLevel.totalPoints,
      level: myLevel.level,
      tier: myLevel.tier,
      tierLabel: myLevel.tierLabel,
    }
  }, [user, guest, meInList, myLevel])

  if (guest) {
    return (
      <View style={styles.container}>
        <GuestAuthBanner
          variant="screen"
          title="Top is for students"
          message="Sign in and join your learning center to earn XP, compete with classmates, and climb the rankings."
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top XP Leaders</Text>

      {loading ? (
        <>
          <View style={styles.fixedTop}>
            <LeaderboardPodiumSkeleton />
          </View>
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <LeaderboardListSkeleton />
          </ScrollView>
        </>
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No rankings yet</Text>
          <Text style={styles.emptyText}>
            Complete homework and exercises to earn XP and get on the board.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.fixedTop}>
            <LeaderboardPodium entries={entries} currentUserId={user?.id} />
          </View>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.list}>
              {listEntries.map((entry) => (
                <LeaderboardRow
                  key={entry.studentId}
                  entry={entry}
                  isMe={user?.id === entry.studentId}
                />
              ))}
            </View>

            {myFallbackEntry ? (
              <>
                <View style={styles.separator} />
                <LeaderboardRow
                  entry={myFallbackEntry}
                  isMe
                  highlightName
                  showYouBadge
                />
              </>
            ) : null}

            <LeaderboardFooter />
          </ScrollView>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    ...typography.h3,
    color: colors.text,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  fixedTop: {
    paddingHorizontal: spacing.screen,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowMe: {
    backgroundColor: colors.primaryLight,
    marginHorizontal: -spacing.screen,
    paddingHorizontal: spacing.screen,
  },
  rankCol: {
    width: 28,
    alignItems: "center",
  },
  medal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: {
    fontSize: 12,
    fontWeight: "800",
  },
  rankNum: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  avatarWrap: {
    position: "relative",
    width: 50,
    height: 50,
  },
  avatarRing: {
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tierBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: colors.card,
    borderRadius: 999,
    padding: 1,
  },
  youBadge: {
    position: "absolute",
    left: "50%",
    bottom: -4,
    transform: [{ translateX: -18 }],
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.background,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  rowNameTop: {
    color: colors.indigo,
  },
  rowNameMe: {
    color: colors.primaryDark,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreCol: {
    alignItems: "flex-end",
    minWidth: 56,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.borderLight,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  footerBold: {
    fontWeight: "700",
    color: colors.text,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
})
