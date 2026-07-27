import React from "react"
import { StyleSheet, View } from "react-native"
import { Skeleton, SkeletonCard } from "../ui/Skeleton"
import { colors, radius, spacing } from "../../theme/tokens"

export function TeacherHomeSkeleton() {
  return (
    <View style={styles.pad}>
      <Skeleton width={180} height={28} style={styles.gapSm} />
      <Skeleton width={220} height={14} style={styles.gapLg} />

      <Skeleton width={120} height={16} style={styles.gapSm} />
      <SkeletonCard style={styles.card}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="45%" height={12} style={styles.gapSm} />
        <Skeleton width={110} height={32} borderRadius={radius.button} style={styles.gapMd} />
      </SkeletonCard>
      <SkeletonCard style={styles.card}>
        <Skeleton width="65%" height={16} />
        <Skeleton width="40%" height={12} style={styles.gapSm} />
      </SkeletonCard>

      <Skeleton width={140} height={16} style={[styles.gapLg, styles.gapSm]} />
      <SkeletonCard style={styles.card}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="55%" height={12} style={styles.gapSm} />
      </SkeletonCard>

      <Skeleton width={130} height={16} style={[styles.gapLg, styles.gapSm]} />
      <SkeletonCard style={styles.card}>
        <View style={styles.row}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <View style={styles.flex}>
            <Skeleton width="75%" height={14} />
            <Skeleton width="90%" height={12} style={styles.gapSm} />
          </View>
        </View>
      </SkeletonCard>
    </View>
  )
}

export function TeacherListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.pad}>
      <Skeleton width={160} height={24} style={styles.gapLg} />
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.card}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} style={styles.gapSm} />
          <View style={[styles.row, styles.gapMd]}>
            <Skeleton width={72} height={12} />
            <Skeleton width={88} height={12} />
          </View>
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
      <View style={[styles.row, styles.gapMd]}>
        <Skeleton width={140} height={44} borderRadius={radius.button} style={styles.flex} />
        <Skeleton width={140} height={44} borderRadius={radius.button} style={styles.flex} />
      </View>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} style={styles.card}>
          <View style={styles.row}>
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
        <SkeletonCard key={i} style={styles.card}>
          <View style={styles.row}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <Skeleton width="40%" height={14} style={styles.flex} />
          </View>
          <View style={[styles.row, styles.gapMd]}>
            <Skeleton height={36} borderRadius={radius.button} style={styles.flex} />
            <Skeleton height={36} borderRadius={radius.button} style={styles.flex} />
            <Skeleton height={36} borderRadius={radius.button} style={styles.flex} />
          </View>
        </SkeletonCard>
      ))}
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
  card: {
    marginBottom: spacing.md,
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  gapSm: { marginTop: spacing.sm },
  gapMd: { marginTop: spacing.md },
  gapLg: { marginBottom: spacing.lg },
})
