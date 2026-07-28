import React, { useRef, useState } from "react"
import { Pressable, StyleSheet, Text, View, type View as ViewType } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { ProfileAvatar } from "../ProfileAvatar"
import { useAuth } from "../../context/AuthContext"
import { useStaffMode } from "../../context/StaffModeContext"
import { staffModeLabel } from "../../lib/staff-mode"
import {
  StaffModeSwitcherMenu,
  type StaffModeMenuAnchor,
} from "./StaffModeSwitcherMenu"
import { colors, spacing, typography } from "../../theme/tokens"

type StaffModeHeaderControlProps = {
  showName?: boolean
  /** When false, parent supplies horizontal inset (e.g. combined tab header). */
  inset?: boolean
}

export function StaffModeHeaderControl({ showName = false, inset = true }: StaffModeHeaderControlProps) {
  const { user } = useAuth()
  const { mode, canSwitch } = useStaffMode()
  const router = useRouter()
  const anchorRef = useRef<ViewType>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [anchor, setAnchor] = useState<StaffModeMenuAnchor | null>(null)

  if (!user) return null

  const openMenu = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height })
      setMenuOpen(true)
    })
  }

  const onPress = () => {
    if (canSwitch) {
      openMenu()
      return
    }
    router.push("/(teacher)/profile" as never)
  }

  return (
    <>
      <View
        ref={anchorRef}
        collapsable={false}
        style={[inset && styles.left, showName && styles.leftWithName]}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
          hitSlop={4}
        >
          <ProfileAvatar name={user.name} avatarUrl={user.avatarUrl} size={32} />
          {showName ? (
            <View style={styles.nameBlock}>
              <Text style={styles.name} numberOfLines={1}>
                {user.name}
              </Text>
              <View style={styles.roleRow}>
                <Text style={styles.role}>{staffModeLabel(mode)}</Text>
                {canSwitch ? (
                  <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                ) : null}
              </View>
            </View>
          ) : null}
        </Pressable>
      </View>
      {canSwitch ? (
        <StaffModeSwitcherMenu
          visible={menuOpen}
          anchor={anchor}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  left: { marginLeft: spacing.screen },
  leftWithName: { maxWidth: 240 },
  pressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  nameBlock: { flexShrink: 1, minWidth: 0 },
  name: { ...typography.label, color: colors.text, fontSize: 15 },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 1 },
  role: { ...typography.caption, color: colors.textMuted },
  pressed: { opacity: 0.85 },
})
