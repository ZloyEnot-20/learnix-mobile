import "react-native-gesture-handler"
import React from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider, useAuth } from "../src/context/AuthContext"
import { LocaleProvider } from "../src/context/LocaleContext"
import { AppErrorBoundary } from "../src/components/ui/AppErrorBoundary"
import { AppSplashScreen } from "../src/components/AppSplashScreen"
import { OnboardingGate } from "../src/components/OnboardingGate"

function AppShell() {
  const { isLoading } = useAuth()

  return (
    <>
      <StatusBar style="dark" />
      {isLoading ? (
        <AppSplashScreen />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            presentation: "card",
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="homework" options={{ gestureEnabled: false }} />
          <Stack.Screen name="exercise/[topic]/[slug]" />
          <Stack.Screen name="vocabulary/[deck]" />
          <Stack.Screen name="vocabulary/review" />
          <Stack.Screen name="exercises/[topic]" />
          <Stack.Screen name="podcast/[slug]" />
          <Stack.Screen name="privacy-policy" />
        </Stack>
      )}
    </>
  )
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <LocaleProvider>
        <AuthProvider>
          <OnboardingGate>
            <AppShell />
          </OnboardingGate>
        </AuthProvider>
      </LocaleProvider>
    </AppErrorBoundary>
  )
}
