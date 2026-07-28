import React, { useEffect, useState } from "react"
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheet } from "../ui/BottomSheet"
import { Spinner } from "../ui/Spinner"
import { formatYmd, formatYmdLabel, parseYmd } from "../../lib/date-ymd"
import { materialCartKey, type TeacherMaterialOption } from "../../lib/teacher-materials"
import { subjectFolderMeta, teacherColors } from "../../theme/teacher-tokens"
import { colors, radius, spacing, typography } from "../../theme/tokens"

type AssignConfirmModalProps = {
  visible: boolean
  onClose: () => void
  onConfirm: (dueDate: string) => void
  onRemoveItem: (item: TeacherMaterialOption) => void
  onPreviewItem?: (item: TeacherMaterialOption) => void
  submitting: boolean
  groupName: string
  cart: TeacherMaterialOption[]
  initialDueDate: string
}

export function AssignConfirmModal({
  visible,
  onClose,
  onConfirm,
  onRemoveItem,
  onPreviewItem,
  submitting,
  groupName,
  cart,
  initialDueDate,
}: AssignConfirmModalProps) {
  const { height: windowHeight } = useWindowDimensions()
  const sheetBodyHeight = Math.min(windowHeight * 0.78, windowHeight - 96)

  const [dueDate, setDueDate] = useState(initialDueDate)
  const [pickerDate, setPickerDate] = useState(() => parseYmd(initialDueDate))
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (visible) {
      setDueDate(initialDueDate)
      setPickerDate(parseYmd(initialDueDate))
      setShowDatePicker(false)
    }
  }, [visible, initialDueDate])

  useEffect(() => {
    if (visible && cart.length === 0) onClose()
  }, [visible, cart.length, onClose])

  const canConfirm = Boolean(dueDate.trim()) && cart.length > 0

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false)
    if (event.type === "dismissed" || !selected) return
    setPickerDate(selected)
    setDueDate(formatYmd(selected))
  }

  const openDatePicker = () => {
    if (submitting) return
    setPickerDate(parseYmd(dueDate))
    setShowDatePicker(true)
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Confirm assignment"
      showCloseButton
      enableSwipeToClose={!submitting}
      contentStyle={styles.sheetContent}
    >
      <View style={[styles.body, { height: sheetBodyHeight }]}>
        <View style={styles.groupCard}>
          <View style={styles.groupIconWrap}>
            <Ionicons name="people" size={20} color={teacherColors.accent} />
          </View>
          <View style={styles.groupText}>
            <Text style={styles.groupName} numberOfLines={1}>
              {groupName}
            </Text>
            <Text style={styles.summary}>
              {cart.length} task{cart.length === 1 ? "" : "s"} selected
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Selected tasks</Text>
        <ScrollView
          style={styles.taskScroll}
          contentContainerStyle={styles.taskScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {cart.map((item) => {
            const meta = subjectFolderMeta[item.folder]
            return (
              <View key={materialCartKey(item)} style={styles.taskCard}>
                <View style={[styles.taskIcon, { backgroundColor: meta?.bg ?? colors.borderLight }]}>
                  <Ionicons
                    name={(meta?.icon ?? "document-text") as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={meta?.color ?? colors.textSecondary}
                  />
                </View>
                <View style={styles.taskBody}>
                  <Text style={styles.taskTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.taskMeta} numberOfLines={1}>
                    {meta?.label ?? item.folder}
                  </Text>
                </View>
                {onPreviewItem ? (
                  <Pressable
                    onPress={() => onPreviewItem(item)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.previewBtn, pressed && styles.actionBtnPressed]}
                    accessibilityLabel="Preview test"
                  >
                    <Ionicons name="eye-outline" size={18} color={teacherColors.accent} />
                  </Pressable>
                ) : null}
                {!submitting ? (
                  <Pressable
                    onPress={() => onRemoveItem(item)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.actionBtnPressed]}
                    accessibilityLabel="Remove task"
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            )
          })}
        </ScrollView>

        <View style={styles.footerBlock}>
          <Pressable
            onPress={openDatePicker}
            disabled={submitting}
            style={({ pressed }) => [styles.dueRow, pressed && !submitting && styles.dueRowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Choose due date"
          >
            <Text style={styles.dueLabel}>Due date</Text>
            <View style={styles.dueValueWrap}>
              <Ionicons name="calendar-outline" size={16} color={teacherColors.accent} />
              <Text style={styles.dueValue}>{formatYmdLabel(dueDate)}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          {showDatePicker ? (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
              {Platform.OS === "ios" ? (
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  style={({ pressed }) => [styles.pickerDoneBtn, pressed && styles.actionBtnPressed]}
                >
                  <Text style={styles.pickerDoneText}>Done</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Pressable
            style={[styles.confirmBtn, (!canConfirm || submitting) && styles.confirmDisabled]}
            onPress={() => onConfirm(dueDate.trim())}
            disabled={!canConfirm || submitting}
          >
            {submitting ? (
              <Spinner size={22} color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmText}>
                Assign {cart.length} task{cart.length === 1 ? "" : "s"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
  body: {
    flexDirection: "column",
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: teacherColors.accentLight,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: teacherColors.accentMuted,
  },
  groupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  groupText: { flex: 1, minWidth: 0 },
  groupName: { ...typography.label, color: colors.text, fontSize: 15 },
  summary: { ...typography.caption, color: teacherColors.accentDark, marginTop: 2 },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  taskScroll: {
    flex: 1,
    marginBottom: spacing.md,
  },
  taskScrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  taskBody: { flex: 1, minWidth: 0 },
  taskTitle: { ...typography.label, color: colors.text, fontSize: 13 },
  taskMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: teacherColors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: teacherColors.accentMuted,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionBtnPressed: { opacity: 0.7 },
  footerBlock: {
    flexShrink: 0,
    gap: spacing.sm,
  },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dueRowPressed: { opacity: 0.85 },
  dueLabel: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 13,
    width: 72,
  },
  dueValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
  },
  dueValue: {
    flex: 1,
    ...typography.bodySm,
    color: colors.text,
    paddingVertical: 8,
  },
  pickerWrap: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
  },
  pickerDoneBtn: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  pickerDoneText: {
    ...typography.label,
    color: teacherColors.accent,
    fontWeight: "700",
  },
  confirmBtn: {
    backgroundColor: teacherColors.accent,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
})
