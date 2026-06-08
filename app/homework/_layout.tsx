import { Stack } from "expo-router"

export default function HomeworkLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card",
        gestureEnabled: false,
        animation: "slide_from_right",
      }}
    />
  )
}
