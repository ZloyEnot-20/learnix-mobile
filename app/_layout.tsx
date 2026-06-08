import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider } from "../src/context/AuthContext"

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise/[topic]/[slug]" options={{ presentation: "modal" }} />
        <Stack.Screen name="vocabulary/[deck]" options={{ presentation: "modal" }} />
        <Stack.Screen name="games/[level]" />
        <Stack.Screen name="exercises/[topic]" />
      </Stack>
    </AuthProvider>
  )
}
