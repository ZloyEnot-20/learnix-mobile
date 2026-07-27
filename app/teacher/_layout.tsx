import { Stack } from "expo-router"
import { colors } from "../../src/theme/tokens"

export default function TeacherStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="courses/[id]/index" />
      <Stack.Screen name="courses/[id]/attendance" />
      <Stack.Screen name="homework/[id]" />
      <Stack.Screen name="homework/assign" />
    </Stack>
  )
}
