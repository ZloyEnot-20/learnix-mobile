import React, { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Redirect, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "../src/context/AuthContext"
import { FadeInDown } from "../src/components/ui/FadeInDown"
import { Spinner } from "../src/components/ui/Spinner"
import { colors, radius, shadow, spacing, typography } from "../src/theme/tokens"

export default function LoginScreen() {
  const { user, isLoading, login } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [loginStr, setLoginStr] = useState("")
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

  if (user?.role === "student") {
    return <Redirect href="/(tabs)" />
  }

  const handleLogin = async () => {
    setError("")
    setSubmitting(true)
    try {
      await login(loginStr.trim(), password)
      router.replace("/(tabs)")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
          <Text style={styles.label}>Login or email</Text>
          <TextInput
            style={styles.input}
            value={loginStr}
            onChangeText={setLoginStr}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, submitting && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={submitting || !loginStr || !password}
          >
            {submitting ? (
              <Spinner size={22} />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </Pressable>
        </View>
      </FadeInDown>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  formWrap: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
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
    marginTop: spacing.md,
    minHeight: 52,
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
})
