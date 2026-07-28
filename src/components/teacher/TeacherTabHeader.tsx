import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { ProfileAvatar } from "../ProfileAvatar"
import { NotificationsBell } from "../NotificationsBell"
import { useAuth } from "../../context/AuthContext"
import { colors, spacing, typography } from "../../theme/tokens"

type TeacherTabHeaderLeftProps = {
  showName?: boolean
}

export function TeacherTabHeaderLeft({ showName = false }: TeacherTabHeaderLeftProps) {
  const { user } = useAuth()
  const router = useRouter()
  if (!user) return null

  return (
    <Pressable
      onPress={() => router.push("/(teacher)/profile" as never)}
      style={({ pressed }) => [styles.left, showName && styles.leftWithName, pressed && styles.pressed]}
      hitSlop={4}
    >
      <ProfileAvatar name={user.name} avatarUrl={user.avatarUrl} size={32} />
      {showName ? (
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.role}>Teacher</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

export function TeacherTabHeaderRight() {
  return (
    <View style={styles.right}>
      <NotificationsBell />
    </View>
  )
}

const styles = StyleSheet.create({
  left: { marginLeft: spacing.screen },
  leftWithName: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: 220,
  },
  nameBlock: { flexShrink: 1, minWidth: 0 },
  name: { ...typography.label, color: colors.text, fontSize: 15 },
  role: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  right: { marginRight: spacing.screen },
  pressed: { opacity: 0.85 },
})
