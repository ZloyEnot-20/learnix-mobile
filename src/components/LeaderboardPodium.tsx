import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { ProfileAvatar } from "./ProfileAvatar"
import { TierBadge } from "./TierBadge"
import type { LeaderboardEntry } from "../types/gamification"
import { getTierBarColor } from "../types/gamification"
import { colors, spacing } from "../theme/tokens"

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

const PODIUM_ORDER = [1, 0, 2] as const

const PODIUM_META = {
  1: { ordinal: "1st", avatarSize: 84, tierSize: 34, lift: 18 },
  2: { ordinal: "2nd", avatarSize: 68, tierSize: 30, lift: 0 },
  3: { ordinal: "3rd", avatarSize: 64, tierSize: 28, lift: 0 },
} as const

function PodiumSlot({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardEntry
  rank: 1 | 2 | 3
  isMe?: boolean
}) {
  const meta = PODIUM_META[rank]
  const borderColor = getTierBarColor(entry.tier)

  return (
    <View style={[styles.slot, { marginBottom: meta.lift }]}>
      <Text style={styles.ordinal}>{meta.ordinal}</Text>
      <View style={styles.avatarOuter}>
        <View
          style={[
            styles.avatarRing,
            {
              width: meta.avatarSize + 8,
              height: meta.avatarSize + 8,
              borderRadius: (meta.avatarSize + 8) / 2,
              borderColor,
            },
          ]}
        >
          <ProfileAvatar
            name={entry.name}
            avatarUrl={entry.avatarUrl}
            size={meta.avatarSize}
          />
        </View>
        {rank === 1 ? (
          <View style={styles.crown}>
            <MaterialCommunityIcons name="crown" size={16} color="#FBBF24" />
          </View>
        ) : null}
        <View style={styles.tierBadge}>
          <TierBadge tierId={entry.tier} size={meta.tierSize} />
        </View>
      </View>
      <Text style={[styles.name, rank === 1 && styles.nameFirst]} numberOfLines={1}>
        {entry.name}
        {isMe ? " (You)" : ""}
      </Text>
      <Text style={styles.score}>{entry.totalPoints.toLocaleString()}</Text>
    </View>
  )
}

function EmptySlot({ rank }: { rank: 1 | 2 | 3 }) {
  const meta = PODIUM_META[rank]
  const size = meta.avatarSize

  return (
    <View style={[styles.slot, { marginBottom: meta.lift }]}>
      <Text style={styles.ordinal}>{meta.ordinal}</Text>
      <View
        style={[
          styles.avatarRing,
          styles.avatarEmpty,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="person-outline" size={24} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyName}>—</Text>
      <Text style={styles.score}>0</Text>
    </View>
  )
}

export function LeaderboardPodium({ entries, currentUserId }: LeaderboardPodiumProps) {
  const topThree = entries.slice(0, 3)

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {PODIUM_ORDER.map((index) => {
          const entry = topThree[index]
          const rank = (index + 1) as 1 | 2 | 3
          return entry ? (
            <PodiumSlot
              key={entry.studentId}
              entry={entry}
              rank={rank}
              isMe={entry.studentId === currentUserId}
            />
          ) : (
            <EmptySlot key={rank} rank={rank} />
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
  },
  slot: {
    flex: 1,
    alignItems: "center",
    maxWidth: 118,
  },
  ordinal: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  avatarOuter: {
    position: "relative",
    marginBottom: 10,
  },
  avatarRing: {
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarEmpty: {
    backgroundColor: colors.borderLight,
  },
  crown: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  tierBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    backgroundColor: colors.card,
    borderRadius: 999,
    padding: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    width: "100%",
  },
  nameFirst: {
    fontSize: 14,
  },
  emptyName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 2,
  },
  score: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
})
