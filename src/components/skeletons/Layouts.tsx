import React from "react"
import { StyleSheet, View } from "react-native"
import { Skeleton, SkeletonCard } from "../ui/Skeleton"
import {
  getNotificationBannerReservedHeight,
  NOTIFICATION_BANNER_BOTTOM_GAP,
  NOTIFICATION_STACK_MIN_HEIGHT,
} from "../notification-banner-layout"
import { colors, radius, spacing } from "../../theme/tokens"

function HomeworkCardSkeleton() {
  return (
    <SkeletonCard style={styles.homeworkCard}>
      <View style={styles.homeworkTop}>
        <Skeleton width={34} height={34} borderRadius={10} />
        <View style={styles.homeworkMain}>
          <View style={styles.row}>
            <Skeleton height={14} style={styles.flex} />
            <Skeleton width={52} height={18} borderRadius={6} />
          </View>
          <Skeleton height={12} width="85%" style={styles.gapSm} />
          <View style={[styles.row, styles.gapSm]}>
            <Skeleton width={72} height={11} borderRadius={6} />
            <Skeleton width={48} height={11} borderRadius={6} />
          </View>
        </View>
      </View>
      <View style={styles.divider} />
      <Skeleton width={64} height={12} style={styles.alignEnd} />
    </SkeletonCard>
  )
}

export function HomeworkListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View>
          <Skeleton width={160} height={12} />
        </View>
        <Skeleton width={72} height={24} borderRadius={999} />
      </View>
      <View style={[styles.tabsSkeleton, styles.gapMd]}>
        <Skeleton height={32} borderRadius={8} style={styles.tabBone} />
        <Skeleton height={32} borderRadius={8} style={styles.tabBone} />
      </View>
      {Array.from({ length: count }).map((_, i) => (
        <HomeworkCardSkeleton key={i} />
      ))}
    </View>
  )
}

export function NotificationBannerSkeleton() {
  const stackHeight = NOTIFICATION_STACK_MIN_HEIGHT
  const sectionHeight = getNotificationBannerReservedHeight()
  return (
    <View
      style={[
        styles.section,
        styles.notificationSection,
        { minHeight: sectionHeight, marginBottom: NOTIFICATION_BANNER_BOTTOM_GAP },
      ]}
    >
      <Skeleton width={130} height={18} style={styles.gapSm} />
      <View style={[styles.notificationStack, { height: stackHeight }]}>
        {[2, 1, 0].map((layer) => (
          <SkeletonCard
            key={layer}
            style={[
              styles.notificationBanner,
              styles.notificationStackLayer,
              layer === 2 && styles.notificationStackBack2,
              layer === 1 && styles.notificationStackBack1,
            ]}
          >
            <View style={styles.notificationRow}>
              <Skeleton width={44} height={44} borderRadius={12} />
              <View style={styles.notificationText}>
                <Skeleton width={layer === 0 ? 180 : 160} height={16} />
                <Skeleton width={layer === 0 ? "90%" : "80%"} height={12} style={styles.gapSm} />
                {layer === 0 ? <Skeleton width={56} height={10} style={styles.gapSm} /> : null}
              </View>
            </View>
          </SkeletonCard>
        ))}
      </View>
    </View>
  )
}

