import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useStaffMode } from "../../context/StaffModeContext"
import type { StaffMode } from "../../lib/staff-mode"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"
import { teacherColors } from "../../theme/teacher-tokens"

export const STAFF_MODE_OPTIONS: Array<{
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

type StaffModeSwitcherOptionsProps = {
  onSelected?: () => void
  variant?: "menu" | "profile"
}

export function StaffModeSwitcherOptions({
  onSelected,
  variant = "menu",
}: StaffModeSwitcherOptionsProps) {
  const { mode, setMode } = useStaffMode()

  const select = async (next: StaffMode) => {
    onSelected?.()
    if (next === mode) return
    await setMode(next)
  }

  return (
    <View style={variant === "profile" ? styles.profileList : styles.menuList}>
      {STAFF_MODE_OPTIONS.map((option, index) => {
        const active = option.mode === mode
        const last = index === STAFF_MODE_OPTIONS.length - 1
        return (
          <Pressable
            key={option.mode}
            onPress={() => void select(option.mode)}
            style={({ pressed }) => [
              variant === "profile" ? styles.profileOption : styles.menuOption,
              active && styles.optionActive,
              pressed && styles.pressed,
              variant === "profile" && !last && styles.profileOptionBorder,
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
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  menuList: { gap: spacing.xs },
  profileList: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadow.card,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  profileOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  profileOptionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
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
