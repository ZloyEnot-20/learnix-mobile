import React, { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import Svg, { G, Path } from "react-native-svg"
import type { LevelWordStats } from "../lib/learned-vocabulary"
import { colors, radius, shadow, spacing, typography } from "../theme/tokens"

const LEVEL_COLORS: Record<string, string> = {
  A1: "#10B981",
  A2: "#84CC16",
  B1: "#0EA5E9",
  B2: "#F59E0B",
  C1: "#F43F5E",
  C2: "#A855F7",
}

const SIZE = 260
const CX = SIZE / 2
const CY = SIZE / 2 + 8
const OUTER_R = 108
const INNER_R = 72
const SEGMENTS = 6
const START_ANGLE = Math.PI
const END_ANGLE = 0

function polar(r: number, angle: number): { x: number; y: number } {
  return {
    x: CX + r * Math.cos(angle),
    y: CY - r * Math.sin(angle),
  }
}

function arcPath(
  innerR: number,
  outerR: number,
  start: number,
  end: number,
): string {
  const o1 = polar(outerR, start)
  const o2 = polar(outerR, end)
  const i2 = polar(innerR, end)
  const i1 = polar(innerR, start)
  const large = end - start > Math.PI ? 1 : 0
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i1.x} ${i1.y}`,
    "Z",
  ].join(" ")
}

function fillEndAngle(start: number, span: number, ratio: number): number {
  if (ratio <= 0) return start
  if (ratio >= 1) return start - span
  return start - span * ratio
}

interface WordsLearnedArcProps {
  levels: LevelWordStats[]
  totalLearned: number
}

export function WordsLearnedArc({ levels, totalLearned }: WordsLearnedArcProps) {
  const segmentSpan = (START_ANGLE - END_ANGLE) / SEGMENTS
  const totalSpan = START_ANGLE - END_ANGLE

  const arcs = useMemo(() => {
    const totalWords = levels.reduce((sum, item) => sum + item.total, 0)
    const overallRatio =
      totalWords > 0 ? Math.min(1, totalLearned / totalWords) : 0
    const globalFillBoundary = START_ANGLE - totalSpan * overallRatio

    return levels.map((item, index) => {
      const segStart = START_ANGLE - index * segmentSpan
      const segEnd = segStart - segmentSpan
      const color = LEVEL_COLORS[item.level] ?? colors.primary

      let fillRatio = 0
      if (globalFillBoundary < segStart) {
        if (globalFillBoundary <= segEnd) {
          fillRatio = 1
        } else {
          fillRatio = (segStart - globalFillBoundary) / segmentSpan
        }
      }

      const fillEnd = fillEndAngle(segStart, segmentSpan, fillRatio)

      return {
        ...item,
        segStart,
        segEnd,
        fillEnd,
        ratio: fillRatio,
        color,
        midAngle: segStart - segmentSpan / 2,
      }
    })
  }, [levels, segmentSpan, totalLearned, totalSpan])

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Words learned</Text>
      <View style={styles.chartWrap}>
        <Svg width={SIZE} height={SIZE / 2 + 24} viewBox={`0 0 ${SIZE} ${SIZE / 2 + 24}`}>
          <G>
            {arcs.map((seg) => (
              <G key={`bg-${seg.level}`}>
                <Path
                  d={arcPath(INNER_R, OUTER_R, seg.segStart, seg.segEnd)}
                  fill={`${seg.color}22`}
                  stroke={colors.card}
                  strokeWidth={2}
                />
                {seg.ratio > 0 ? (
                  <Path
                    d={arcPath(INNER_R, OUTER_R, seg.segStart, seg.fillEnd)}
                    fill={seg.color}
                  />
                ) : null}
              </G>
            ))}
          </G>
        </Svg>
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerValue}>{totalLearned}</Text>
          <Text style={styles.centerSub}>words learned</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {arcs.map((seg) => (
          <View key={seg.level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLevel}>{seg.level}</Text>
            <Text style={styles.legendCount}>
              {seg.learned}
              {seg.total > 0 ? `/${seg.total}` : ""}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>
        A word is learned after 5 correct answers in review
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.section,
    ...shadow.card,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chartWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: SIZE / 2 + 36,
    marginBottom: spacing.sm,
  },
  centerLabel: {
    position: "absolute",
    bottom: 8,
    alignItems: "center",
    width: "100%",
  },
  centerValue: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 40,
  },
  centerSub: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLevel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  legendCount: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 16,
  },
})