export function HomeSkeleton() {
  return (
    <View>
      <View style={styles.section}>
        <LevelScaleSkeleton />
      </View>
      <View style={styles.section}>
        <Skeleton width={140} height={18} style={styles.gapMd} />
        <SkeletonCard style={styles.mockTestBanner}>
          <View style={styles.mockTestRow}>
            <Skeleton width={44} height={44} borderRadius={12} />
            <View style={styles.mockTestText}>
              <Skeleton width={140} height={16} />
              <Skeleton width={200} height={12} style={styles.gapSm} />
            </View>
          </View>
          <View style={styles.mockSectionsRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.mockSectionItem}>
                <Skeleton width={40} height={40} borderRadius={12} />
                <Skeleton width={48} height={10} />
              </View>
            ))}
          </View>
          <Skeleton width={110} height={32} borderRadius={999} />
        </SkeletonCard>
      </View>
      <View style={styles.section}>
        <Skeleton width={130} height={18} style={styles.gapMd} />
        {Array.from({ length: 3 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </View>
    </View>
  )
}

export function ProfileSkeleton() {
  return (
    <View>
      <View style={styles.hero}>
        <Skeleton circle height={64} />
        <Skeleton width={140} height={20} style={styles.gapMd} />
        <Skeleton width={180} height={13} style={styles.gapSm} />
        <Skeleton width={160} height={13} style={styles.gapSm} />
        <Skeleton width={140} height={13} style={styles.gapSm} />
      </View>
      <SkeletonCard style={[styles.statsBarSkeleton, styles.gapMd]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.statCellSkeleton}>
            <Skeleton width={36} height={18} style={styles.center} />
            <Skeleton width={44} height={10} style={[styles.center, styles.gapSm]} />
          </View>
        ))}
      </SkeletonCard>
      <View style={[styles.row, styles.spaceBetween, styles.gapMd]}>
        <Skeleton width={110} height={18} />
        <Skeleton width={72} height={12} />
      </View>
      <SkeletonCard style={styles.gapMd}>
        <View style={styles.achievementsSkeletonRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.achievementSkeletonItem}>
              <Skeleton width={48} height={48} borderRadius={8} />
              <Skeleton width={40} height={8} style={styles.gapSm} />
            </View>
          ))}
        </View>
      </SkeletonCard>
      <SkeletonCard>
        {Array.from({ length: 5 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </SkeletonCard>
    </View>
  )
}

export function GamesSkeleton() {
  return (
    <View style={styles.gamesRoot}>
      <Skeleton width={220} height={13} />
      <View style={styles.section}>
        <LevelScaleSkeleton compact />
      </View>
      <Skeleton width={120} height={16} style={styles.gapMd} />
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} style={styles.levelCard}>
          <Skeleton width={36} height={20} />
          <Skeleton width={120} height={12} style={styles.gapSm} />
          <Skeleton height={6} borderRadius={999} style={styles.gapSm} />
          <Skeleton width={88} height={11} />
        </SkeletonCard>
      ))}
    </View>
  )
}

export function LevelScaleSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <SkeletonCard>
      <View style={[styles.row, styles.spaceBetween]}>
        <View style={styles.row}>
          <Skeleton width={28} height={28} borderRadius={8} />
          <Skeleton width={88} height={16} />
        </View>
        <Skeleton width={72} height={12} />
      </View>
      <View style={styles.row}>
        <Skeleton width={48} height={48} borderRadius={12} />
        <View style={styles.flex}>
          <Skeleton height={15} style={styles.flex} />
          <View style={[styles.row, styles.gapSm]}>
            <Skeleton width={64} height={18} borderRadius={999} />
            <Skeleton height={11} style={styles.flex} />
          </View>
        </View>
      </View>
      <View style={styles.gapMd}>
        <Skeleton height={10} borderRadius={999} />
        <Skeleton width={56} height={11} style={styles.alignEnd} />
      </View>
      {!compact && (
        <View style={styles.gapMd}>
          <Skeleton width={110} height={10} />
          <View style={styles.rowWrap}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width={52} height={22} borderRadius={999} />
            ))}
          </View>
        </View>
      )}
    </SkeletonCard>
  )
}

function ListRowSkeleton() {
  return (
    <SkeletonCard style={styles.listRow}>
      <Skeleton width={40} height={40} borderRadius={10} />
      <View style={styles.flex}>
        <Skeleton width="50%" height={14} />
        <Skeleton width="35%" height={11} style={styles.gapSm} />
      </View>
      <Skeleton width={48} height={16} />
    </SkeletonCard>
  )
}

