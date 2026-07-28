import React from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { Skeleton, SkeletonCard } from "../ui/Skeleton"
import { colors, radius, spacing } from "../../theme/tokens"

export function TeacherHomeSkeleton() {
  return (
    <View style={styles.pad}>
      <View style={styles.headerRow}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.flex}>
          <Skeleton width={140} height={16} />
          <Skeleton width={80} height={12} style={styles.gapSm} />
        </View>
        <Skeleton width={40} height={40} borderRadius={12} />
      </View>

      <View style={styles.statsRow}>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={24} style={styles.gapSm} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="30%" height={24} style={styles.gapSm} />
        </SkeletonCard>
      </View>
      <View style={styles.statsRow}>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={24} style={styles.gapSm} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="40%" height={24} style={styles.gapSm} />
        </SkeletonCard>
      </View>

      <Skeleton width={80} height={14} style={styles.gapLg} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleedScroll} contentContainerStyle={styles.servicesRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={96} height={96} borderRadius={radius.card} />
        ))}
      </ScrollView>

      <Skeleton width={100} height={14} style={styles.gapLg} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleedScroll} contentContainerStyle={styles.groupRow}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={124} height={124} borderRadius={radius.card} />
        ))}
      </ScrollView>

      <Skeleton width={100} height={14} style={styles.gapLg} />
      <View style={styles.daysRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={52} height={56} borderRadius={radius.md} />
        ))}
      </View>

      <SkeletonCard style={styles.lessonCard}>
        <Skeleton width="65%" height={16} />
        <Skeleton width="45%" height={12} style={styles.gapSm} />
      </SkeletonCard>
      <SkeletonCard style={styles.lessonCard}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={12} style={styles.gapSm} />
      </SkeletonCard>
    </View>
  )
}

export function TeacherHomeworkMatrixSkeleton() {
  return (
    <View style={styles.pad}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width={120} height={56} borderRadius={radius.card} style={styles.groupChip} />
        ))}
      </ScrollView>
      <View style={styles.statsRow}>
        <Skeleton height={64} borderRadius={radius.card} style={styles.flex} />
        <Skeleton height={64} borderRadius={radius.card} style={styles.flex} />
      </View>
      <Skeleton height={28} borderRadius={radius.md} style={styles.gapMd} />
      <Skeleton height={280} borderRadius={radius.card} />
    </View>
  )
}

export function TeacherListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.pad}>
      <View style={styles.headerRow}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.flex}>
          <Skeleton width={120} height={16} />
          <Skeleton width={160} height={12} style={styles.gapSm} />
        </View>
      </View>
      <View style={styles.folderRow}>
        <Skeleton height={120} borderRadius={radius.card} style={styles.flex} />
        <Skeleton height={120} borderRadius={radius.card} style={styles.flex} />
      </View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.listRow}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} style={styles.gapSm} />
        </SkeletonCard>
      ))}
    </View>
  )
}

export function TeacherDetailSkeleton() {
  return (
    <View style={styles.pad}>
      <Skeleton width={44} height={44} borderRadius={radius.sm} style={styles.gapMd} />
      <Skeleton width="70%" height={24} style={styles.gapSm} />
      <Skeleton width="50%" height={14} style={styles.gapLg} />
      <View style={[styles.statsRow, styles.gapMd]}>
        <Skeleton height={44} borderRadius={radius.button} style={styles.flex} />
        <Skeleton height={44} borderRadius={radius.button} style={styles.flex} />
      </View>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} style={styles.listRow}>
          <View style={styles.headerRow}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={styles.flex}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={12} style={styles.gapSm} />
            </View>
          </View>
        </SkeletonCard>
      ))}
    </View>
  )
}

export function TeacherAttendanceSkeleton() {
  return (
    <View style={styles.pad}>
      <Skeleton width={44} height={44} borderRadius={radius.sm} style={styles.gapMd} />
      <Skeleton width="65%" height={24} style={styles.gapSm} />
      <Skeleton width="45%" height={14} style={styles.gapLg} />
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} style={styles.listRow}>
          <Skeleton width="40%" height={14} />
          <View style={[styles.statsRow, styles.gapMd]}>
            <Skeleton height={36} borderRadius={radius.button} style={styles.flex} />
            <Skeleton height={36} borderRadius={radius.button} style={styles.flex} />
            <Skeleton height={36} borderRadius={radius.button} style={styles.flex} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  )
}

export function TeacherStudentDetailSkeleton() {
  return (
    <View style={styles.pad}>
      <View style={styles.headerRow}>
        <Skeleton width={64} height={64} borderRadius={32} />
        <View style={styles.flex}>
          <Skeleton width="70%" height={20} />
          <Skeleton width="45%" height={13} style={styles.gapSm} />
          <Skeleton width="55%" height={12} style={styles.gapSm} />
        </View>
      </View>
      <View style={[styles.statsRow, styles.gapMd]}>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="50%" height={12} />
          <Skeleton width="40%" height={22} style={styles.gapSm} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="50%" height={12} />
          <Skeleton width="40%" height={22} style={styles.gapSm} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="50%" height={12} />
          <Skeleton width="40%" height={22} style={styles.gapSm} />
        </SkeletonCard>
      </View>
      <SkeletonCard style={styles.listRow}>
        <View style={styles.headerRow}>
          <Skeleton width={36} height={36} borderRadius={10} />
          <View style={styles.flex}>
            <Skeleton width={130} height={16} />
            <Skeleton width={160} height={12} style={styles.gapSm} />
          </View>
          <Skeleton width={44} height={28} borderRadius={8} />
        </View>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.statsRow, styles.gapMd]}>
            <Skeleton width={110} height={14} />
            <View style={styles.flex} />
            <Skeleton width={44} height={28} borderRadius={8} />
          </View>
        ))}
      </SkeletonCard>
      <SkeletonCard style={styles.listRow}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="80%" height={12} style={styles.gapSm} />
        <Skeleton width="65%" height={12} style={styles.gapSm} />
      </SkeletonCard>
    </View>
  )
}

export function TeacherStudentModalSkeleton() {
  return (
    <View>
      <View style={styles.headerRow}>
        <Skeleton width={52} height={52} borderRadius={26} />
        <View style={styles.flex}>
          <Skeleton width="65%" height={18} />
          <Skeleton width="40%" height={12} style={styles.gapSm} />
        </View>
      </View>
      <View style={[styles.statsRow, styles.gapMd]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} style={styles.statCard}>
            <Skeleton width="55%" height={10} />
            <Skeleton width="45%" height={18} style={styles.gapSm} />
          </SkeletonCard>
        ))}
      </View>
      <SkeletonCard style={styles.listRow}>
        <Skeleton width={80} height={12} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.statsRow, styles.gapMd]}>
            <Skeleton width={70} height={12} />
            <View style={styles.flex} />
            <Skeleton width="45%" height={14} />
          </View>
        ))}
      </SkeletonCard>
    </View>
  )
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: { flex: 1, marginBottom: spacing.sm, minHeight: 100 },
  servicesRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.lg,
  },
  groupRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.lg,
  },
  bleedScroll: { marginHorizontal: -spacing.screen },
  daysRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  folderRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  groupScroll: { marginBottom: spacing.md },
  groupChip: { marginRight: spacing.sm },
  lessonCard: { marginBottom: spacing.sm },
  listRow: { marginBottom: spacing.sm },
  flex: { flex: 1 },
  gapSm: { marginTop: spacing.sm },
  gapMd: { marginTop: spacing.md },
  gapLg: { marginBottom: spacing.lg },
})
