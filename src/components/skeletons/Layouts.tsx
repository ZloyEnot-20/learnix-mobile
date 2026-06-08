import React from "react"
import { StyleSheet, View } from "react-native"
import { Skeleton, SkeletonCard } from "../ui/Skeleton"
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

export function HomeSkeleton() {
  return (
    <View>
      <View style={styles.section}>
        <LevelScaleSkeleton />
      </View>
      <View style={styles.statsRow}>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width={40} height={28} style={styles.center} />
          <Skeleton width={64} height={11} style={[styles.center, styles.gapSm]} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width={40} height={28} style={styles.center} />
          <Skeleton width={64} height={11} style={[styles.center, styles.gapSm]} />
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
        <Skeleton circle height={72} />
        <Skeleton width={140} height={20} style={styles.gapMd} />
        <Skeleton width={180} height={13} style={styles.gapSm} />
        <Skeleton width={72} height={24} borderRadius={999} style={styles.gapSm} />
      </View>
      <SkeletonCard style={styles.gapMd}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.infoRow}>
            <Skeleton width={56} height={13} />
            <Skeleton width={100} height={13} />
          </View>
        ))}
      </SkeletonCard>
      <View style={[styles.statsRow, styles.gapMd]}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} style={styles.statCard}>
            <Skeleton width={32} height={22} style={styles.center} />
            <Skeleton width={48} height={10} style={[styles.center, styles.gapSm]} />
          </SkeletonCard>
        ))}
      </View>
      <Skeleton width={110} height={18} style={styles.gapMd} />
      {Array.from({ length: 4 }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
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
  },
  tabBone: { flex: 1 },
  gamesRoot: { gap: 0 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
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
  notifRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  tabShell: { flex: 1, padding: spacing.screen, backgroundColor: colors.background },
})