export function ExerciseListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.exerciseCard}>
          <Skeleton width="75%" height={16} />
          <Skeleton width="55%" height={11} style={styles.gapSm} />
          <Skeleton width="90%" height={12} style={styles.gapSm} />
        </SkeletonCard>
      ))}
    </View>
  )
}

export function ExerciseScreenSkeleton() {
  return (
    <View style={styles.exerciseScreen}>
      <Skeleton width={80} height={14} style={styles.gapMd} />
      <Skeleton width="80%" height={22} />
      <Skeleton width="45%" height={12} style={styles.gapSm} />
      <SkeletonCard style={styles.gapLg}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="92%" height={14} style={styles.gapSm} />
        <Skeleton width="78%" height={14} style={styles.gapSm} />
        <View style={styles.gapMd}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={44} borderRadius={10} style={i > 0 ? styles.gapSm : undefined} />
          ))}
        </View>
      </SkeletonCard>
      <Skeleton height={48} borderRadius={12} style={styles.gapMd} />
    </View>
  )
}

export function IeltsReadingListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.ieltsList}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.ieltsListCard}>
          <View style={styles.ieltsListRow}>
            <Skeleton width={44} height={44} borderRadius={12} />
            <View style={styles.flex}>
              <Skeleton width="70%" height={16} />
              <Skeleton width="55%" height={12} style={styles.gapSm} />
              <View style={[styles.row, styles.gapSm]}>
                <Skeleton width={88} height={22} borderRadius={999} />
              </View>
            </View>
          </View>
        </SkeletonCard>
      ))}
    </View>
  )
}

export function IeltsReadingScreenSkeleton() {
  return (
    <View style={styles.exerciseScreen}>
      <View style={styles.readingTimerSkeletonRow}>
        <Skeleton width={96} height={36} borderRadius={999} />
      </View>
      <Skeleton height={10} borderRadius={999} style={styles.gapMd} />
      <SkeletonCard style={styles.gapLg}>
        <Skeleton width="45%" height={18} />
        <Skeleton width="100%" height={16} style={styles.gapSm} />
        <Skeleton width="95%" height={16} style={styles.gapSm} />
        <Skeleton width="88%" height={16} style={styles.gapSm} />
      </SkeletonCard>
      <SkeletonCard style={styles.gapLg}>
        <Skeleton width="35%" height={12} />
        <Skeleton width="100%" height={14} style={styles.gapSm} />
        <View style={styles.optionSkeletonRow}>
          <Skeleton height={44} borderRadius={10} style={styles.optionSkeleton} />
          <Skeleton height={44} borderRadius={10} style={styles.optionSkeleton} />
          <Skeleton height={44} borderRadius={10} style={styles.optionSkeleton} />
        </View>
      </SkeletonCard>
      <View style={styles.row}>
        <Skeleton height={48} borderRadius={12} style={styles.flex} />
        <Skeleton height={48} borderRadius={12} style={styles.flex} />
      </View>
    </View>
  )
}

export function VocabScreenSkeleton() {
  return (
    <View style={styles.exerciseScreen}>
      <Skeleton width="60%" height={22} />
      <Skeleton width="40%" height={12} style={styles.gapSm} />
      <SkeletonCard style={styles.gapLg}>
        <Skeleton width="100%" height={18} />
        <Skeleton width="70%" height={14} style={styles.gapSm} />
        <View style={[styles.statsRow, styles.gapMd]}>
          <Skeleton height={72} style={styles.flex} borderRadius={12} />
          <Skeleton height={72} style={styles.flex} borderRadius={12} />
        </View>
      </SkeletonCard>
    </View>
  )
}

