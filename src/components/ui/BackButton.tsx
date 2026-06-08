import React from "react"
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { colors, radius } from "../../theme/tokens"

const SIZE = 44

interface BackButtonProps {
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function BackButton({ onPress, style }: BackButtonProps) {
  const router = useRouter()
  const handlePress = onPress ?? (() => router.back())

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.12)",
  },
  pressed: { opacity: 0.85 },
})
