import React, { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useFonts } from "expo-font"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "../context/AuthContext"
import { useLocale } from "../context/LocaleContext"
import { markOnboardingDone } from "../lib/onboarding"
import { AppSplashScreen } from "./AppSplashScreen"
import { FadeInDown } from "./ui/FadeInDown"
import { Spinner } from "./ui/Spinner"
import { introFontAssets, introFonts } from "../theme/intro-fonts"
import { colors } from "../theme/tokens"

const LOGO = require("../../assets/icon.png")
const LOGO_SIZE = 340
const LOGO_RADIUS = 12
const LOGO_SECTION_BG = "#0dc8f3"

type IntroScreenProps = {
  onDone: () => void
}

export function IntroScreen({ onDone }: IntroScreenProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t } = useLocale()
  const { loginAsGuest } = useAuth()
  const [busy, setBusy] = useState<"login" | "guest" | null>(null)
  const [fontsLoaded] = useFonts(introFontAssets)

  const finishOnboarding = async () => {
    await markOnboardingDone()
    onDone()
  }

  const handleLogin = async () => {
    if (busy) return
    setBusy("login")
    try {
      await finishOnboarding()
      router.replace("/login")
    } finally {
      setBusy(null)
    }
  }

  const handleGuest = async () => {
    if (busy) return
    setBusy("guest")
    try {
      await loginAsGuest()
      await finishOnboarding()
      router.replace("/(tabs)")
    } finally {
      setBusy(null)
    }
  }

  if (!fontsLoaded) {
    return <AppSplashScreen />
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <View style={[styles.top, { paddingTop: insets.top }]}>
          <FadeInDown index={0}>
            <View style={styles.logoWrap}>
              <Image source={LOGO} style={styles.logo} contentFit="cover" />
            </View>
          </FadeInDown>
        </View>

        <View style={styles.bottom}>
          <FadeInDown index={1}>
            <Text style={styles.title}>{t("title")}</Text>
          </FadeInDown>
          <FadeInDown index={2}>
            <Text style={styles.desc}>{t("desc")}</Text>
          </FadeInDown>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <FadeInDown index={3}>
          <Pressable
            style={[styles.primaryBtn, busy != null && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={busy != null}
          >
            {busy === "login" ? (
              <Spinner size={22} />
            ) : (
              <Text style={styles.primaryBtnText}>{t("login")}</Text>
            )}
          </Pressable>
        </FadeInDown>
        <FadeInDown index={4}>
          <Pressable
            style={[styles.secondaryBtn, busy != null && styles.btnDisabled]}
            onPress={handleGuest}
            disabled={busy != null}
          >
            {busy === "guest" ? (
              <Spinner size={22} color={colors.primary} />
            ) : (
              <Text style={styles.secondaryBtnText}>{t("guest")}</Text>
            )}
          </Pressable>
        </FadeInDown>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
  },
  top: {
    flex: 1,
    backgroundColor: LOGO_SECTION_BG,
    justifyContent: "flex-start",
  },
  logoWrap: {
    alignItems: "center",
  },
  bottom: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
  },
  title: {
    color: "#0f172a",
    fontSize: 32,
    lineHeight: 40,
    fontFamily: introFonts.extraBold,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  desc: {
    color: "#64748b",
    fontSize: 17,
    lineHeight: 26,
    fontFamily: introFonts.medium,
    letterSpacing: -0.15,
    textAlign: "center",
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 10,
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 17,
    fontFamily: introFonts.bold,
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  secondaryBtnText: {
    color: "#0f172a",
    fontSize: 16,
    fontFamily: introFonts.semiBold,
    letterSpacing: -0.15,
  },
  btnDisabled: {
    opacity: 0.65,
  },
})
