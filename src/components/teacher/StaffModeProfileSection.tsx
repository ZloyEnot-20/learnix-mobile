import React, { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheet } from "../ui/BottomSheet"
import { StaffModeSwitcherOptions } from "./StaffModeSwitcherOptions"
import { useStaffMode } from "../../context/StaffModeContext"
import { colors, radius, spacing, typography } from "../../theme/tokens"
import { teacherColors } from "../../theme/teacher-tokens"

export function StaffModeProfileSection() {
  const { canSwitch } = useStaffMode()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (!canSwitch) return null

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accounts</Text>
        <StaffModeSwitcherOptions variant="profile" />
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        >
          <Ionicons name="add-circle-outline" size={22} color={teacherColors.accentDark} />
          <Text style={styles.addBtnText}>Add account</Text>
        </Pressable>
      </View>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Switch workspace"
      >
        <View style={styles.sheetBody}>
          <StaffModeSwitcherOptions
            variant="menu"
            onSelected={() => setSheetOpen(false)}
          />
        </View>
      </BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: "dashed",
  },
  addBtnText: { ...typography.label, color: teacherColors.accentDark },
  pressed: { opacity: 0.88 },
  sheetBody: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
})
