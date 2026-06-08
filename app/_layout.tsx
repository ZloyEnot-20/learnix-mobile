import "react-native-gesture-handler"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider } from "../src/context/AuthContext"

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: "card",
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="homework" options={{ gestureEnabled: false }} />
        <Stack.Screen name="exercise/[topic]/[slug]" />
        <Stack.Screen name="vocabulary/[deck]" />
        <Stack.Screen name="vocabulary/review" />
        <Stack.Screen name="games/[level]" />
        <Stack.Screen name="exercises/[topic]" />
      </Stack>
    </AuthProvider>
  )
}
