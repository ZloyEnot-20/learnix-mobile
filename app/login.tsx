import React, { useState } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Redirect, useRouter } from "expo-router"
import { useFonts } from "expo-font"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "../src/context/AuthContext"
import { useStaffMode } from "../src/context/StaffModeContext"
import { isStudentUser, isTeacherUser } from "../src/lib/guest"
import { ApiError, getUserFacingErrorMessage } from "../src/lib/api-client"
import { FadeInDown } from "../src/components/ui/FadeInDown"
import { Spinner } from "../src/components/ui/Spinner"
import { useKeyboardHeight } from "../src/hooks/useKeyboardHeight"
import { introFontAssets, introFonts } from "../src/theme/intro-fonts"
import { colors, radius, shadow, spacing } from "../src/theme/tokens"

const BUTTON_GRADIENT = ["#6ECFF6", "#A8E8B4", "#D8F5A2"] as const

export default function LoginScreen() {
  const { user, isLoading, login } = useAuth()
  const { isReady, mode } = useStaffMode()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()
  const [loginStr, setLoginStr] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [fontsLoaded] = useFonts(introFontAssets)

  if (!fontsLoaded || isLoading || (isTeacherUser(user) && !isReady)) {
    return (
      <View style={styles.center}>
        <Spinner size={40} />
      </View>
    )
  }

  if (isTeacherUser(user)) {
    if (mode === "admin") return <Redirect href={"/(admin)" as never} />
    return <Redirect href={"/(teacher)" as never} />
  }

  if (isStudentUser(user)) {
    return <Redirect href="/(tabs)" />
  }

  const handleLogin = async () => {
    setError("")
    setSubmitting(true)
    try {
      const loggedInUser = await login(loginStr.trim(), password)
      if (isTeacherUser(loggedInUser)) {
        const target =
          loggedInUser.type === "admin" || loggedInUser.type === "super_admin"
            ? mode === "admin"
              ? "/(admin)"
              : "/(teacher)"
            : "/(teacher)"
        router.replace(target as never)
      } else {
        router.replace("/(tabs)")
      }
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

  const scrollPaddingBottom =
    keyboardHeight > 0
      ? keyboardHeight + spacing.md
      : Math.max(insets.bottom, spacing.lg) + spacing.xl

  const isDisabled = submitting || !loginStr || !password

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + spacing.xxl,
              paddingBottom: scrollPaddingBottom,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={Keyboard.dismiss} style={styles.content}>
            <FadeInDown index={0}>
              <View style={styles.hero}>
                <Text style={styles.title}>Learnix</Text>
                <Text style={styles.subtitle}>Hi! Welcome back, you&apos;ve been missed</Text>
              </View>
            </FadeInDown>

            <FadeInDown index={1} style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Login</Text>
                <TextInput
                  style={styles.input}
                  value={loginStr}
                  onChangeText={setLoginStr}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  placeholder="Enter login"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    placeholder="Password"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <Pressable
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                onPress={handleLogin}
                disabled={isDisabled}
                style={[styles.btnWrap, isDisabled && styles.btnDisabled]}
              >
                <LinearGradient
                  colors={[...BUTTON_GRADIENT]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.btn}
                >
                  {submitting ? (
                    <Spinner size={22} color={colors.text} />
                  ) : (
                    <Text style={styles.btnText}>Login</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </FadeInDown>

          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen + 4,
  },
  content: {
    flexGrow: 1,
    width: "100%",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: introFonts.extraBold,
    letterSpacing: -0.8,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: introFonts.medium,
    letterSpacing: -0.2,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  form: {
    width: "100%",
    gap: spacing.lg,
  },
  field: {
    width: "100%",
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: introFonts.semiBold,
    letterSpacing: -0.1,
    color: colors.text,
  },
  input: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: introFonts.medium,
    letterSpacing: -0.1,
    color: colors.text,
    minHeight: 52,
    ...shadow.card,
  },
  passwordWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingRight: spacing.sm,
    minHeight: 52,
    ...shadow.card,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: introFonts.medium,
    letterSpacing: -0.1,
    color: colors.text,
    minHeight: 52,
  },
  eyeBtn: {
    padding: spacing.sm,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: introFonts.medium,
    marginTop: -spacing.sm,
  },
  btnWrap: {
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  btn: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: introFonts.bold,
    letterSpacing: -0.2,
  },
})
