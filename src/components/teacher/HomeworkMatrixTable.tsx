import React from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  MATRIX_ROW_HEIGHT,
  MATRIX_STUDENT_COL_WIDTH,
  MATRIX_SUBHEADER_HEIGHT,
  cellPalette,
  type HomeworkMatrixColumn,
  type HomeworkMatrixRow,
} from "../../lib/teacher-homework-matrix"
import { subjectFolderMeta, teacherColors } from "../../theme/teacher-tokens"
import { colors, radius, spacing, typography } from "../../theme/tokens"

const TABLE_THEME = {
  wrap: "#EFF6FF",
  header: "#93C5FD",
  headerText: "#1E3A8A",
  rowAlt: "#F8FAFF",
  border: "#BFDBFE",
}

type HomeworkMatrixTableProps = {
  columns: HomeworkMatrixColumn[]
  rows: HomeworkMatrixRow[]
  onCellPress: (row: HomeworkMatrixRow, columnIndex: number) => void
}

function MatrixCell({
  folder,
  percent,
  submission,
  onPress,
}: {
  folder: HomeworkMatrixColumn["folder"]
  percent: number | null
  submission: HomeworkMatrixRow["cells"][0]["submission"]
  onPress: () => void
}) {
  const meta = subjectFolderMeta[folder]
  const palette = cellPalette(percent, submission?.status ?? undefined)
  const showPercent = percent != null

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
    >
      <View
        style={[
          styles.cellCircle,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
          },
        ]}
      >
        <Ionicons
          name={(meta?.icon ?? "document-text") as keyof typeof Ionicons.glyphMap}
          size={12}
          color={showPercent ? palette.text : meta?.color ?? colors.textMuted}
          style={styles.cellIcon}
        />
        <Text style={[styles.cellPercent, { color: palette.text }]}>
          {showPercent
            ? percent
            : submission?.status === "in_progress" || submission?.status === "paused"
              ? "…"
              : "—"}
        </Text>
      </View>
    </Pressable>
  )
}

export function HomeworkMatrixTable({ columns, rows, onCellPress }: HomeworkMatrixTableProps) {
  const { width: screenWidth } = useWindowDimensions()
  const tableWidth = screenWidth - spacing.screen * 2
  const dataWidth = Math.max(0, tableWidth - MATRIX_STUDENT_COL_WIDTH)

  if (columns.length === 0) {
    return (
      <View style={[styles.empty, { width: tableWidth }]}>
        <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
        <Text style={styles.emptyText}>No homework for this date</Text>
      </View>
    )
  }

  return (
    <View style={[styles.wrap, { width: tableWidth }]}>
      <View style={styles.frozenCol}>
        <View style={[styles.cornerHeader, { height: MATRIX_SUBHEADER_HEIGHT }]}>
          <Ionicons name="people" size={14} color={TABLE_THEME.headerText} />
          <Text style={styles.cornerLabel}>Students</Text>
        </View>
        {rows.map((row, index) => (
          <View
            key={row.student.id}
            style={[
              styles.studentRow,
              { height: MATRIX_ROW_HEIGHT },
              index % 2 === 1 && styles.studentRowAlt,
            ]}
          >
            <Text style={styles.rowIndex}>{index + 1}</Text>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {row.student.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? "")
                  .join("")}
              </Text>
            </View>
            <Text style={styles.studentName} numberOfLines={1}>
              {row.student.name.split(" ")[0]}{" "}
              {row.student.name.split(" ").slice(1).map((p) => `${p[0]}.`).join(" ")}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.dataArea, { width: dataWidth }]}>
        <View style={[styles.taskHeaderRow, { height: MATRIX_SUBHEADER_HEIGHT }]}>
          {columns.map((col) => (
            <View key={col.homework.id} style={[styles.taskHeaderCell, { flex: 1 }]}>
              <Text style={styles.taskHeaderText} numberOfLines={1}>
                {col.taskLabel}
              </Text>
            </View>
          ))}
        </View>

        {rows.map((row, rowIndex) => (
          <View
            key={row.student.id}
            style={[
              styles.dataRow,
              { height: MATRIX_ROW_HEIGHT },
              rowIndex % 2 === 1 && styles.dataRowAlt,
            ]}
          >
            {row.cells.map((cell, colIndex) => (
              <MatrixCell
                key={cell.homework.id}
                folder={columns[colIndex]?.folder ?? "grammar"}
                percent={cell.percent}
                submission={cell.submission}
                onPress={() => onCellPress(row, colIndex)}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: TABLE_THEME.wrap,
    borderWidth: 1,
    borderColor: TABLE_THEME.border,
    marginHorizontal: spacing.screen,
    alignSelf: "center",
  },
  frozenCol: {
    width: MATRIX_STUDENT_COL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: TABLE_THEME.border,
    backgroundColor: TABLE_THEME.wrap,
  },
  cornerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    backgroundColor: TABLE_THEME.header,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: TABLE_THEME.border,
  },
  cornerLabel: {
    ...typography.caption,
    color: TABLE_THEME.headerText,
    fontWeight: "800",
    fontSize: 11,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TABLE_THEME.border,
    gap: 4,
    backgroundColor: "#FFFCF0",
  },
  studentRowAlt: {
    backgroundColor: TABLE_THEME.rowAlt,
  },
  rowIndex: {
    ...typography.caption,
    color: TABLE_THEME.headerText,
    width: 12,
    fontSize: 10,
    opacity: 0.7,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: teacherColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 9, fontWeight: "800", color: colors.text },
  studentName: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  dataArea: { flexGrow: 1 },
  taskHeaderRow: {
    flexDirection: "row",
    backgroundColor: TABLE_THEME.header,
    borderBottomWidth: 1,
    borderBottomColor: TABLE_THEME.border,
  },
  taskHeaderCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: TABLE_THEME.border,
    paddingHorizontal: 4,
  },
  taskHeaderText: {
    ...typography.caption,
    color: TABLE_THEME.headerText,
    fontSize: 10,
    fontWeight: "800",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TABLE_THEME.border,
    backgroundColor: "#FFFCF0",
  },
  dataRowAlt: {
    backgroundColor: TABLE_THEME.rowAlt,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: TABLE_THEME.border,
  },
  cellPressed: { backgroundColor: "rgba(255, 224, 51, 0.35)" },
  cellCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  cellIcon: { marginBottom: 1 },
  cellPercent: { fontSize: 11, fontWeight: "900" },
  empty: {
    marginHorizontal: spacing.screen,
    backgroundColor: TABLE_THEME.wrap,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: TABLE_THEME.border,
    alignSelf: "center",
  },
  emptyText: { ...typography.bodySm, color: colors.textMuted },
})
