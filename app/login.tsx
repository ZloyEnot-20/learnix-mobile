import React, { useState } from "react"
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Redirect, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "../src/context/AuthContext"
import { isAppUser, isStudentUser } from "../src/lib/guest"
import { ApiError, getUserFacingErrorMessage } from "../src/lib/api-client"
import { FadeInDown } from "../src/components/ui/FadeInDown"
import { Spinner } from "../src/components/ui/Spinner"
import { useKeyboardHeight } from "../src/hooks/useKeyboardHeight"
import { colors, radius, shadow, spacing, typography } from "../src/theme/tokens"

export default function LoginScreen() {
  const { user, isLoading, login, loginAsGuest } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()
  const [loginStr, setLoginStr] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [guestSubmitting, setGuestSubmitting] = useState(false)

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Spinner size={40} />
      </View>
    )
  }

  if (isStudentUser(user)) {
    return <Redirect href="/(tabs)" />
  }

  const handleLogin = async () => {
    setError("")
    setSubmitting(true)
    try {
      await login(loginStr.trim(), password)
      router.replace("/(tabs)")
    } catch (e) {
      const message =
        e instanceof ApiError && e.status === 401
          ? "Sign in failed. Please check your email and password."
          : getUserFacingErrorMessage(e, "Sign in failed. Please try again.")
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGuest = async () => {
    setError("")
    setGuestSubmitting(true)
    try {
      await loginAsGuest()
      router.replace("/(tabs)")
    } catch (e) {
      setError(getUserFacingErrorMessage(e, "Could not start guest session. Please try again."))
    } finally {
      setGuestSubmitting(false)
    }
  }

  const footerPaddingBottom =
    keyboardHeight > 0 ? keyboardHeight + spacing.sm : Math.max(insets.bottom, spacing.md)

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={Keyboard.dismiss} style={styles.dismissArea}>
          <FadeInDown index={0}>
            <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
              <View style={styles.heroGradient} />
              <View style={styles.heroBlobPrimary} />
              <View style={styles.heroBlobBrand} />
              <Text style={styles.logo}>Learnix</Text>
              <Text style={styles.subtitle}>Student App</Text>
            </View>
          </FadeInDown>

          <FadeInDown index={1} style={styles.formWrap}>
            <View style={[styles.form, shadow.card]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={loginStr}
                onChangeText={setLoginStr}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </FadeInDown>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <Pressable
          style={[styles.btn, submitting && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={submitting || guestSubmitting || !loginStr || !password}
        >
          {submitting ? (
            <Spinner size={22} />
          ) : (
            <Text style={styles.btnText}>Sign in</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.guestBtn, (submitting || guestSubmitting) && styles.btnDisabled]}
          onPress={handleGuest}
          disabled={submitting || guestSubmitting}
        >
          {guestSubmitting ? (
            <Spinner size={22} color={colors.primary} />
          ) : (
            <Text style={styles.guestBtnText}>Continue as guest</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.privacyLink}
          onPress={() => router.push("/privacy-policy")}
          disabled={submitting || guestSubmitting}
        >
          <Text style={styles.privacyLinkText}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.md,
  },
  dismissArea: { flexGrow: 1 },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  hero: {
    alignItems: "center",
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
    overflow: "hidden",
    minHeight: 200,
    justifyContent: "center",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryLight,
    opacity: 0.55,
  },
  heroBlobPrimary: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  heroBlobBrand: {
    position: "absolute",
    bottom: 10,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.brand,
    opacity: 0.15,
  },
  logo: { ...typography.h1, color: colors.primary, zIndex: 1 },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, zIndex: 1 },
  formWrap: { paddingHorizontal: spacing.screen },
  form: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.screen,
    gap: spacing.sm,
  },
  label: { ...typography.label, color: colors.text, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  error: { color: colors.error, ...typography.bodySm, marginTop: spacing.sm },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  guestBtn: {
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  guestBtnText: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  privacyLink: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  privacyLinkText: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
})
