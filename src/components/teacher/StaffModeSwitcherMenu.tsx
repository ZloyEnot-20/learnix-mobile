import React from "react"
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import { colors, radius, shadow, spacing, typography } from "../../theme/tokens"
import { StaffModeSwitcherOptions } from "./StaffModeSwitcherOptions"

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

export function StaffModeSwitcherMenu({ visible, anchor, onClose }: StaffModeSwitcherMenuProps) {
  const { width: screenWidth } = useWindowDimensions()

  if (!anchor) return null

  const menuWidth = Math.min(288, screenWidth - spacing.screen * 2)
  const top = anchor.y + anchor.height + 8
  const left = Math.max(spacing.screen, Math.min(anchor.x, screenWidth - menuWidth - spacing.screen))

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={[styles.menu, shadow.card, { top, left, width: menuWidth }]}>
        <Text style={styles.menuTitle}>Switch workspace</Text>
        <StaffModeSwitcherOptions variant="menu" onSelected={onClose} />
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
})