export function PodcastScreenSkeleton() {
  return (
    <View style={styles.exerciseScreen}>
      <Skeleton width="55%" height={22} />
      <Skeleton width="35%" height={12} style={styles.gapSm} />
      <SkeletonCard style={[styles.gapLg, { alignItems: "center", paddingVertical: 24 }]}>
        <Skeleton width={56} height={56} borderRadius={28} />
        <Skeleton width="80%" height={20} style={styles.gapMd} />
        <Skeleton width="60%" height={14} style={styles.gapSm} />
      </SkeletonCard>
      <View style={[styles.gapLg, { alignItems: "center", paddingVertical: 32 }]}>
        <Skeleton width="100%" height={6} borderRadius={3} />
        <Skeleton width={72} height={72} borderRadius={36} style={styles.gapMd} />
        <Skeleton width="70%" height={14} />
      </View>
    </View>
  )
}

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      <Skeleton width={48} height={10} style={styles.gapSm} />
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.notifRow}>
          <Skeleton width={40} height={40} borderRadius={10} />
          <View style={styles.flex}>
            <Skeleton width="65%" height={14} />
            <Skeleton width="90%" height={12} style={styles.gapSm} />
            <Skeleton width={48} height={10} style={styles.gapSm} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  )
}

export function CacheManagerSkeleton() {
  return (
    <View style={styles.cacheSkeleton}>
      <Skeleton width={200} height={200} borderRadius={100} style={styles.cacheChartBone} />
      <View style={styles.cacheRows}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} style={styles.cacheRow}>
            <View style={styles.cacheRowTop}>
              <Skeleton width={36} height={36} borderRadius={10} />
              <View style={styles.flex}>
                <Skeleton width="55%" height={14} />
                <Skeleton width="80%" height={11} style={styles.gapSm} />
                <Skeleton height={6} borderRadius={999} style={styles.gapSm} />
              </View>
              <Skeleton width={56} height={28} borderRadius={8} />
            </View>
          </SkeletonCard>
        ))}
      </View>
      <Skeleton height={48} borderRadius={12} />
    </View>
  )
}

export function TabShellSkeleton() {
  return (
    <View style={styles.tabShell}>
      <Skeleton width={160} height={24} />
      <Skeleton width="55%" height={14} style={styles.gapSm} />
      <View style={styles.section}>
        <LevelScaleSkeleton />
      </View>
      <View style={styles.statsRow}>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width={36} height={24} style={styles.center} />
          <Skeleton width={56} height={10} style={[styles.center, styles.gapSm]} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width={36} height={24} style={styles.center} />
          <Skeleton width={56} height={10} style={[styles.center, styles.gapSm]} />
        </SkeletonCard>
      </View>
    </View>
  )
}

export function LeaderboardPodiumSkeleton() {
  return (
    <View style={styles.leaderboardPodium}>
      <View style={[styles.row, styles.podiumRow]}>
        {[68, 84, 64].map((size, i) => (
          <View key={i} style={styles.podiumSlot}>
            <Skeleton width={28} height={12} style={styles.center} />
            <View style={styles.podiumAvatarSkeleton}>
              <Skeleton circle height={size} />
              <Skeleton width={i === 1 ? 34 : 28} height={i === 1 ? 34 : 28} borderRadius={999} style={styles.tierBadgeSkeleton} />
            </View>
            <Skeleton width={72} height={13} style={styles.gapSm} />
            <Skeleton width={40} height={12} style={styles.gapSm} />
          </View>
        ))}
      </View>
    </View>
  )
}

export function LeaderboardListSkeleton() {
  return (
    <>
      <View style={styles.leaderboardListSkeleton}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={styles.leaderboardRowSkeleton}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <View style={styles.leaderboardAvatarSkeleton}>
              <Skeleton circle height={44} />
              <Skeleton width={24} height={24} borderRadius={12} style={styles.tierBadgeSkeleton} />
            </View>
            <View style={styles.flex}>
              <Skeleton height={15} style={styles.flex} />
              <Skeleton width={88} height={11} style={styles.gapSm} />
            </View>
            <Skeleton width={48} height={18} />
          </View>
        ))}
      </View>
      <SkeletonCard style={[styles.gapMd, { padding: spacing.md }]}>
        <View style={styles.row}>
          <Skeleton width={18} height={18} borderRadius={9} />
          <View style={styles.flex}>
            <Skeleton height={12} style={styles.flex} />
            <Skeleton height={12} width="80%" style={styles.gapSm} />
          </View>
        </View>
      </SkeletonCard>
    </>
  )
}

