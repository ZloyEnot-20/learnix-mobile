import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Svg, { G, Path } from "react-native-svg"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheet } from "./ui/BottomSheet"
import { CacheManagerSkeleton } from "./skeletons/Layouts"
import {
  clearAppCache,
  clearCacheCategory,
  formatAppCacheSize,
  formatCacheBytes,
  getAppCacheBreakdown,
  type CacheBreakdownEntry,
  type CacheCategoryId,
} from "../lib/app-cache"
import { colors, radius, spacing } from "../theme/tokens"

const CHART_SIZE = 200
const CHART_CX = CHART_SIZE / 2
const CHART_CY = CHART_SIZE / 2
const OUTER_R = 88
const INNER_R = 58

const CATEGORY_ICONS: Record<CacheCategoryId, keyof typeof Ionicons.glyphMap> = {
  images: "image-outline",
  podcasts: "headset-outline",
  speaking: "mic-outline",
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function donutSlicePath(
  startDeg: number,
  endDeg: number,
  outerR: number,
  innerR: number,
): string {
  if (endDeg - startDeg >= 359.99) {
    endDeg = startDeg + 359.99
  }

  const outerStart = polar(CHART_CX, CHART_CY, outerR, startDeg)
  const outerEnd = polar(CHART_CX, CHART_CY, outerR, endDeg)
  const innerEnd = polar(CHART_CX, CHART_CY, innerR, endDeg)
  const innerStart = polar(CHART_CX, CHART_CY, innerR, startDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ")
}

function CacheDonutChart({
  entries,
  totalBytes,
}: {
  entries: CacheBreakdownEntry[]
  totalBytes: number
}) {
  const slices = useMemo(() => {
    if (totalBytes <= 0) return []

    let cursor = 0
    const nonZero = entries.filter((entry) => entry.bytes > 0)
    return nonZero.map((entry, index) => {
      const isLast = index === nonZero.length - 1
      const sweep = isLast
        ? 360 - cursor
        : (entry.bytes / totalBytes) * 360
      const start = cursor
      const end = cursor + sweep
      cursor = end
      return { entry, start, end }
    })
  }, [entries, totalBytes])

  return (
    <View style={styles.chartWrap}>
      <Svg width={CHART_SIZE} height={CHART_SIZE}>
        <G>
          {totalBytes <= 0 ? (
            <Path
              d={donutSlicePath(0, 359.99, OUTER_R, INNER_R)}
              fill={colors.borderLight}
            />
          ) : (
            slices.map(({ entry, start, end }) => (
              <Path
                key={entry.id}
                d={donutSlicePath(start, end, OUTER_R, INNER_R)}
                fill={entry.color}
              />
            ))
          )}
        </G>
      </Svg>
      <View style={styles.chartCenter} pointerEvents="none">
        <Text style={styles.chartTotal}>{formatCacheBytes(totalBytes)}</Text>
        <Text style={styles.chartTotalLabel}>Total cache</Text>
      </View>
    </View>
  )
}

function CacheCategoryRow({
  entry,
  totalBytes,
  clearing,
  onClear,
}: {
  entry: CacheBreakdownEntry
  totalBytes: number
  clearing: boolean
  onClear: () => void
}) {
  const percent = totalBytes > 0 ? Math.round((entry.bytes / totalBytes) * 100) : 0
  const barPercent = totalBytes > 0 && entry.bytes > 0 ? Math.max(4, percent) : 0

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: entry.color + "22" }]}>
          <Ionicons name={CATEGORY_ICONS[entry.id]} size={18} color={entry.color} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowTitle}>{entry.label}</Text>
            <Text style={styles.rowSize}>{formatCacheBytes(entry.bytes)}</Text>
          </View>
          <Text style={styles.rowDescription}>{entry.description}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${barPercent}%`, backgroundColor: entry.color }]} />
          </View>
          <Text style={styles.rowPercent}>{percent}% of total</Text>
        </View>
        <Pressable
          style={[styles.clearBtn, entry.bytes <= 0 && styles.clearBtnDisabled]}
          disabled={entry.bytes <= 0 || clearing}
          onPress={onClear}
        >
          {clearing ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Text style={[styles.clearBtnText, entry.bytes <= 0 && styles.clearBtnTextDisabled]}>
              Clear
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

type CacheManagerSheetProps = {
  visible: boolean
  onClose: () => void
  onCacheChanged?: () => void
}

export function CacheManagerSheet({ visible, onClose, onCacheChanged }: CacheManagerSheetProps) {
  const [entries, setEntries] = useState<CacheBreakdownEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [clearingId, setClearingId] = useState<CacheCategoryId | null>(null)
  const [clearingAll, setClearingAll] = useState(false)

  const refresh = useCallback(() => {
    setEntries(getAppCacheBreakdown())
    onCacheChanged?.()
  }, [onCacheChanged])

  useEffect(() => {
    if (!visible) {
      setLoading(false)
      return
    }

    setLoading(true)
    const task = InteractionManager.runAfterInteractions(() => {
      refresh()
      setLoading(false)
    })

    return () => task.cancel()
  }, [visible, refresh])

  const totalBytes = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.bytes, 0),
    [entries],
  )

  const confirmClear = (entry: CacheBreakdownEntry) => {
    Alert.alert(
      `Clear ${entry.label.toLowerCase()}?`,
      `Remove ${formatCacheBytes(entry.bytes)} of ${entry.description.toLowerCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setClearingId(entry.id)
            try {
              await clearCacheCategory(entry.id)
              refresh()
            } finally {
              setClearingId(null)
            }
          },
        },
      ],
    )
  }

  const confirmClearAll = () => {
    if (totalBytes <= 0) return
    Alert.alert(
      "Clear all cache?",
      `Remove ${formatAppCacheSize()} of cached media?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: async () => {
            setClearingAll(true)
            try {
              await clearAppCache()
              refresh()
            } finally {
              setClearingAll(false)
            }
          },
        },
      ],
    )
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Storage">
      {loading ? (
        <CacheManagerSkeleton />
      ) : (
        <View style={styles.content}>
          <CacheDonutChart entries={entries} totalBytes={totalBytes} />

          {totalBytes <= 0 ? (
            <Text style={styles.emptyText}>
              No cached media yet. Images, podcasts, and voice recordings will appear here after
              use.
            </Text>
          ) : (
            <View style={styles.list}>
              {entries.map((entry) => (
                <CacheCategoryRow
                  key={entry.id}
                  entry={entry}
                  totalBytes={totalBytes}
                  clearing={clearingId === entry.id}
                  onClear={() => confirmClear(entry)}
                />
              ))}
            </View>
          )}

          <Pressable
            style={[styles.clearAllBtn, (totalBytes <= 0 || clearingAll) && styles.clearAllBtnDisabled]}
            disabled={totalBytes <= 0 || clearingAll || loading}
            onPress={confirmClearAll}
          >
            {clearingAll ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.clearAllBtnText}>Clear all cache</Text>
            )}
          </Pressable>
        </View>
      )}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
  chartWrap: {
    alignSelf: "center",
    width: CHART_SIZE,
    height: CHART_SIZE,
    marginBottom: spacing.lg,
  },
  chartCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  chartTotal: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  chartTotalLabel: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  row: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  rowSize: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  rowDescription: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  barTrack: {
    marginTop: spacing.sm,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  rowPercent: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textMuted,
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.button,
    backgroundColor: colors.errorBg,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnDisabled: {
    backgroundColor: colors.borderLight,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
  },
  clearBtnTextDisabled: {
    color: colors.textMuted,
  },
  clearAllBtn: {
    backgroundColor: colors.error,
    borderRadius: radius.card,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  clearAllBtnDisabled: {
    opacity: 0.45,
  },
  clearAllBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.card,
  },
})
