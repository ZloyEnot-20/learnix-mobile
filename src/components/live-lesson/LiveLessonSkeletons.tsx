import React from "react"
import { StyleSheet, View } from "react-native"
import { Skeleton, SkeletonCard } from "../ui/Skeleton"
import { colors, radius, spacing } from "../../theme/tokens"

export function LiveLessonJoinSkeleton() {
  return (
    <View style={styles.wrap}>
      <Skeleton width="60%" height={22} />
      <Skeleton width="80%" height={14} style={styles.gap} />
      <SkeletonCard style={styles.card}>
        <Skeleton height={48} borderRadius={12} />
        <Skeleton width="40%" height={44} borderRadius={12} style={styles.gap} />
      </SkeletonCard>
    </View>
  )
}

export function LiveLessonRoomSkeleton() {
  return (
    <View style={styles.wrap}>
      <Skeleton width="50%" height={18} />
      <SkeletonCard style={styles.card}>
        <Skeleton width="45%" height={14} />
        <Skeleton height={16} style={styles.gap} />
        <Skeleton height={16} style={styles.gapSm} />
        <Skeleton height={16} style={styles.gapSm} />
        <Skeleton height={120} borderRadius={radius.card} style={styles.gap} />
      </SkeletonCard>
      <Skeleton height={48} borderRadius={12} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.screen, backgroundColor: colors.background, gap: spacing.md },
  card: { padding: spacing.md, gap: spacing.sm },
  gap: { marginTop: spacing.md },
  gapSm: { marginTop: spacing.sm },
})
