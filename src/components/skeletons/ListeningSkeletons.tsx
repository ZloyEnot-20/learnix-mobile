import React from "react"
import { StyleSheet, View } from "react-native"
import { Skeleton, SkeletonCard } from "../ui/Skeleton"
import { spacing } from "../../theme/tokens"

export function IeltsListeningListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.card}>
          <View style={styles.row}>
            <Skeleton width={44} height={44} borderRadius={12} />
            <View style={styles.flex}>
              <Skeleton width="75%" height={16} />
              <Skeleton width="50%" height={12} style={styles.gapSm} />
              <View style={[styles.row, styles.gapSm]}>
                <Skeleton width={88} height={22} borderRadius={999} />
              </View>
            </View>
            <Skeleton width={72} height={36} borderRadius={999} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  )
}

export function IeltsListeningScreenSkeleton() {
  return (
    <View style={styles.screen}>
      <View style={styles.timerRow}>
        <Skeleton width={96} height={36} borderRadius={999} />
      </View>
      <Skeleton width="40%" height={18} style={styles.gapMd} />
      <Skeleton width="90%" height={14} style={styles.gapSm} />
      <SkeletonCard style={styles.gapLg}>
        <View style={styles.row}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={styles.flex}>
            <Skeleton width="50%" height={14} />
            <Skeleton width="35%" height={12} style={styles.gapSm} />
          </View>
        </View>
      </SkeletonCard>
      <SkeletonCard style={styles.gapLg}>
        <Skeleton width="100%" height={16} style={styles.gapSm} />
        <Skeleton width="92%" height={16} style={styles.gapSm} />
        <Skeleton width="60%" height={32} borderRadius={8} style={styles.gapSm} />
        <Skeleton width="85%" height={16} style={styles.gapSm} />
      </SkeletonCard>
      <View style={styles.row}>
        <Skeleton height={44} borderRadius={12} style={{ width: 44 }} />
        <Skeleton height={44} borderRadius={12} style={styles.flex} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: { padding: spacing.md },
  screen: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
  },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  flex: { flex: 1 },
  gapSm: { marginTop: spacing.sm },
  gapMd: { marginTop: spacing.md },
  gapLg: { marginTop: spacing.lg },
  timerRow: { alignItems: "flex-end", marginBottom: spacing.sm },
})
