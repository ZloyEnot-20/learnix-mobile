import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { Skeleton, SkeletonCard } from "../ui/Skeleton"
import { colors, spacing } from "../../theme/tokens"

export function AdminListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.pad}>
      <Skeleton width="100%" height={44} borderRadius={12} />
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.row}>
          <View style={styles.rowInner}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={styles.flex}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={12} style={styles.gapSm} />
            </View>
          </View>
        </SkeletonCard>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { padding: spacing.screen, gap: spacing.md },
  row: { padding: spacing.md },
  rowInner: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
  gapSm: { marginTop: spacing.sm },
})
