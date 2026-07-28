import "react-native-gesture-handler"
import React from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider, useAuth } from "../src/context/AuthContext"
import { StaffModeProvider } from "../src/context/StaffModeContext"
import { LocaleProvider } from "../src/context/LocaleContext"
import { AppErrorBoundary } from "../src/components/ui/AppErrorBoundary"
import { AppSplashScreen } from "../src/components/AppSplashScreen"
import { OnboardingGate } from "../src/components/OnboardingGate"
import { usePushNotifications } from "../src/hooks/usePushNotifications"

function PushNotificationsBootstrap() {
  usePushNotifications()
  return null
}

function AppShell() {
  const { isLoading, user } = useAuth()

  return (
    <>
      <StatusBar style="dark" />
      {isLoading ? (
        <AppSplashScreen />
      ) : (
        <StaffModeProvider user={user}>
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
          <Stack.Screen name="(teacher)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="teacher" />
          <Stack.Screen name="homework" options={{ gestureEnabled: false }} />
          <Stack.Screen name="exercise/[topic]/[slug]" />
          <Stack.Screen name="vocabulary/[deck]" />
          <Stack.Screen name="vocabulary/review" />
          <Stack.Screen name="exercises/[topic]" />
          <Stack.Screen name="ielts/index" />
          <Stack.Screen name="ielts/reading/index" />
          <Stack.Screen name="ielts/reading/[id]" />
          <Stack.Screen name="ielts/listening/index" />
          <Stack.Screen name="ielts/listening/[id]" />
          <Stack.Screen name="podcast/[slug]" />
          <Stack.Screen name="live-lesson/index" />
          <Stack.Screen name="demo/index" />
          <Stack.Screen name="demo/unit/[unit]" />
          <Stack.Screen name="demo/[slug]" />
          <Stack.Screen name="demo/individuality" />
          <Stack.Screen name="privacy-policy" />
        </Stack>
        </StaffModeProvider>
      )}
    </>
  )
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <LocaleProvider>
        <AuthProvider>
          <PushNotificationsBootstrap />
          <OnboardingGate>
            <AppShell />
          </OnboardingGate>
        </AuthProvider>
      </LocaleProvider>
    </AppErrorBoundary>
  )
}
