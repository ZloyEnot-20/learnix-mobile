import React from "react"
import { Alert, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useHomeworkIntegrity } from "../../hooks/useHomeworkIntegrity"
import { HomeworkCheatingFailed } from "./HomeworkCheatingFailed"
import { HomeworkSuspiciousActivity } from "./HomeworkSuspiciousActivity"
import { colors, radius, spacing, typography } from "../../theme/tokens"

interface HomeworkSessionShellProps {
  homeworkId: string
  active: boolean
  pauseUsed: boolean
  title?: string
  children: React.ReactNode
}

export function HomeworkSessionShell({
  homeworkId,
  active,
  pauseUsed,
  title,
  children,
}: HomeworkSessionShellProps) {
  const router = useRouter()

  const handlePaused = React.useCallback(() => {
    router.back()
  }, [router])

  const integrity = useHomeworkIntegrity(homeworkId, active, pauseUsed, handlePaused)

  const confirmPause = React.useCallback(() => {
    Alert.alert(
      "Pause homework?",
      "You can pause only once. The timer will stop and you can continue later from the homework list.\n\nAfter you resume, leaving the app will fail this homework.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pause", onPress: () => void integrity.pauseSession() },
      ],
    )
  }, [integrity.pauseSession])

  if (integrity.failed) {
    return <HomeworkCheatingFailed />
  }

  if (integrity.suspicious) {
    return <HomeworkSuspiciousActivity onDismiss={integrity.dismissSuspicious} />
  }

  return (
    <View style={styles.shell}>
      {active ? (
        <View style={styles.topBar}>
          <View style={styles.topMain}>
            {title ? (
              <Text style={styles.topTitle} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            <Text style={styles.topHint}>Protected mode</Text>
          </View>
          {!integrity.pauseUsed ? (
            <Pressable
              style={({ pressed }) => [styles.pauseBtn, pressed && styles.pauseBtnPressed]}
              onPress={confirmPause}
            >
              <Ionicons name="pause" size={14} color={colors.text} />
              <Text style={styles.pauseBtnText}>Pause</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  topMain: { flex: 1, minWidth: 0 },
  topTitle: { ...typography.label, fontSize: 16, color: colors.text },
  topHint: { ...typography.caption, color: colors.primary, marginTop: 2, fontWeight: "600" },
  pauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    backgroundColor: colors.borderLight,
  },
  pauseBtnPressed: { opacity: 0.85 },
  pauseBtnText: { fontSize: 13, fontWeight: "600", color: colors.text },
})
