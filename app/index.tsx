import { Redirect } from "expo-router"
import { useAuth } from "../src/context/AuthContext"
import { ActivityIndicator, View } from "react-native"

export default function Index() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#C8102E" />
      </View>
    )
  }

  if (!user) return <Redirect href="/login" />
  if (user.role !== "student") return <Redirect href="/login" />
  return <Redirect href="/(tabs)" />
}
