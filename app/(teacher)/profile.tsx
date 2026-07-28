import React, { useCallback, useMemo, useState } from "react"
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../../src/context/AuthContext"
import { useStaffMode } from "../../src/context/StaffModeContext"
import { staffModeLabel } from "../../src/lib/staff-mode"
import { FadeInDown } from "../../src/components/ui/FadeInDown"
import { ProfileAvatar } from "../../src/components/ProfileAvatar"
import { StaffModeProfileSection } from "../../src/components/teacher/StaffModeProfileSection"
import { TeacherListSkeleton } from "../../src/components/teacher/TeacherSkeletons"
import { colors, radius, shadow, spacing, typography } from "../../src/theme/tokens"

function roleLabel(type: string | undefined): string {
  if (type === "super_admin") return "Super admin"
  if (type === "admin") return "Admin"
  return "Teacher"
}

export default function TeacherProfileScreen() {
  const { user, logout } = useAuth()
  const { mode, canSwitch } = useStaffMode()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      setLoading(false)
      setRefreshing(false)
    }, []),
  )

  const initials = useMemo(() => {
    const parts = (user?.name || "T").trim().split(/\s+/)
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("")
  }, [user?.name])

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout()
          router.replace("/login")
        },
      },
    ])
  }

  if (loading) {
    return <TeacherListSkeleton count={2} />
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />
        }
        showsVerticalScrollIndicator={false}
      >
        <FadeInDown index={0}>
          <Text style={styles.title}>Profile</Text>
        </FadeInDown>

        <FadeInDown index={1}>
          <View style={[styles.card, shadow.card]}>
            <View style={styles.hero}>
              <ProfileAvatar
                name={user?.name || "Teacher"}
                avatarUrl={user?.avatarUrl}
                size={72}
              />
              <View style={styles.heroText}>
                <Text style={styles.name}>{user?.name || "Teacher"}</Text>
                <Text style={styles.role}>
                  {canSwitch ? staffModeLabel(mode) : roleLabel(user?.type)}
                </Text>
                {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
              </View>
            </View>
          </View>
        </FadeInDown>

        {canSwitch ? (
          <FadeInDown index={2}>
            <StaffModeProfileSection />
          </FadeInDown>
        ) : null}

        <FadeInDown index={canSwitch ? 3 : 2}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </FadeInDown>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroText: { flex: 1, minWidth: 0 },
  name: { ...typography.h3, color: colors.text },
  role: { ...typography.label, color: colors.primary, marginTop: 4 },
  email: { ...typography.bodySm, color: colors.textSecondary, marginTop: 4 },
  logoutBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.errorBg,
  },
  logoutText: { ...typography.label, color: colors.error },
  pressed: { opacity: 0.85 },
})
