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
import { isStudentUser } from "../src/lib/guest"
import { ApiError, getUserFacingErrorMessage } from "../src/lib/api-client"
import { authApi } from "../src/lib/api"
import { setGuestMode, setTokens } from "../src/lib/api-client"
import { FadeInDown } from "../src/components/ui/FadeInDown"
import { Spinner } from "../src/components/ui/Spinner"
import { useKeyboardHeight } from "../src/hooks/useKeyboardHeight"
import { colors, radius, shadow, spacing, typography } from "../src/theme/tokens"

export default function SignupScreen() {
  const { user, isLoading, setUser } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

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

  const handleSignup = async () => {
    setError("")
    setSubmitting(true)
    try {
      await setGuestMode(false)
      const res = await authApi.register(email.trim(), password, name.trim())
      await setTokens(res.accessToken, res.refreshToken)
      setUser(res.user)
      router.replace("/(tabs)")
    } catch (e) {
      const message =
        e instanceof ApiError && e.status === 409
          ? "An account with this email already exists."
          : getUserFacingErrorMessage(e, "Registration failed. Please try again.")
      setError(message)
    } finally {
      setSubmitting(false)
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
              <Text style={styles.subtitle}>Create your account</Text>
            </View>
          </FadeInDown>

          <FadeInDown index={1} style={styles.formWrap}>
            <View style={[styles.form, shadow.card]}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                textContentType="name"
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
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
                textContentType="newPassword"
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
          style={[styles.btn, (submitting || !name || !email || !password) && styles.btnDisabled]}
          onPress={handleSignup}
          disabled={submitting || !name || !email || !password}
        >
          {submitting ? <Spinner size={22} /> : <Text style={styles.btnText}>Sign up</Text>}
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.replace("/login")} disabled={submitting}>
          <Text style={styles.linkBtnText}>Already have an account? Sign in</Text>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
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
  linkBtn: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  linkBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
})