export function LeaderboardSkeleton() {
  return (
    <View>
      <LeaderboardPodiumSkeleton />
      <LeaderboardListSkeleton />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  homeworkCard: { marginBottom: 8, gap: 10 },
  homeworkTop: { flexDirection: "row", gap: 10 },
  homeworkMain: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  spaceBetween: { justifyContent: "space-between", width: "100%" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  flex: { flex: 1, minWidth: 0 },
  gapSm: { marginTop: 6 },
  gapMd: { marginTop: 12 },
  gapLg: { marginTop: 20 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginTop: 2,
  },
  alignEnd: { alignSelf: "flex-end" },
  tabsSkeleton: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.borderLight,
    borderRadius: radius.button,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabBone: { flex: 1 },
  gamesRoot: { gap: 0 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statsBarSkeleton: {
    flexDirection: "row",
    paddingVertical: spacing.md,
  },
  statCellSkeleton: { flex: 1, alignItems: "center" },
  achievementsSkeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  achievementSkeletonItem: { flex: 1, alignItems: "center" },
  mockTestBanner: { padding: spacing.md, gap: spacing.md },
  mockTestRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  mockTestText: { flex: 1, minWidth: 0 },
  mockSectionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  mockSectionItem: { flex: 1, alignItems: "center", gap: 6 },
  center: { alignSelf: "center" },
  hero: { alignItems: "center", marginBottom: 20 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  levelCard: { marginBottom: 10 },
  list: { gap: 8 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  exerciseCard: { marginBottom: 8 },
  exerciseScreen: { padding: 16 },
  readingTimerSkeletonRow: { alignItems: "flex-end" },
  ieltsList: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  ieltsListCard: { padding: spacing.md },
  ieltsListRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  optionSkeletonRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  optionSkeleton: { flex: 1 },
  notifRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  cacheSkeleton: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  cacheChartBone: {
    alignSelf: "center",
  },
  cacheRows: {
    gap: spacing.md,
  },
  cacheRow: {
    padding: spacing.md,
  },
  cacheRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  notificationBanner: {
    marginBottom: 0,
    height: 80,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.38)",
  },
  notificationSection: {},
  notificationStack: {
    position: "relative",
    marginBottom: 0,
  },
  notificationStackLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  notificationStackBack1: {
    transform: [{ translateY: 7 }, { scale: 0.97 }],
    opacity: 0.96,
  },
  notificationStackBack2: {
    transform: [{ translateY: 14 }, { scale: 0.94 }],
    opacity: 0.92,
  },
  notificationStackBack3: {
    transform: [{ translateY: 21 }, { scale: 0.91 }],
    opacity: 0.88,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  notificationText: { flex: 1 },
  tabShell: { flex: 1, padding: spacing.screen, backgroundColor: colors.background },
  leaderboardPodium: { paddingVertical: spacing.md, marginBottom: spacing.sm },
  podiumRow: { alignItems: "flex-end", justifyContent: "center" },
  podiumSlot: { flex: 1, alignItems: "center", maxWidth: 118 },
  leaderboardListSkeleton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  leaderboardRowSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  leaderboardAvatarSkeleton: {
    width: 50,
    height: 50,
    position: "relative",
  },
  podiumAvatarSkeleton: {
    position: "relative",
    alignItems: "center",
    marginBottom: 6,
  },
  tierBadgeSkeleton: {
    position: "absolute",
    right: -4,
    bottom: -4,
  },
})
