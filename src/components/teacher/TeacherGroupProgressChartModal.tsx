import React, { useMemo } from "react"
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg"
import { Ionicons } from "@expo/vector-icons"
import { percentColors } from "../../lib/teacher-homework"
import type { GroupLessonProgressPoint } from "../../lib/teacher-homework-matrix"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { teacherColors } from "../../theme/teacher-tokens"

const CHART_HEIGHT = 196
const PADDING = { top: 16, right: 12, bottom: 36, left: 34 }
const MIN_POINT_SPACING = 56
const Y_TICKS = [0, 25, 50, 75, 100]

type PlotPoint = {
  x: number
  y: number
  percent: number
  dateLabel: string
}

function buildLineSegments(plotPoints: PlotPoint[]): string[] {
  if (plotPoints.length < 2) return []
  return [
    plotPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" "),
  ]
}

function ProgressChart({
  points,
  width,
}: {
  points: GroupLessonProgressPoint[]
  width: number
}) {
  const plotWidth = Math.max(width - spacing.screen * 2, points.length * MIN_POINT_SPACING)
  const innerWidth = plotWidth - PADDING.left - PADDING.right
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const lineSegments = useMemo(() => {
    if (points.length === 0) return [] as string[]

    const step = points.length === 1 ? 0 : innerWidth / (points.length - 1)
    const plotPoints: PlotPoint[] = []

    points.forEach((point, index) => {
      if (point.averagePercent == null) return
      const x = PADDING.left + step * index
      const y = PADDING.top + innerHeight * (1 - point.averagePercent / 100)
      plotPoints.push({
        x,
        y,
        percent: point.averagePercent,
        dateLabel: point.dateLabel,
      })
    })

    return buildLineSegments(plotPoints)
  }, [points, innerWidth, innerHeight])

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width: plotWidth }}>
        <Svg width={plotWidth} height={CHART_HEIGHT}>
          {Y_TICKS.map((tick) => {
            const y = PADDING.top + innerHeight * (1 - tick / 100)
            return (
              <React.Fragment key={tick}>
                <Line
                  x1={PADDING.left}
                  y1={y}
                  x2={plotWidth - PADDING.right}
                  y2={y}
                  stroke={colors.borderLight}
                  strokeWidth={1}
                />
                <SvgText
                  x={PADDING.left - 8}
                  y={y + 4}
                  fontSize={10}
                  fill={colors.textMuted}
                  textAnchor="end"
                >
                  {tick}
                </SvgText>
              </React.Fragment>
            )
          })}

          {lineSegments.map((segment, index) => (
            <Path
              key={`line-${index}`}
              d={segment}
              stroke={teacherColors.accentDark}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {points.map((point, index) => {
            const step = points.length === 1 ? 0 : innerWidth / (points.length - 1)
            const x = PADDING.left + step * index
            const labelY = CHART_HEIGHT - 8

            if (point.averagePercent == null) {
              return (
                <React.Fragment key={point.dateKey}>
                  <Circle cx={x} cy={PADDING.top + innerHeight} r={4} fill={colors.border} />
                  <SvgText
                    x={x}
                    y={labelY}
                    fontSize={10}
                    fill={colors.textMuted}
                    textAnchor="middle"
                  >
                    {point.dateLabel}
                  </SvgText>
                </React.Fragment>
              )
            }

            const palette = percentColors(point.averagePercent)
            const y = PADDING.top + innerHeight * (1 - point.averagePercent / 100)

            return (
              <React.Fragment key={point.dateKey}>
                <Circle cx={x} cy={y} r={6} fill={palette.bg} />
                <Circle cx={x} cy={y} r={6} fill="none" stroke="#FFFFFF" strokeWidth={2} />
                <SvgText
                  x={x}
                  y={y - 10}
                  fontSize={10}
                  fill={palette.bg}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {point.averagePercent}%
                </SvgText>
                <SvgText
                  x={x}
                  y={labelY}
                  fontSize={10}
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  {point.dateLabel}
                </SvgText>
              </React.Fragment>
            )
          })}
        </Svg>
      </View>
    </ScrollView>
  )
}

export function TeacherGroupProgressChartContent({
  groupName,
  points,
}: {
  groupName: string
  points: GroupLessonProgressPoint[]
}) {
  const { width } = useWindowDimensions()
  const scoredCount = points.filter((point) => point.averagePercent != null).length

  return (
    <View style={styles.body}>
      <Text style={styles.subtitle} numberOfLines={1}>
        {groupName}
      </Text>

      {points.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="bar-chart-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No homework lessons yet</Text>
          <Text style={styles.emptyText}>Assign homework to see progress after each lesson</Text>
        </View>
      ) : scoredCount === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="time-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Waiting for scores</Text>
          <Text style={styles.emptyText}>
            {points.length} lesson{points.length === 1 ? "" : "s"} with homework, no completed work yet
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.chartCard}>
            <ProgressChart points={points} width={width} />
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#34C759" }]} />
              <Text style={styles.legendText}>≥75%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#FFCC00" }]} />
              <Text style={styles.legendText}>50–74%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#FF3B30" }]} />
              <Text style={styles.legendText}>&lt;50%</Text>
            </View>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.md },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    ...typography.label,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
})
