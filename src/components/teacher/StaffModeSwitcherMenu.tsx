import React from "react"
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useStaffMode } from "../../context/StaffModeContext"
import type { StaffMode } from "../../lib/staff-mode"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"
import { teacherColors } from "../../theme/teacher-tokens"

export type StaffModeMenuAnchor = {
  x: number
  y: number
  width: number
  height: number
}

type StaffModeSwitcherMenuProps = {
  visible: boolean
  anchor: StaffModeMenuAnchor | null
  onClose: () => void
}

const OPTIONS: Array<{
  mode: StaffMode
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  accent: string
  bg: string
}> = [
  {
    mode: "teacher",
    title: "Teacher",
    subtitle: "Groups and homework",
    icon: "school-outline",
    accent: teacherColors.accentDark,
    bg: teacherColors.accentLight,
  },
  {
    mode: "admin",
    title: "Admin",
    subtitle: "Organization dashboard",
    icon: "shield-checkmark-outline",
    accent: colors.primary,
    bg: colors.primaryLight,
  },
]

export function StaffModeSwitcherMenu({ visible, anchor, onClose }: StaffModeSwitcherMenuProps) {
  const { width: screenWidth } = useWindowDimensions()
  const { mode, setMode } = useStaffMode()

  if (!anchor) return null

  const menuWidth = Math.min(288, screenWidth - spacing.screen * 2)
  const top = anchor.y + anchor.height + 8
  const left = Math.max(spacing.screen, Math.min(anchor.x, screenWidth - menuWidth - spacing.screen))

  const select = async (next: StaffMode) => {
    onClose()
    if (next === mode) return
    await setMode(next)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={[styles.menu, shadow.card, { top, left, width: menuWidth }]}>
        <Text style={styles.menuTitle}>Switch workspace</Text>
        {OPTIONS.map((option) => {
          const active = option.mode === mode
          return (
            <Pressable
              key={option.mode}
              onPress={() => void select(option.mode)}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: option.bg }]}>
                <Ionicons name={option.icon} size={20} color={option.accent} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={20} color={option.accent} />
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  menu: {
    position: "absolute",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  menuTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  optionActive: {
    backgroundColor: colors.background,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1, minWidth: 0 },
  optionTitle: { ...typography.label, color: colors.text, fontSize: 15 },
  optionSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  pressed: { opacity: 0.88 },
})
