import React, { useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Redirect, useRouter } from "expo-router"
import { useAuth } from "../src/context/AuthContext"
import { colors } from "../src/theme/colors"

export default function LoginScreen() {
  const { user, isLoading, login } = useAuth()
  const router = useRouter()
  const [loginStr, setLoginStr] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
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
      <View style={styles.hero}>
        <Text style={styles.logo}>IELTS</Text>
        <Text style={styles.subtitle}>Student App</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Login or email</Text>
        <TextInput
          style={styles.input}
          value={loginStr}
          onChangeText={setLoginStr}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="your@email.com"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, submitting && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={submitting || !loginStr || !password}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign in</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { alignItems: "center", marginBottom: 40 },
  logo: { fontSize: 36, fontWeight: "800", color: colors.primary },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 4 },
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: colors.card,
  },
  error: { color: colors.error, fontSize: 14, marginTop: 8 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
})
