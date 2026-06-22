import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { colors, radius, shadow, spacing, typography } from "../theme/tokens"

type GuestAuthBannerProps = {
  variant?: "card" | "screen"
  title?: string
  message?: string
}

const DEFAULT_TITLE = "Join your learning center"
const DEFAULT_MESSAGE =
  "Sign in to access homework, track your progress, compete on the leaderboard, and unlock all learning materials."

export function GuestAuthBanner({
  variant = "card",
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
}: GuestAuthBannerProps) {
  const router = useRouter()

  if (variant === "screen") {
    return (
      <View style={styles.screenWrap}>
        <View style={styles.screenIconWrap}>
          <Ionicons name="school-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.screenMessage}>{message}</Text>
        <Pressable
          style={({ pressed }) => [styles.screenBtn, pressed && styles.btnPressed]}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.screenBtnText}>Sign in</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardIconWrap}>
        <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMessage}>{message}</Text>
        <Pressable
          style={({ pressed }) => [styles.cardBtn, pressed && styles.btnPressed]}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.cardBtnText}>Sign in</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + "33",
    ...shadow.card,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0, gap: spacing.sm },
  cardTitle: { ...typography.label, fontSize: 15, color: colors.text },
  cardMessage: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 19 },
  cardBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: 2,
  },
  cardBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  screenWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  screenIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  screenTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  screenMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  screenBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    marginTop: spacing.sm,
    minWidth: 180,
    alignItems: "center",
  },
  screenBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnPressed: { opacity: 0.92 },
})
