import React from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { Skeleton, SkeletonCard } from "../ui/Skeleton"
import { radius, spacing } from "../../theme/tokens"

export function AdminHomeSkeleton() {
  return (
    <View style={styles.pad}>
      <View style={styles.statsRow}>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="40%" height={28} style={styles.gapSm} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="35%" height={28} style={styles.gapSm} />
        </SkeletonCard>
      </View>
      <View style={styles.statsRow}>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="45%" height={28} style={styles.gapSm} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="30%" height={28} style={styles.gapSm} />
        </SkeletonCard>
      </View>
      <View style={styles.statsRow}>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={28} style={styles.gapSm} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="65%" height={14} />
          <Skeleton width="40%" height={28} style={styles.gapSm} />
        </SkeletonCard>
      </View>

      <Skeleton width={80} height={14} style={styles.gapLg} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleedScroll}
        contentContainerStyle={styles.servicesRow}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={96} height={96} borderRadius={radius.card} />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { padding: spacing.screen, gap: spacing.md },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: { flex: 1, minHeight: 96 },
  gapSm: { marginTop: spacing.sm },
  gapLg: { marginTop: spacing.sm },
  bleedScroll: { marginHorizontal: -spacing.screen },
  servicesRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
  },
})
